import Cookies from "js-cookie"

export type UserRole = "admin" | "partner"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  company_name?: string
}

// Get current user from session
export function getCurrentUser(): User | null {
  if (typeof window !== "undefined") {
    const userStr = Cookies.get("user")
    return userStr ? JSON.parse(userStr) : null
  }
  return null
}

// Check if user has admin role
export function isAdmin(user: User | null): boolean {
  return user?.role === "admin"
}

// Check if user has partner role
export function isPartner(user: User | null): boolean {
  return user?.role === "partner"
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!Cookies.get("access_token")
}
