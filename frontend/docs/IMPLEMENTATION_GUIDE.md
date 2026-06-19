# Frontend — Implementation Guide

## Per-Feature File Layout

```
features/<entity>/
├── api.ts            → HTTP functions
├── queries.ts        → React Query read hooks
├── mutations.ts      → React Query mutation hooks
├── types.ts          → Feature-specific types
├── components/       → Feature-specific UI
└── pages/            → Route-level screens
```

---

## How to Add a New Feature (e.g. `Products`)

### 1. Types (`features/products/types.ts`)

Frontend-specific types for the feature. API response types should come from a generated OpenAPI schema when available.

```ts
export type ProductFilters = {
  search?: string
  status?: 'active' | 'inactive'
}

export type ProductSortOption = 'name' | 'createdAt' | 'price'

export type ProductFormValues = {
  name: string
  price: number
}
```

### 2. API Functions (`features/products/api.ts`)

Raw HTTP calls using the shared `http` client. No React, no hooks, no UI.

```ts
import { http } from '../../lib/http'
import type { ProductFilters } from './types'

export type Product = {
  id: number
  name: string
  price: number
  created_at: string | null
  updated_at: string | null
}

export function getProducts(filters?: ProductFilters) {
  return http.get<Product[]>('/products', { params: { ...filters } })
}

export function getProductById(id: number) {
  return http.get<Product>(`/products/${id}`)
}

export function createProduct(data: { name: string; price: number }) {
  return http.post<Product>('/products', data)
}

export function updateProduct(id: number, data: Partial<{ name: string; price: number }>) {
  return http.put<Product>(`/products/${id}`, data)
}

export function deleteProduct(id: number) {
  return http.delete(`/products/${id}`)
}
```

### 3. Query Hooks (`features/products/queries.ts`)

React Query hooks for reading data. Co-located query keys for type safety and cache invalidation.

```ts
import { useQuery } from '@tanstack/react-query'
import { getProducts, getProductById } from './api'
import type { ProductFilters } from './types'

export const productQueryKeys = {
  all: ['products'] as const,
  list: (filters?: ProductFilters) => [...productQueryKeys.all, 'list', filters] as const,
  detail: (id: number) => [...productQueryKeys.all, 'detail', id] as const,
}

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: productQueryKeys.list(filters),
    queryFn: () => getProducts(filters),
  })
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: productQueryKeys.detail(id),
    queryFn: () => getProductById(id),
    enabled: id > 0,
  })
}
```

### 4. Mutation Hooks (`features/products/mutations.ts`)

React Query mutation hooks for writes. Invalidation logic is centralized here.

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createProduct, updateProduct, deleteProduct } from './api'
import { productQueryKeys } from './queries'

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ name: string; price: number }> }) =>
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
    },
  })
}
```

### 5. Feature Components (`features/products/components/`)

Feature-specific UI. Consumes hooks, never calls API functions or HTTP directly.

```tsx
// features/products/components/ProductTable.tsx
import { useProducts } from '../queries'
import { Table } from '../../../components/ui/Table'
import { ErrorMessage } from '../../../components/common/ErrorMessage'

export function ProductTable() {
  const { data, isLoading, error } = useProducts()

  if (isLoading) return <div>Loading...</div>
  if (error) return <ErrorMessage message={error.message} />

  return (
    <Table>
      {data?.map((product) => (
        <div key={product.id}>{product.name}</div>
      ))}
    </Table>
  )
}
```

### 6. Pages (`features/products/pages/`)

Route-level screens. Imported by the router in `app/router.tsx`.

```tsx
// features/products/pages/ProductsPage.tsx
import { ProductTable } from '../components/ProductTable'
import { ProductFilters } from '../components/ProductFilters'

