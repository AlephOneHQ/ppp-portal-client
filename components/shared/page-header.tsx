"use client"

/* eslint-disable @next/next/no-img-element */
import Link from "next/link"
import { useState } from "react"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

const PageHeader = () => {
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between py-4 px-2 md:px-0">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <img
            src="/icons/oyntcda-logo.svg"
            className="h-14 w-14 md:h-16 md:w-16"
            alt="oyntcda logo"
          />
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList className="flex items-center space-x-8">
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  href="/available-projects"
                  className="text-sm font-medium text-[#383F1E] hover:text-[#C13C3D] transition-colors"
                >
                  Projects
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Button
                asChild
                className="bg-gradient-to-r from-[#C13C3D] to-[#C9481C] text-white px-8 py-6 rounded-xl shadow-lg"
              >
                <Link href="/partner/login">Partner</Link>
              </Button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-lg border border-gray-200"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {open && (
        <div className="md:hidden shadow bg-white">
          <div className="container mx-auto py-4 px-2 flex flex-col space-y-4">
            <Link
              href="/available-projects"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-[#383F1E] hover:text-[#C13C3D]"
            >
              Projects
            </Link>

            {/* <Button
              asChild
              className="flex bg-gradient-to-r from-[#C13C3D] to-[#C9481C] text-white rounded-xl"
            >
              <Link href="/partner/login">Partner</Link>
            </Button> */}

            <Button
              asChild
              className="bg-gradient-to-r from-[#C13C3D] to-[#C9481C] text-white px-8 py-6 rounded-xl shadow-lg"
            >
              <Link href="/partner/login">Partner</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}

export default PageHeader
