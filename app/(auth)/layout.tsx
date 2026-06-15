"use client";

import PageHeader from "@/components/shared/page-header";

interface LibraryLayoutProps {
  children: React.ReactNode;
}

const LibraryLayout = ({ children }: LibraryLayoutProps) => {
  return (
    <div className="min-h-screen w-full">
      <PageHeader />
      <div
        className="flex mx-auto items-center justify-center p-6 md:p-10"
        style={{ minHeight: "calc(100vh - 96px)" }}
      >
        <div className="w-full max-w-[440px]">{children}</div>
      </div>
    </div>
  );
};

export default LibraryLayout;
