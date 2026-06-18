export interface UserPublic {
  id: string
  email: string
  billingAccountId: string
  createdAt: string
}

export interface AuthSession {
  user: UserPublic
}
