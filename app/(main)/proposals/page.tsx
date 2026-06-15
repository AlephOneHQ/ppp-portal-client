"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Filter,
  Search,
  ChevronDown,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  SortDescIcon,
  ArrowRight,
  ChevronUp,
} from 'lucide-react'
import { proposalAPI, type Proposal } from "@/lib/api/proposals"
import { getCurrentUser } from "@/lib/user"
import { toast } from "sonner"
import { getStatusColor } from "@/lib/utils/statuses"
import EmptyState from "@/components/empty-states/empty-project"

export default function Page() {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [goToPage, setGoToPage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [sortBy, setSortBy] = useState("-submitted_at")
  const router = useRouter()

  // Filter states - same as EOI page
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [statusFilters, setStatusFilters] = useState<string[]>(["all"])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const userRole = currentUser?.role || "partner"

  const pageSize = 5
  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  // Status options for proposals
  const statusOptions = [
    { value: "all", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "under_review", label: "Under Review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" }
  ]

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort)
    setCurrentPage(1)
  }

  // Status filter handlers - same as EOI page
  const handleStatusFilterChange = (status: string, checked: boolean) => {
    setCurrentPage(1)

    if (status === "all") {
      setStatusFilters(checked ? ["all"] : [])
    } else {
      let newFilters: string[];

      if (checked) {
        newFilters = [...statusFilters.filter(f => f !== "all"), status];
      } else {
        newFilters = statusFilters.filter(f => f !== status);
      }

      setStatusFilters(newFilters.length === 0 ? ["all"] : newFilters);
    }
  }

  // Date filter handlers
  const handleDateFromChange = (date: string) => {
    setCurrentPage(1)
    setDateFrom(date)
  }

  const handleDateToChange = (date: string) => {
    setCurrentPage(1)
    setDateTo(date)
  }

  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilters(["all"])
    setDateFrom("")
    setDateTo("")
    setSearchQuery("")
    setCurrentPage(1)
  }

  // Check if any filters are active
  const hasActiveFilters =
    !statusFilters.includes("all") ||
    dateFrom ||
    dateTo ||
    searchQuery

  // Get active filter count for badge
  const getActiveFilterCount = () => {
    let count = 0
    if (!statusFilters.includes("all")) count++
    if (dateFrom) count++
    if (dateTo) count++
    if (searchQuery) count++
    return count
  }

  // Helper function to build filters
  const buildFilters = (): Record<string, string | number | undefined> => {
    const filters: Record<string, string | number | undefined> = {
      search: searchQuery || undefined,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      ordering: sortBy,
    }

    // Add status filters (exclude "all")
    if (!statusFilters.includes("all") && statusFilters.length > 0) {
      filters.status = statusFilters.join(',');
    }

    // Add date filters with proper formatting
    if (dateFrom) {
      filters.submitted_after = new Date(dateFrom).toISOString().split('T')[0];
    }
    if (dateTo) {
      filters.submitted_before = new Date(dateTo).toISOString().split('T')[0];
    }

    // Clean up undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
        delete filters[key];
      }
    });

    console.log("🔍 Final filters being sent to API:", filters);
    return filters;
  }

  useEffect(() => {
    const fetchProposals = async () => {
      setIsLoading(true)
      try {
        const filters = buildFilters()
        console.log("📡 Fetching proposals with filters:", filters)

        let response;
        if (userRole === "admin") {
          response = await proposalAPI.adminList(filters)
        } else {
          response = await proposalAPI.list(filters)
        }

        console.log("✅ Fetched proposals:", response)

        if (response.success && response.data) {
          setProposals(response.data.results)
          setTotalCount(response.data.count)
        } else {
          toast.error(response.message || "Failed to fetch proposals")
        }
      } catch (error) {
        console.error("❌ Error fetching proposals:", error)
        toast.error("Failed to fetch proposals")
      } finally {
        setIsLoading(false)
      }
    }

    // Add a small debounce to prevent too many API calls
    const timeoutId = setTimeout(fetchProposals, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, currentPage, sortBy, statusFilters, dateFrom, dateTo, userRole])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleGoToPage = () => {
    const page = Number.parseInt(goToPage)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page)
      setGoToPage("")
    }
  }

  const renderPaginationButtons = () => {
    const buttons = []
    const maxVisiblePages = 5

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="icon"
          className={`h-8 w-8 ${i === currentPage ? "bg-[#EED8D8] text-[#C13C3D] border-[#C13C3D] hover:bg-[#EED8D8]" : "hover:bg-gray-100"}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      )
    }

    return buttons
  }

  const formatStatus = (status: string): string => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  if (isLoading && proposals.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading proposals...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Proposals</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and manage partner proposals.</p>
        </div>
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search submissions by ID, company name, project title"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters and Sort - Updated to match EOI page design */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col w-full gap-4">
          {/* Filter Toggle Button */}
          <div className="flex flex-wrap items-center justify-between w-full max-w-sm">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent w-full sm:w-auto"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                  {getActiveFilterCount()}
                </Badge>
              )}
              {isFiltersOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Collapsible Filter Section */}
          {isFiltersOpen && (
            <div className="grid gap-6 p-4 border rounded-lg max-w-sm">
              {/* Status Filter */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Status</h3>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <div key={option.value} className="flex items-center gap-3 border p-1 rounded-md">
                      <Checkbox
                        id={`status-${option.value}`}
                        checked={statusFilters.includes(option.value)}
                        onCheckedChange={(checked) =>
                          handleStatusFilterChange(option.value, checked as boolean)
                        }
                      />
                      <Label htmlFor={`status-${option.value}`} className="font-light text-xs">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Filter */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Submission Date Range</h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <label htmlFor="date-from" className="block text-xs text-muted-foreground mb-1">
                      From Date
                    </label>
                    <Input
                      type="date"
                      id="date-from"
                      value={dateFrom}
                      onChange={(e) => handleDateFromChange(e.target.value)}
                      className="w-full h-10 bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="date-to" className="block text-xs text-muted-foreground mb-1">
                      To Date
                    </label>
                    <Input
                      type="date"
                      id="date-to"
                      value={dateTo}
                      onChange={(e) => handleDateToChange(e.target.value)}
                      className="w-full h-10 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none bg-transparent">
                <SortDescIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline text-[#707070] text-sm">
                  Sort by:{" "}
                  <span className="text-[#040404]">
                    {sortBy === "project_title"
                      ? "Project Name (A - Z)"
                      : sortBy === "-project_title"
                        ? "Project Name (Z - A)"
                        : sortBy === "-submitted_at"
                          ? "Newest -> Oldest"
                          : "Oldest -> Newest"}
                  </span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={sortBy === "project_title"}
                onCheckedChange={() => handleSortChange("project_title")}
              >
                Project Name (A - Z)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortBy === "-project_title"}
                onCheckedChange={() => handleSortChange("-project_title")}
              >
                Project Name (Z - A)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortBy === "-submitted_at"}
                onCheckedChange={() => handleSortChange("-submitted_at")}
              >
                Newest <ArrowRight /> Oldest
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortBy === "submitted_at"}
                onCheckedChange={() => handleSortChange("submitted_at")}
              >
                Oldest <ArrowRight /> Newest
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Active Filters Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {!statusFilters.includes("all") && statusFilters.map(status => {
            const option = statusOptions.find(opt => opt.value === status)
            return option ? (
              <Badge key={status} variant="secondary" className="px-3 py-1">
                Status: {option.label}
              </Badge>
            ) : null
          })}
          {dateFrom && (
            <Badge variant="secondary" className="px-3 py-1">
              From: {new Date(dateFrom).toLocaleDateString()}
            </Badge>
          )}
          {dateTo && (
            <Badge variant="secondary" className="px-3 py-1">
              To: {new Date(dateTo).toLocaleDateString()}
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="px-3 py-1">
              Search: &quot;{searchQuery}&quot;
            </Badge>
          )}
        </div>
      )}

      {/* Results Summary */}
      {hasActiveFilters && (
        <div className="text-sm text-muted-foreground">
          Showing {proposals.length} of {totalCount} proposals matching your filters
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <EmptyState
                title={userRole === "admin" ? "No proposals received" : "No proposals submitted"}
                description={userRole === "admin" ? `Proposals from approved EOIs 
will appear here for evaluation.` : `Once you submit a proposal for an approved EOI,
you'll be able to manage your proposals here.` }
                iconSrc="/icons/empty-proposal.svg"
              />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Reference ID
                  </th>
                  {userRole === "admin" && (
                    <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Company Name
                    </th>
                  )}
                  <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Project Title
                  </th>
                  <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Submission Date
                  </th>
                  <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {proposals.map((proposal) => (
                  <tr
                    key={proposal.id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/proposals/${proposal.id.replace("#", "")}`)}
                  >
                    <td className="px-4 py-3 md:px-6 md:py-4 text-sm font-medium whitespace-nowrap">
                      {proposal.reference_id}
                    </td>
                    {userRole === "admin" && (
                      <td className="px-4 py-3 md:px-6 md:py-4 text-sm whitespace-nowrap">
                        {proposal.company_name || "Unknown"}
                      </td>
                    )}
                    <td className="px-4 py-3 md:px-6 md:py-4 text-sm max-w-[200px] truncate" title={proposal.project_title}>
                      {userRole === "admin" ? proposal.project_title : proposal.project?.title}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-sm whitespace-nowrap">
                      {proposal.submitted_at ? new Date(proposal.submitted_at).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <div className="flex items-center gap-2 justify-between">
                        <Badge
                          variant="outline"
                          className={`text-xs whitespace-nowrap px-3 py-2 rounded-md ${getStatusColor(proposal.status)}`}
                        >
                          {formatStatus(proposal.status)}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/proposals/${proposal.id.replace("#", "")}`)
                              }}
                            >
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              Showing {startItem}-{endItem} of {totalCount}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              {/* Navigation Buttons */}
              <div className="flex items-center gap-1 w-full sm:w-auto justify-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 bg-[#F6F6F6] border-[#EEEEEF]"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="sr-only">First page</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-9 bg-[#F6F6F6] border-[#EEEEEF]"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:block">Previous</span>
                </Button>

                {/* Mobile: Current Page Display */}
                <div className="sm:hidden text-sm font-medium px-2">
                  Page {currentPage} of {totalPages}
                </div>

                {/* Page Numbers - Desktop */}
                <div className="hidden sm:flex items-center gap-1 bg-[#F6F6F6] border-[#EEEEEF] p-1 rounded-lg">
                  {renderPaginationButtons()}
                </div>

                <Button
                  variant="outline"
                  className="h-8 sm:h-9 bg-[#F6F6F6] border-[#EEEEEF]"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <span className="hidden sm:block">Next</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 bg-[#F6F6F6] border-[#EEEEEF]"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="sr-only">Last page</span>
                </Button>
              </div>

              {/* Go to Page */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:block">Go to page:</span>
                <span className="text-sm text-muted-foreground whitespace-nowrap sm:hidden">Page:</span>
                <Input
                  type="text"
                  value={goToPage}
                  onChange={(e) => setGoToPage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleGoToPage()
                    }
                  }}
                  className="h-8 sm:h-9 w-12 sm:w-16 text-center text-sm"
                  placeholder="e.g. 5"
                />
                <Button onClick={handleGoToPage} size="sm" className="h-8 sm:h-9 text-white px-3">
                  Go
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}