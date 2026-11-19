"use client"

import { ReactNode } from "react";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SessionManager } from "@/components/session-manager";

export default function MainLayout({ children }: { children: ReactNode }) {

  return (
    <SidebarProvider>
      <SessionManager />
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