export function ProductsPage() {
  return (
    <div>
      <h1>Products</h1>
      <ProductFilters />
      <ProductTable />
    </div>
  )
}
```

### 7. Wire in Router (`app/router.tsx`)

```tsx
import { ProductsPage } from '../features/products/pages/ProductsPage'
// ...
<Route path="products" element={<ProductsPage />} />
```

---

## File Layout Summary

After adding the `products` feature:

```
src/
├── app/
│   └── router.tsx          ← added /products route
├── features/
│   └── products/           ← new feature folder
│       ├── api.ts
│       ├── queries.ts
│       ├── mutations.ts
│       ├── types.ts
│       ├── components/
│       │   ├── ProductTable.tsx
│       │   ├── ProductFilters.tsx
│       │   └── ProductForm.tsx
│       └── pages/
│           ├── ProductsPage.tsx
│           └── ProductDetailsPage.tsx
```

---

## Testing Strategy

Each layer is tested in isolation by mocking the layer below it.

### API functions (`api.ts`)

Mock the `http` client. Verify correct method, path, and payload.

```ts
import { http } from '@/lib/http'
import { getProducts } from './api'

vi.mock('@/lib/http')

test('getProducts calls correct endpoint', async () => {
  vi.mocked(http.get).mockResolvedValue([])
  await getProducts()
  expect(http.get).toHaveBeenCalledWith('/products', expect.any(Object))
})
```

### Query hooks (`queries.ts`)

Wrap with `QueryClientProvider`. Mock the API function. Verify loading and success states.

```ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProducts } from './queries'

vi.mock('./api')

test('useProducts returns data', async () => {
  const queryClient = new QueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  vi.mocked(getProducts).mockResolvedValue([{ id: 1, name: 'Product 1' }])

  const { result } = renderHook(() => useProducts(), { wrapper })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toEqual([{ id: 1, name: 'Product 1' }])
})
```

### Components

Mock hook return values. Render with `render`. Verify UI output and user interactions.

```ts
vi.mock('../queries')

test('renders product list', () => {
  vi.mocked(useProducts).mockReturnValue({
    data: [{ id: 1, name: 'Product 1' }],
    isLoading: false,
    error: null,
  } as any)

  render(<ProductTable />)
  expect(screen.getByText('Product 1')).toBeInTheDocument()
})
```

### Pages

Render with router context. Test full page layout, including loading and error states.

```ts
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function renderWithProviders(element: React.ReactElement) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  )
}
```

---

## Common Patterns

### Zod form schemas

Define Zod schemas alongside feature types to validate form data. Inferred types keep `types.ts` in sync without duplication.

```ts
// features/products/types.ts
import { z } from 'zod'

export const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.number().positive('Price must be positive'),
})

export type ProductFormValues = z.infer<typeof productFormSchema>
```

Use with React Hook Form via `@hookform/resolvers`:

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productFormSchema, type ProductFormValues } from './types'

export function ProductForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
  })

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      <input type="number" {...register('price', { valueAsNumber: true })} />
      {errors.price && <span>{errors.price.message}</span>}
    </form>
  )
}
```

### Query key structure

```ts
export const productQueryKeys = {
  all: ['products'] as const,
  list: (filters?: ProductFilters) => [...productQueryKeys.all, 'list', filters] as const,
  detail: (id: number) => [...productQueryKeys.all, 'detail', id] as const,
}
```

### Invalidation after mutation

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
}
```

### Optimistic update

```ts
useMutation({
  mutationFn: updateProduct,
  onMutate: async (updated) => {
    await queryClient.cancelQueries({ queryKey: productQueryKeys.all })
    const previous = queryClient.getQueryData(productQueryKeys.list())
    queryClient.setQueryData(productQueryKeys.list(), (old) =>
      old?.map((p) => (p.id === updated.id ? { ...p, ...updated.data } : p)),
    )
    return { previous }
  },
  onError: (_, __, context) => {
    queryClient.setQueryData(productQueryKeys.list(), context?.previous)
  },
})
```

### Generated API types (preferred)

If the backend exposes OpenAPI, generate types automatically:

```bash
npx openapi-typescript https://api.example.com/openapi.json -o src/api/generated/schema.ts
```

Use generated types in `api.ts` and add feature-specific types in `types.ts` manually.
