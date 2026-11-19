"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  CheckCircle,
  Ban,
  Wallet
} from "lucide-react"
import { eoiAPI, type EOI, type EOIFilters } from "@/lib/api/projects"
import { toast } from "sonner"
import { getCurrentUser } from "@/lib/user"
import { getStatusColor } from "@/lib/utils/statuses"
import { proposalAPI } from "@/lib/api/proposals"
import EmptyState from "@/components/empty-states/empty-project"

// Add Confirmation Dialog Component
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Add type for payment status
type PaymentStatus = "unpaid" | "paid" | "processing" | "failed" | string
type EOIStatus = "draft" | "submitted" | "approved" | "rejected" | "withdrawn" | "archived" | string

type ConfirmationDialogState = {
  isOpen: boolean
  action: "approve" | "reject" | "markAsPaid" | "withdraw" | null
  eoiId: string | null
  eoiReferenceId: string | null
  projectTitle: string | null
}

export default function Page() {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [goToPage, setGoToPage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [eois, setEois] = useState<EOI[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [sortBy, setSortBy] = useState("-created_at")
  const router = useRouter()

  // Filter states
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [statusFilters, setStatusFilters] = useState<string[]>(["all"])
  const [paymentFilters, setPaymentFilters] = useState<string[]>(["all"])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState>({
    isOpen: false,
    action: null,
    eoiId: null,
    eoiReferenceId: null,
    projectTitle: null
  })

  // Add state to track proposals for each EOI
  const [proposalsMap, setProposalsMap] = useState<Record<string, boolean>>({})
  const [checkingProposals, setCheckingProposals] = useState<Record<string, boolean>>({})

  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const userRole = currentUser?.role || "partner"

  const pageSize = 5
  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  // Status options
  const statusOptions = [
    { value: "all", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "approved", label: "Accepted" },
    { value: "rejected", label: "Rejected" },
    { value: "withdrawn", label: "Withdrawn" },
    { value: "archived", label: "Archived" }
  ]

  // Payment options
  const paymentOptions = [
    { value: "all", label: "All" },
    { value: "paid", label: "Paid" },
    { value: "unpaid", label: "Unpaid" }
  ]

  // Check if proposal exists for an EOI
  const checkProposalExists = async (eoiId: string) => {
    setCheckingProposals(prev => ({ ...prev, [eoiId]: true }))
    try {
      const proposalResult = await proposalAPI.getByEOI(eoiId)
      const proposalExists = Boolean(
        proposalResult.success &&
        proposalResult.data &&
        proposalResult.data.results &&
        proposalResult.data.results.length > 0
      )

      console.log("proposalExists",proposalExists)
      
      setProposalsMap(prev => ({ ...prev, [eoiId]: proposalExists }))
      return proposalExists
    } catch (error) {
      console.error("Error checking proposal:", error)
      setProposalsMap(prev => ({ ...prev, [eoiId]: false }))
      return false
    } finally {
      setCheckingProposals(prev => ({ ...prev, [eoiId]: false }))
    }
  }

  // Check if withdraw should be allowed for an EOI
  const canWithdraw = (eoi: EOI) => {
    if (userRole !== "partner") return false
    
    // Partner can only withdraw if:
    // 1. EOI status is "submitted" or "approved"
    // 2. No proposal exists for this EOI
    // 3. Payment status is not "processing"
    return (
      (eoi.status === "submitted" || eoi.status === "approved") && 
      !proposalsMap[eoi.id] && 
      eoi.payment_status !== "processing"
    )
  }

  // Open confirmation dialog
  const openConfirmationDialog = async (action: ConfirmationDialogState["action"], eoi: EOI) => {
    // For withdraw action, check if proposal exists first
    if (action === "withdraw") {
      const hasProposal = await checkProposalExists(eoi.id)
      if (hasProposal) {
        toast.error("Cannot withdraw EOI: A proposal already exists for this EOI")
        return
      }
    }

    setConfirmationDialog({
      isOpen: true,
      action,
      eoiId: eoi.id,
      eoiReferenceId: eoi.reference_id,
      projectTitle: eoi.project?.title || "Unknown Project"
    })
  }

  // Close confirmation dialog
  const closeConfirmationDialog = () => {
    setConfirmationDialog({
      isOpen: false,
      action: null,
      eoiId: null,
      eoiReferenceId: null,
      projectTitle: null
    })
  }

  // Handle confirmed action
  const handleConfirmedAction = async () => {
    const { action, eoiId } = confirmationDialog
    
    if (!action || !eoiId) return

    try {
      let result
      switch (action) {
        case "approve":
          result = await eoiAPI.updateStatus(eoiId, "approved")
          if (result.success) {
            toast.success("EOI accepted successfully")
          } else {
            toast.error("Failed to accept EOI")
          }
          break
        
        case "reject":
          result = await eoiAPI.updateStatus(eoiId, "rejected")
          if (result.success) {
            toast.success("EOI rejected")
          } else {
            toast.error("Failed to reject EOI")
          }
          break
        
        case "markAsPaid":
          result = await eoiAPI.updatePaymentStatus(eoiId, "paid")
          if (result.success) {
            toast.success("Payment status updated to paid")
          } else {
            toast.error(result.message || "Failed to update payment status")
          }
          break
        
        case "withdraw":
          // Double-check if proposal exists before withdrawing
          const hasProposal = await checkProposalExists(eoiId)
          if (hasProposal) {
            toast.error("Cannot withdraw EOI: A proposal already exists for this EOI")
            closeConfirmationDialog()
            return
          }

          result = await eoiAPI.updateStatus(eoiId, "withdrawn")
          if (result.success) {
            toast.success("EOI withdrawn successfully")
          } else {
            toast.error("Failed to withdraw EOI")
          }
          break
      }

      // Refresh the list after action
      const filters = buildFilters()
      const updatedResult = await eoiAPI.list(filters)
      if (updatedResult.success && updatedResult.data) {
        setEois(updatedResult.data.results)
        setTotalCount(updatedResult.data.count)
      }
    } catch (error) {
      console.error(`Error performing ${action} action:`, error)
      toast.error(`Error ${action} EOI`)
    } finally {
      closeConfirmationDialog()
    }
  }

  // Get confirmation dialog content based on action
  const getConfirmationContent = () => {
    const { action, eoiReferenceId, projectTitle } = confirmationDialog
    
    const content = {
      title: "",
      description: "",
      confirmText: "",
      confirmVariant: "default" as "default" | "destructive"
    }

    switch (action) {
      case "approve":
        content.title = "Accept EOI"
        content.description = `Are you sure you want to accept EOI ${eoiReferenceId} for project "${projectTitle}"? This action cannot be undone.`
        content.confirmText = "Yes, Accept"
        content.confirmVariant = "default"
        break
      
      case "reject":
        content.title = "Reject EOI"
        content.description = `Are you sure you want to reject EOI ${eoiReferenceId} for project "${projectTitle}"? This action cannot be undone.`
        content.confirmText = "Yes, Reject"
        content.confirmVariant = "destructive"
        break
      
      case "markAsPaid":
        content.title = "Mark as Paid"
        content.description = `Are you sure you want to mark EOI ${eoiReferenceId} for project "${projectTitle}" as paid? This will update the payment status.`
        content.confirmText = "Yes, Mark as Paid"
        content.confirmVariant = "default"
        break
      
      case "withdraw":
        content.title = "Withdraw EOI"
        content.description = `Are you sure you want to withdraw EOI ${eoiReferenceId} for project "${projectTitle}"? This action cannot be undone.`
        content.confirmText = "Yes, Withdraw"
        content.confirmVariant = "destructive"
        break
      
      default:
        content.title = "Confirm Action"
        content.description = "Are you sure you want to proceed with this action?"
        content.confirmText = "Confirm"
        content.confirmVariant = "default"
    }

    return content
  }

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort)
    setCurrentPage(1)
  }

  // Status filter handlers - FIXED: Improved logic
  const handleStatusFilterChange = (status: string, checked: boolean) => {
    setCurrentPage(1)

    if (status === "all") {
      // If "all" is checked, clear all other filters
      setStatusFilters(checked ? ["all"] : [])
    } else {
      let newFilters: string[];

      if (checked) {
        // Add the status and remove "all" if present
        newFilters = [...statusFilters.filter(f => f !== "all"), status];
      } else {
        // Remove the status
        newFilters = statusFilters.filter(f => f !== status);
      }

      // If no filters are selected, default to "all"
      setStatusFilters(newFilters.length === 0 ? ["all"] : newFilters);
    }
  }

  // Payment filter handlers - FIXED: Improved logic
  const handlePaymentFilterChange = (payment: string, checked: boolean) => {
    setCurrentPage(1);

    if (payment === "all") {
      setPaymentFilters(["all"]);
      return;
    }

    const withoutAll = paymentFilters.filter(p => p !== "all");

    let updated = checked
      ? [...withoutAll, payment]
      : withoutAll.filter(p => p !== payment);

    if (updated.length === 0) updated = ["all"];

    setPaymentFilters(updated);
  };

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
    setPaymentFilters(["all"])
    setDateFrom("")
    setDateTo("")
    setCurrentPage(1)
  }

  // Check if any filters are active
  const hasActiveFilters =
    !statusFilters.includes("all") ||
    !paymentFilters.includes("all") ||
    dateFrom ||
    dateTo

  // Helper function to build filters - FIXED: Proper TypeScript types and API compatibility
  const buildFilters = (): EOIFilters => {
    const filters: EOIFilters = {
      search: searchQuery || undefined,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      ordering: sortBy,
    }

    // Add status filters (exclude "all")
    if (!statusFilters.includes("all") && statusFilters.length > 0) {
      // Use comma-separated string for multiple status values
      filters.status = statusFilters.join(',');
    }

    // Add payment filters (exclude "all")
    if (!paymentFilters.includes("all") && paymentFilters.length > 0) {
      filters.payment_status = paymentFilters.join(",");
    }

    // Add date filters
    if (dateFrom) {
      filters.submitted_after = dateFrom
    }
    if (dateTo) {
      filters.submitted_before = dateTo
    }

    // Clean up undefined values
    Object.keys(filters).forEach(key => {
      const filterKey = key as keyof EOIFilters;
      if (filters[filterKey] === undefined || filters[filterKey] === null || filters[filterKey] === '') {
        delete filters[filterKey];
      }
    });

    console.log("Final filters being sent to API:", filters);
    return filters;
  }

  useEffect(() => {
    const fetchEOIs = async () => {
      setIsLoading(true)
      try {
        const filters = buildFilters()
        console.log("Fetching with filters:", filters)
        const result = await eoiAPI.list(filters)

        console.log("Fetched EOIs:", result)

        if (result.success && result.data) {
          setEois(result.data.results)
          setTotalCount(result.data.count)
        } else {
          toast.error(result.message || "Failed to fetch EOIs")
        }
      } catch (error) {
        console.error("Error fetching EOIs:", error)
        toast.error("Failed to fetch EOIs")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEOIs()
  }, [searchQuery, currentPage, sortBy, statusFilters, paymentFilters, dateFrom, dateTo])

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
        </Button>,
      )
    }

    return buttons
  }

  const getPaymentColor = (payment: PaymentStatus) => {
    switch (payment) {
      case "unpaid":
        return "bg-red-500"
      case "paid":
        return "bg-green-500"
      case "failed":
      case "processing":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatStatus = (status: string): string => {
    // EOI acceptance is displayed as "Accepted" (underlying value remains "approved")
    if (status === "approved") return "Accepted"
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const formatPaymentStatus = (status: PaymentStatus): string => {
    if (!status) return "Unknown"
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (isLoading && eois.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading EOIs...</p>
      </div>
    )
  }

  const confirmationContent = getConfirmationContent()

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:p-4">
      {/* Confirmation Dialog */}
      <AlertDialog open={confirmationDialog.isOpen} onOpenChange={closeConfirmationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmationContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeConfirmationDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmedAction}
              className={confirmationContent.confirmVariant === "destructive" ? "bg-destructive text-white hover:bg-destructive/90" : ""}
            >
              {confirmationContent.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">EOI</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and manage all EOIs submitted by partners.</p>
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

      {/* Filters and Sort */}
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
                  !
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

              {/* Payment Filter */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Payment</h3>
                <div className="flex flex-wrap gap-2">
                  {paymentOptions.map((option) => (
                    <div key={option.value} className="flex items-center gap-3 border p-1 rounded-md">
                      <Checkbox
                        id={`payment-${option.value}`}
                        checked={paymentFilters.includes(option.value)}
                        onCheckedChange={(checked) =>
                          handlePaymentFilterChange(option.value, checked as boolean)
                        }
                      />
                      <Label htmlFor={`payment-${option.value}`} className="font-light text-xs">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Filter */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Submission Date</h3>
                <div className="flex justify-between">
                  <div>
                    <label htmlFor="date-from" className="block text-xs text-muted-foreground mb-1">
                      From
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
                      To
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
              <DropdownMenuCheckboxItem
                checked={sortBy === "title"}
                onCheckedChange={() => handleSortChange("title")}
              >
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
          {!paymentFilters.includes("all") && paymentFilters.map(payment => {
            const option = paymentOptions.find(opt => opt.value === payment)
            return option ? (
              <Badge key={payment} variant="secondary" className="px-3 py-1">
                Payment: {option.label}
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
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Reference ID
                </th>
                {userRole !== "partner" && (
                  <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Company Name
                  </th>
                )}
                <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Project Title
                </th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {eois.length === 0 ? (
                <tr>
                  <td colSpan={userRole !== "partner" ? 5 : 4} className="px-4 py-8 text-center text-muted-foreground">
                    <EmptyState
                title="No submissions yet"
                description={userRole === "admin" ? `EOIs submitted by partners 
will appear here for review and processing.` : `Submit an Expression of Interest 
for any open project to get started.` }
                iconSrc="/icons/empty-proposal.svg"
              />
                  </td>
                </tr>
              ) : (
                eois.map((eoi) => (
                  <tr
                    key={eoi.id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/eoi/${eoi.id}`)}
                  >
                    <td className="px-4 py-3 md:px-6 md:py-4 text-sm font-medium whitespace-nowrap">
                      {eoi.reference_id}
                    </td>
                    {userRole !== "partner" && (
                      <td className="px-4 py-3 md:px-6 md:py-4 text-sm whitespace-nowrap">
                        {eoi.company_name || "Unknown"}
                      </td>
                    )}
                    <td className="px-4 py-3 md:px-6 md:py-4 text-sm max-w-[200px] truncate" title={eoi.project?.title}>
                      {eoi.project?.title || "Project Title"}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <div className="flex items-center gap-2 justify-between">
                        <Badge
                          variant="outline"
                          className={`text-xs whitespace-nowrap px-3 py-2 rounded-md ${getStatusColor(eoi.status)}`}
                        >
                          {formatStatus(eoi.status)}
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
                            {userRole === "admin" && (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openConfirmationDialog("approve", eoi)
                                  }}
                                  disabled={eoi.status === "withdrawn" || eoi.status === "approved"}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Accept
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openConfirmationDialog("reject", eoi)
                                  }}
                                  disabled={eoi.status === "withdrawn" || eoi.status === "rejected" || eoi.status === "approved"}
                                  className="text-[#C13C3D]"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                                {/* <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openConfirmationDialog("markAsPaid", eoi)
                                  }}
                                  disabled={eoi.payment_status === "paid" || eoi.status === "withdrawn"}
                                >
                                  <Wallet className="mr-2 h-4 w-4" />
                                  Mark as Paid
                                </DropdownMenuItem> */}
                              </>
                            )}
                            {userRole === "partner" && (
                              <>
                                {(eoi.status === "rejected" || eoi.status === "withdrawn") && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const projectId = eoi.project?.id || eoi.project_id
                                      router.push(`/projects/${projectId}/express-interest?resubmit=${eoi.id}`)
                                    }}
                                  >
                                    {eoi.status === "withdrawn" ? "Express Interest Again" : "Resubmit EOI"}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openConfirmationDialog("withdraw", eoi)
                                  }}
                                  disabled={!canWithdraw(eoi)}
                                >
                                {checkingProposals[eoi.id] ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Checking...
                                  </>
                                ) : (
                                  "Withdraw"
                                )}
                                {!canWithdraw(eoi) && proposalsMap[eoi.id] && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    Proposal exists
                                  </span>
                                )}
                              </DropdownMenuItem>
                            </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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