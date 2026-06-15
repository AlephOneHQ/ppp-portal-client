/* eslint-disable @next/next/no-img-element */
"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Menu, X } from "lucide-react";
import RightControls from "./right-controls";
import Link from "next/link";
import { getCurrentUser } from "@/lib/user"

export interface HeaderLink {
  name: string;
  url: string;
  adminOnly?: boolean; // Add this flag
}

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  links: HeaderLink[];
  activeSection: string;
}

function MobileMenu({
  open,
  onClose,
  links,
  activeSection,
}: MobileMenuProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white shadow-md flex flex-col gap-4 lg:hidden">
      <div className="flex justify-between items-center text-white p-2 bg-[#C95657]">
        <span className="text-lg font-semibold">Menu</span>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close Menu"
        >
          <X />
        </Button>
      </div>
      <RightControls />
      <Separator className="my-2" />
      <div className="p-2 grid">
        {links.map((item, index) => (
          <Button
            key={index}
            variant="ghost"
            className="justify-start text-[#C95657]"
            onClick={() => {
              onClose();
            }}
            asChild
          >
            <Link href={item.url}>{item.name}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

// Base header links - Partners is admin only
const baseHeaderLinks: HeaderLink[] = [
  { name: "Projects", url: "/projects" },
  { name: "EOIs", url: "/eoi" },
  { name: "Proposals", url: "/proposals" },
  { name: "Contracts", url: "/contracts" },
  { name: "Partners", url: "/partners", adminOnly: true },
];

export function SiteHeader({
  activeSection = "dashboard",
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState(activeSection);
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const userRole = currentUser?.role || "partner"


  // Filter links based on user role
  const headerLinks = baseHeaderLinks.filter(link => {
    if (link.adminOnly) {
      return userRole === 'admin';
    }
    return true;
  });

  return (
    <header className="bg-[#C13C3D] flex h-[--header-height] shrink-0 items-center py-1 gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[--header-height]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {/* Sidebar trigger */}
        <div className="hidden lg:flex items-center">
          <Link href="/projects">
            <img
              src="/icons/oyntcda-logo.svg"
              className="h-14 w-14 md:h-16 md:w-16 filter invert brightness-0"
              alt="oyntcda logo"
            />
          </Link>
        </div>


        {/* Desktop Nav */}
        <div className="hidden lg:flex gap-1 lg:px-20">
          {headerLinks.map((item) => {
            const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
            return (
              <div key={item.url} className="flex flex-col items-center px-2">
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className={`text-[#F0E0E0] hover:text-white hover:bg-transparent ${isActive ? "font-semibold text-white" : ""
                    }`}
                >
                  <Link href={item.url}>{item.name}</Link>
                </Button>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            );
          })}
        </div>

        {/* Mobile Hamburger */}
        <div className="lg:hidden flex w-full justify-between items-center text-[#F0E0E0]">
          <div className="flex items-cente">
            <Link href="/dashboard" className="lg:hidden">
              <img src="/icons/oyntcda-logo.svg" className="h-14 w-14 md:h-16 md:w-16 filter invert brightness-0" alt="oyntcda logo" />
            </Link>
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setMenuOpen(true)}
            aria-label="Open Menu"
          >
            <Menu />
          </Button>
        </div>

        {/* Right-side Controls */}
        <div className="ml-auto hidden lg:flex">
          <RightControls />
        </div>
      </div>

      {/* Mobile Nav Menu */}
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        links={headerLinks}
        activeSection={currentSection}
      />
    </header>
  );
}