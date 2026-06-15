"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, ChevronDown, FilterIcon, PlusIcon, SortDescIcon } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable } from "@/components/data-table"
import { getCurrentUser } from "@/lib/user"
import { useProjects } from "@/hooks/useProjects"
import type { ProjectFilters } from "@/types/projects"
import type { Project } from "@/components/data-table"

// Add the normalizeStatus function here or import it
const normalizeStatus = (status: string): Project["status"] => {
  const normalized = status.toLowerCase()

  switch (normalized) {
    case "published":
      return "Published"
    case "draft":
      return "Draft"
    case "contracted":
      return "Contracted"
    case "monitoring":
      return "Monitoring"
    case "overdue":
      return "Overdue"
    case "closed_out":
      return "Closed Out"
    case "archived":
      return "Archived"
    default:
      return "Draft"
  }
}

/**
 * Derive the effective display status for a project.
 * If the project has an active contract (status = "active"), show "Contracted"
 * regardless of the raw project status, so the frontend displays "Assigned".
 */
const getEffectiveStatus = (
  projectStatus: string,
  contract?: { status?: string; id?: string; partner?: { id: string; business_name: string } } | null
): Project["status"] => {
  const contractStatus = contract?.status?.toLowerCase()
  // Contract is active (awaiting signature) or beyond → project is "Assigned"
  const assignedContractStatuses = ["active", "monitoring", "completed"]
  if (contractStatus && assignedContractStatuses.includes(contractStatus)) {
    return "Contracted"
  }
  return normalizeStatus(projectStatus)
}

export default function Page() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [sortBy, setSortBy] = useState<string>("-created_at")
  const [currentPage, setCurrentPage] = useState(1)
  
  const pageSize = 5

  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const userRole = currentUser?.role || "partner"

  // Build filters for API - partners should only see published projects
  const filters: ProjectFilters = {
    search: searchQuery,
    status: userRole === "partner" ? "published" : statusFilter,
    sort_by: sortBy,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  }

  const { projects, loading, error, pagination, refetch } = useProjects(filters)

  // Transform API data to match your table format with proper typing
  const transformedProjects: Project[] = projects.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.executive_summary || "",
    executive_summary: project.executive_summary || "",
    imageUrl: undefined,
    metadata: [
      { sector: project.authorizing_sector?.name || "" },
      { budget: `₦${Number.parseFloat(project.estimated_cost || "0").toLocaleString()}` },
      {
        timeline:
          project.proposed_start_date && project.estimated_completion_date
            ? `${new Date(project.proposed_start_date).toLocaleDateString()} - ${new Date(project.estimated_completion_date).toLocaleDateString()}`
            : "TBD",
      },
    ],
    // submission_fee: project.submission_fee,
    createdBy: project.created_by?.email || "Unknown",
    contractedTo: project.contracted_to || undefined,
    status: getEffectiveStatus(project.status, project.contract),
    authorizing_sector: project.authorizing_sector,
    estimated_cost: project.estimated_cost,
    proposed_start_date: project.proposed_start_date,
    estimated_completion_date: project.estimated_completion_date,
    eoi_start_date: project.eoi_start_date,
    eoi_end_date: project.eoi_end_date,
    gallery_images: project.gallery_images || [],
    created_by: project.created_by,
    contract: project.contract || undefined,
  }))

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleProjectDeleted = () => {
    // Call refetch to get updated projects list
    refetch()
    // Also reset to first page in case the deletion affects pagination
    setCurrentPage(1)
  }

  const handleStatusFilter = (status: string) => {
    if (userRole !== "partner") {
      setStatusFilter(status)
      setCurrentPage(1)
    }
  }

  const handleSortChange = (sort: string) => {
    setSortBy(sort)
  }

  if (error) {
    return (
      <section className="flex flex-1 flex-col gap-4 md:p-4 pt-0 text-[#444444]">
        <div className="text-red-500">Error: {error}</div>
      </section>
    )
  }

  return (
    <section className="flex flex-1 flex-col gap-4 md:p-4 pt-0 text-[#444444]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
        <div className="md:col-span-2">
          <p className="text-xl font-semibold leading-6 text-[#040404]">Projects</p>
          <p className="mt-1 truncate text-sm leading-5 text-gray-500">
            {userRole === "partner" ? "Browse available projects." : "Create, manage, and track all projects."}
          </p>
        </div>

        {userRole === "admin" && (
          <div>
            <div className="flex justify-between md:justify-end gap-4">
              <Button asChild className="rounded-xl">
                <Link href="/projects/create-project" className="flex items-center gap-2">
                  <PlusIcon className="h-4 w-4" />
                  <span>Create Project</span>
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-auto">
          {/* <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /> */}
          <img src="/icons/search.svg" alt="" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
          <Input
            type="search"
            placeholder="Search projects by name, creator, sector"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm rounded-lg bg-background pl-8 sm:w-[200px] lg:w-[336px]"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {userRole !== "partner" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-none bg-transparent">
                  <FilterIcon className="h-4 w-4" />
                  <span className="hidden sm:flex items-center gap-2 ml-2 text-[#040404] text-sm">
                    Filter <ChevronDown className="h-4 w-4" />
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem checked={statusFilter === ""} onCheckedChange={() => handleStatusFilter("")}>
                  All
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "published"}
                  onCheckedChange={() => handleStatusFilter("published")}
                >
                  Published
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "draft"}
                  onCheckedChange={() => handleStatusFilter("draft")}
                >
                  Draft
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "contracted"}
                  onCheckedChange={() => handleStatusFilter("contracted")}
                >
                  Assigned
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none bg-transparent">
                <SortDescIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline text-[#707070] text-sm">
                  Sort by:{" "}
                  <span className="text-[#040404]">
                    {sortBy === "title"
                      ? "Project Name (A - Z)"
                      : sortBy === "-title"
                        ? "Project Name (Z - A)"
                        : sortBy === "-created_at"
                          ? "Newest -> Oldest"
                          : "Oldest -> Newest"}
                  </span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem checked={sortBy === "title"} onCheckedChange={() => handleSortChange("title")}>
                Project Name (A - Z)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortBy === "-title"}
                onCheckedChange={() => handleSortChange("-title")}
              >
                Project Name (Z - A)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortBy === "-created_at"}
                onCheckedChange={() => handleSortChange("-created_at")}
              >
                Newest <ArrowRight /> Oldest
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortBy === "created_at"}
                onCheckedChange={() => handleSortChange("created_at")}
              >
                Oldest <ArrowRight /> Newest
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid auto-rows-min gap-4">
        <DataTable
          projects={transformedProjects}
          totalCount={pagination.count}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          userRole={userRole}
          loading={loading}
          onProjectDeleted={handleProjectDeleted}
        />
      </div>
    </section>
  )
}