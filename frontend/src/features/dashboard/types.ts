export type UserRead = {
  id: number
  email: string
  role: string
  createdAt: string | null
  updatedAt: string | null
}

export type LoginResponse = {
  accessToken: string
  tokenType: string
  user: UserRead
}
