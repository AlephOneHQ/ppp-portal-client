"use client";

import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import type { LucideIcon } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string | number;
}

export function NavMain({
  items,
}: {
  items: readonly NavItem[]; // Change to readonly
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2 mt-8">
        <SidebarMenu className="gap-1">
          {items.map((item, index) => {
            const isActive = pathname === item.url || pathname.startsWith(item.url + "/");

            return (
              <SidebarMenuItem key={index}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={clsx(
                    "flex items-center gap-3 cursor-pointer text-[#444444] py-3 px-3 rounded-lg transition-all duration-200 hover:bg-[#F6F6F6] hover:text-[#C13C3D]",
                    isActive && "bg-[#F6F6F6] text-[#C13C3D] font-medium"
                  )}
                >
                  <Link href={item.url} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      {item.icon && (
                        <item.icon
                          className={clsx(
                            "h-5 w-5 stroke-[1.5] shrink-0 transition-colors",
                            isActive ? "text-[#C13C3D]" : "text-[#666666]"
                          )}
                        />
                      )}
                      <span className="text-sm font-normal transition-colors">
                        {item.title}
                      </span>
                    </div>

                    {item.badge && (
                      <span className={clsx(
                        "inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full min-w-6 h-6 transition-colors",
                        isActive
                          ? "bg-[#C13C3D] text-white"
                          : "bg-gray-200 text-gray-700"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
