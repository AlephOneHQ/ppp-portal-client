"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { NavUser } from "./nav-user"
import { Settings } from "lucide-react"
import { getCurrentUser } from "@/lib/user"
import NotificationPage from "../notification-page"
import type { User } from "@/lib/user"

const RightControls = () => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
  }, [])

  // Show loading state or default while user data is being fetched
  if (!user) {
    return (
      <div className="flex items-center gap-2 text-[#C95657] lg:text-[#F0E0E0] p-2">
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings />
        </Button>
        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
        <NotificationPage />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-[#C95657] lg:text-[#F0E0E0] p-2">
      <Button variant="ghost" size="icon" aria-label="Settings" asChild>
        <Link href="/settings">
          <Settings />
        </Link>
      </Button>
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
      <NotificationPage />
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
      <NavUser
        user={{
          name: user.name,
          email: user.email,
          avatar: `/avatars/${user.name.charAt(0).toLowerCase()}.jpg`,
        }}
      />
    </div>
  )
}

export default RightControls