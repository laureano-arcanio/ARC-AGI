export type UserRead = {
  id: number
  uuid: string
  role: string
  createdAt: string | null
  updatedAt: string | null
}

export type UserUpdate = {
  role: string | null
}
