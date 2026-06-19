## Frontend Architecture

---

### Layers & Responsibilities

**`app/`** — Application bootstrap and wiring. Contains the router (`react-router-dom` v7), providers (query client + router context), and layout shell. No feature logic.

**`features/x/api.ts`** — Raw HTTP functions for a feature. Uses `lib/http.ts` client. No React, no React Query, no UI. Returns typed promises.

**`features/x/queries.ts`** — React Query hooks for reading server state. Consumes API functions. Components call hooks, never API functions directly.

**`features/x/mutations.ts`** — React Query mutation hooks for creating, updating, and deleting. Centralizes invalidation and optimistic updates.

**`features/x/types.ts`** — Feature-specific TypeScript types (filters, form values, UI state). Not a manual mirror of backend schemas — prefer generated types when available.

**`features/x/components/`** — Feature-specific UI building blocks (tables, forms, filters, badges).

**`features/x/pages/`** — Route-level feature screens consumed by the router.

**`components/ui/`** — Primitive reusable UI components (Button, Input, Modal, Select, Table). No business logic.

**`components/common/`** — Composed shared components used across features (EmptyState, PageHeader, ConfirmDialog, ErrorMessage). Still generic, but more opinionated than `ui/`.

**`lib/`** — Infrastructure and configuration: HTTP client (`http.ts`), env vars (`env.ts`), shared formatting utilities. Feature-agnostic.

**`shared/`** — Code reused across multiple features: hooks, types, utils, constants. Only add here after confirming reuse.

**`assets/`** — Static files (images, icons, fonts, SVGs).

---

### Data Flow

```
Backend → lib/http.ts → features/x/api.ts → features/x/queries.ts → Component
                                              features/x/mutations.ts ↗
```

Components never call `fetch` or construct URLs directly. Everything goes through the API layer.

---

### Dependency Injection

```
lib/http.ts ──→ features/x/api.ts ──→ features/x/queries.ts ──→ Component
                                                    └── queries.ts/mutations.ts
```

React Query hooks are the only interface components use for server state. The HTTP client is configured once in `lib/` with base URL and auth interceptors.

---

### Key Rules

| Layer | Owns | Never touches |
|---|---|---|
| `api.ts` | Endpoint HTTP calls | React, query keys, UI |
| `queries.ts` / `mutations.ts` | Query/mutation hooks | HTTP directly, UI components |
| `types.ts` | Feature-specific types | Backend schema duplication (generate instead) |
| `components/` | Feature UI | HTTP, query keys, API functions |
| `components/ui/` | Generic primitives | Business logic, feature data |
| `lib/http.ts` | HTTP client config | Feature-specific imports |
| `shared/` | Cross-feature code | Feature-specific logic |

---

### File Layout per Feature (Example: `products`)

```
features/products/
├── api.ts               → getProducts, getProductById, createProduct
├── queries.ts           → useProducts, useProduct
├── mutations.ts         → useCreateProduct, useUpdateProduct, useDeleteProduct
├── types.ts             → ProductFilters, ProductFormValues, ProductSortOption
├── components/          → ProductTable, ProductForm, ProductFilters, ProductStatusBadge
└── pages/               → ProductsPage, ProductDetailsPage
```

---

### Testing Strategy

- **`api.ts`**: mock `http` client, verify correct endpoints and payloads.
- **`queries.ts` / `mutations.ts`**: wrap with `QueryClientProvider`, mock API functions, verify loading/success/error states.
- **Components**: render with mock hook return values, verify UI output.
- **Pages**: render with router context, cover data fetching, empty states, error states.

---

### State Management

| State type | Tool |
|---|---|---|
| Server state | React Query (`@tanstack/react-query`) |
| Local component state | `useState` / `useReducer` |
| Global UI state | Zustand or Context (sparingly) |
| Form state | React Hook Form + Zod schema validation |
| URL state | Router search params |

---

### Query Keys

Keys are co-located with the feature for type safety and cache invalidation:

```ts
export const productQueryKeys = {
  all: ['products'] as const,
  list: () => [...productQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...productQueryKeys.all, 'detail', id] as const,
}
```

---

### Import Direction

```
components → features/x/queries → features/x/api → lib/http
```

Reverse imports (`lib/http` importing from `features/`) are forbidden.
