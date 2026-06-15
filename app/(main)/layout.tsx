"use client"

import { ReactNode, useState } from "react";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function MainLayout({ children }: { children: ReactNode }) {

  return (
    <SidebarProvider>
      <SidebarInset>
        <SiteHeader
        />
        <main className="p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
