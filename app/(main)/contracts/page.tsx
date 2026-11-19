"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react'
import { contractsAPI, type Contract, type PartnerContract } from "@/lib/api/contracts"
import { getCurrentUser } from "@/lib/user"
import { toast } from "sonner"
import EmptyState from "@/components/empty-states/empty-project"

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState<(Contract | PartnerContract)[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [goToPage, setGoToPage] = useState("")
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const userRole = currentUser?.role || "partner"

  const pageSize = 10

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true)
      try {
        const params: {
          limit: number;
          offset: number;
          search?: string;
        } = {
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
        }

        if (searchQuery) params.search = searchQuery

        const response =
          userRole === "admin" ? await contractsAPI.list(params) : await contractsAPI.partnerList(params)

        if (response.success && response.data) {
          setContracts(response.data.results)
          setTotalCount(response.data.count)
        } else {
          throw new Error("Failed to fetch contracts")
        }
      } catch (error) {
        console.error("Error fetching contracts:", error)
        toast.error("Failed to load contracts")
      } finally {
        setLoading(false)
      }
    }

    fetchContracts()
  }, [currentPage, searchQuery, userRole])

  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "text-blue-600 bg-blue-50 border-blue-200"
      case "Active":
      case "Approved":
        return "text-green-600 bg-green-50 border-green-200"
      case "Completed":
        return "text-gray-600 bg-gray-50 border-gray-200"
      case "Monitoring":
        return "text-indigo-600 bg-indigo-50 border-indigo-200"
      case "Terminated":
      case "Rejected":
        return "text-red-600 bg-red-50 border-red-200"
      case "Suspended":
      case "Pending":
        return "text-orange-600 bg-orange-50 border-orange-200"
      case "Under Review":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "Awaiting Signature":
        return "text-purple-600 bg-purple-50 border-purple-200"
      default:
        return ""
    }
  }

  // Maps raw backend status to a human-readable display label
  const getDisplayLabel = (rawStatus: string): string => {
    const awaitingSignatureStatuses = ["active", "pending_signature", "Active", "Pending Signature"]
    if (awaitingSignatureStatuses.includes(rawStatus)) return "Awaiting Signature"
    return rawStatus
  }

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

  const filteredContracts = contracts.filter(
    (contract) =>
      contract.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.partner_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
          className={`h-8 w-8 ${i === currentPage ? "bg-[#EED8D8] text-[#C13C3D] border-[#C13C3D] hover:bg-[#EED8D8]" : "hover:bg-gray-100"
            }`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      )
    }

    return buttons
  }

  const formatStatus = (status: string | undefined) => {
    if (!status) return "Unknown"
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Contracts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track all project contracts.</p>
        </div>
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by contract ID, project, or partner"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button variant="outline" size="sm" className="gap-2 bg-transparent w-full sm:w-auto">
          <Filter className="h-4 w-4" />
          Filter
          <ChevronDown className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Sort by:</span>
          <Select defaultValue="newest">
            <SelectTrigger className="w-full sm:w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest - Oldest</SelectItem>
              <SelectItem value="oldest">Oldest - Newest</SelectItem>
              <SelectItem value="value-high">Value: High - Low</SelectItem>
              <SelectItem value="value-low">Value: Low - High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <EmptyState
                title={userRole === "admin" ? "No contracts available" : "No contracts yet"}
                description={
                  userRole === "admin"
                    ? "Contracts generated for accepted proposals will be listed here once created."
                    : "Your proposal is currently under review. A contract will appear here once your proposal is accepted and a contract has been generated by the OYNTCDA team."
                }
                iconSrc="/icons/empty-proposal.svg"
              />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Contract ID
                  </th>
                  <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Project Title
                  </th>
                  {userRole === "admin" && (
                    <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Partner
                    </th>
                  )}
                  <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Contract Value
                  </th>
                  <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredContracts.map((contract) => {
                  const isPartnerContract = 'contract_status' in contract
                  const rawStatus = isPartnerContract ? formatStatus(contract.contract_status) : formatStatus(contract.status)
                  const displayStatus = getDisplayLabel(rawStatus)

                  return (
                    <tr
                      key={contract.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (userRole === "admin") {
                          if (rawStatus === "draft" && contract.proposal_id) {
                            // Draft contracts: redirect to generate-contract page to finish editing
                            router.push(`/proposals/${contract.proposal_id}/generate-contract`)
                          } else {
                            // All other statuses: view contract details
                            router.push(`/contracts/${contract.id}`)
                          }
                        } else {
                          router.push(`/contracts/${contract.id}`)
                        }
                      }}
                    >
                      <td className="px-4 py-3 md:px-6 md:py-4 text-sm font-medium whitespace-nowrap">
                        {contract.reference_number || "N/A"}
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4 text-sm max-w-[200px] truncate" title={contract.title}>
                        {contract.title}
                      </td>
                      {userRole === "admin" && (
                        <td className="px-4 py-3 md:px-6 md:py-4 text-sm whitespace-nowrap">
                          {"partner_name" in contract ? contract.partner_name : "N/A"}
                        </td>
                      )}
                      <td className="px-4 py-3 md:px-6 md:py-4 text-sm whitespace-nowrap">
                        ₦{parseFloat(contract.estimated_project_cost).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4 text-sm whitespace-nowrap">
                        {new Date(contract.commences_on).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4 text-sm whitespace-nowrap">
                        {new Date(contract.ends_on).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        <Badge
                          variant="outline"
                          className={`text-xs whitespace-nowrap px-3 py-2 rounded-md ${getStatusColor(displayStatus)}`}
                        >
                          {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            Showing {startItem}-{endItem} of {totalCount}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-1 w-full sm:w-auto justify-center">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 bg-[#F6F6F6] border-[#EEEEEF]"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
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

              <div className="sm:hidden text-sm font-medium px-2">
                Page {currentPage} of {totalPages}
              </div>

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
              </Button>
            </div>

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
      </div>
    </div>
  )
}
