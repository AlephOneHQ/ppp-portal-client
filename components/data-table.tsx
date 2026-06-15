"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  File,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  Archive,
  ArchiveRestore,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { projectAPI } from "@/lib/api/projects"
import type { UserRole } from "@/lib/user"
import EmptyState from "./empty-states/empty-project"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { notificationAPI } from "@/lib/api/notifications"
import { ConfirmDialog, useConfirmDialog } from "@/components/confirm-dialog"
import { ContentDisplay } from "@/components/ui/content-display"
import { convertToPlainText } from "@/lib/utils/html-sanitizer"

export interface Project {
  id: string
  title: string
  description: string
  executive_summary: string
  imageUrl?: string
  metadata: {
    sector?: string
    budget?: string
    timeline?: string
    label?: string
  }[]
  submission_fee?: string
  createdBy: string
  contractedTo?: string
  status:
  | "Published"
  | "Draft"
  | "Contracted"
  | "Monitoring"
  | "Overdue"
  | "Closed Out"
  | "Archived"
  | "published"
  | "draft"
  | "contracted"
  | "monitoring"
  | "closed_out"
  | "overdue"
  | "archived"
  authorizing_sector?: {
    id: string
    name: string
  }
  estimated_cost?: string
  proposed_start_date?: string
  estimated_completion_date?: string
  eoi_start_date?: string
  eoi_end_date?: string
  gallery_images?: Array<{
    id: string
    file_url: string
    file_name: string
    order?: number
  }>
  created_by?: {
    id: string
    email: string
  }
  contract?: {
    id: string
    partner: {
      id: string
      business_name: string
    }
  }
}

interface DataTableProps {
  projects: Project[]
  totalCount?: number
  currentPage?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  userRole: UserRole
  loading?: boolean
  onProjectDeleted?: () => void
}

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
      return "Draft" // Default fallback value
  }
}

export function DataTable({
  projects,
  totalCount = projects.length,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  userRole,
  loading = false,
  onProjectDeleted,
}: DataTableProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [archiveLoadingId, setArchiveLoadingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const deleteDialog = useConfirmDialog()
  const archiveDialog = useConfirmDialog()
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [projectToArchive, setProjectToArchive] = useState<{
    project: Project
    isCurrentlyArchived: boolean
  } | null>(null)

  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange?.(page)
    }
  }

  const handleGoToPage = () => {
    const page = Number.parseInt(searchQuery)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page)
      setSearchQuery("")
    }
  }

  const handleDelete = async () => {
    if (!projectToDelete) return

    setDeletingId(projectToDelete.id)
    deleteDialog.setIsLoading(true)

    try {
      const result = await projectAPI.delete(projectToDelete.id)

      if (result.success) {
        toast.success("Project deleted successfully")

        try {
          await notificationAPI.create({
            title: "Project Deleted",
            message: `Project "${projectToDelete.title}" has been deleted.`,
            notification_type: "PROJECT_DELETED",
            related_object_type: "project",
            related_object_id: projectToDelete.id,
          })
        } catch (error) {
          console.error("Failed to create notification:", error)
        }

        deleteDialog.closeDialog()
        setProjectToDelete(null)
        onProjectDeleted?.()
      } else {
        toast.error(`Failed to delete project: ${result.message}`)
      }
    } catch (error) {
      toast.error("Error deleting project")
      console.error(error)
    } finally {
      setDeletingId(null)
      deleteDialog.setIsLoading(false)
    }
  }

  const handleArchiveToggle = async () => {
    if (!projectToArchive) return

    const { project, isCurrentlyArchived } = projectToArchive
    setArchiveLoadingId(project.id)
    archiveDialog.setIsLoading(true)

    try {
      const result = isCurrentlyArchived ? await projectAPI.unarchive(project.id) : await projectAPI.archive(project.id)

      if (result.success) {
        toast.success(isCurrentlyArchived ? "Project unarchived successfully" : "Project archived successfully")

        try {
          const isArchived = !isCurrentlyArchived
          if (isArchived) {
            await notificationAPI.create({
              title: "Project Archived",
              message: `Project "${project.title}" has been archived.`,
              notification_type: "PROJECT_ARCHIVED",
              related_object_type: "project",
              related_object_id: project.id,
            })
          } else {
            await notificationAPI.create({
              title: "Project Status Changed",
              message: `Project "${project.title}" has been unarchived.`,
              notification_type: "PROJECT_STATUS_CHANGED",
              related_object_type: "project",
              related_object_id: project.id,
            })
          }
        } catch (error) {
          console.error("Failed to create notification:", error)
        }

        archiveDialog.closeDialog()
        setProjectToArchive(null)
        onProjectDeleted?.()
      } else {
        toast.error(`Failed to ${isCurrentlyArchived ? "unarchive" : "archive"} project: ${result.message}`)
      }
    } catch (error) {
      toast.error(`Error ${isCurrentlyArchived ? "unarchiving" : "archiving"} project`)
      console.error(error)
    } finally {
      setArchiveLoadingId(null)
      archiveDialog.setIsLoading(false)
    }
  }

  const getStatusColor = (status: Project["status"]) => {
    const normalizedStatus = status.toLowerCase()
    switch (normalizedStatus) {
      case "published":
        return "bg-blue-50 text-blue-600 border-blue-200"
      case "draft":
        return "bg-gray-50 text-gray-600 border-gray-200"
      case "contracted":
        return "bg-purple-50 text-purple-600 border-purple-200"
      case "monitoring":
        return "bg-yellow-50 text-yellow-600 border-yellow-200"
      case "overdue":
        return "bg-red-50 text-red-600 border-red-200"
      case "closed_out":
        return "bg-green-50 text-green-600 border-green-200"
      case "archived":
        return "bg-gray-100 text-gray-700 border-gray-300"
      default:
        return "bg-gray-50 text-gray-600 border-gray-200"
    }
  }

  const formatStatus = (status: string) => {
    // "contracted" means a contract has been assigned — display as "Assigned"
    if (status.toLowerCase() === "contracted") return "Assigned"
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const formatCurrency = (amount: string) => {
    const numericAmount = Number.parseFloat(amount)
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericAmount)
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    const startFormatted = start.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })
    const endFormatted = end.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })

    return `${startFormatted} - ${endFormatted}`
  }

  const getProjectImage = (project: Project) => {
    if (project.gallery_images && project.gallery_images.length > 0) {
      return project.gallery_images[0].file_url
    }
    return project.imageUrl
  }

  const getProjectMetadata = (project: Project) => {
    const metadata = []

    if (project.authorizing_sector) {
      metadata.push({ sector: project.authorizing_sector.name })
    }

    if (project.estimated_cost) {
      metadata.push({ budget: formatCurrency(project.estimated_cost) })
    }

    if (project.proposed_start_date && project.estimated_completion_date) {
      metadata.push({
        timeline: formatDateRange(project.proposed_start_date, project.estimated_completion_date),
      })
    }

    return metadata.length > 0 ? metadata : project.metadata
  }

  const renderPaginationButtons = () => {
    const buttons = []
    const maxVisible = 5

    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    const endPage = Math.min(totalPages, startPage + maxVisible - 1)

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="icon"
          className={`h-8 w-8 ${i === currentPage ? "bg-[#EED8D8] text-[#C13C3D] border-[#C13C3D] hover:bg-[#EED8D8]" : "hover:bg-gray-100"}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>,
      )
    }

    if (startPage > 1) {
      buttons.unshift(
        <span key="ellipsis-start" className="px-2 text-muted-foreground">
          ...
        </span>,
      )
    }

    if (endPage < totalPages) {
      buttons.push(
        <span key="ellipsis-end" className="px-2 text-muted-foreground">
          ...
        </span>,
      )
    }

    return buttons
  }

  const gridCols = userRole === "partner" ? "md:grid-cols-[2.5fr_1.5fr_0.5fr]" : "md:grid-cols-[2.5fr_1.5fr_0.5fr]"
  const headerGridCols =
    userRole === "partner" ? "md:grid-cols-[2.5fr_1.5fr_0.5fr]" : "md:grid-cols-[2.5fr_1.5fr_0.5fr]"

  if (loading) {
    return (
      <div className="w-full space-y-4 border rounded-lg">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C13C3D] mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">
            <Spinner className="size-6" /> Loading projects...
          </p>
        </div>
      </div>
    )
  }

  return (
    <section className="flex flex-1 flex-col gap-4">
      <div className="w-full space-y-4 border rounded-lg">
        <div
          className={`hidden md:grid ${headerGridCols} gap-4 px-6 py-3 bg-muted/30 border-b text-sm font-medium text-muted-foreground`}
        >
          <div>PROJECT SUMMARY</div>
          {userRole === "admin" && <div>PERSONNEL</div>}
          {userRole === "partner" ? (
            <div className="flex items-center justify-between md:justify-end gap-3">EXPRESSION OF INTEREST</div>
          ) : (
            <div>STATUS</div>
          )}
        </div>

        <div className="space-y-4">
          {projects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <EmptyState
                title="Nothing to see yet"
                description="Create your first project to begin receiving 
                Expressions of Interest (EOIs) from partners."
              />
            </div>
          ) : (
            projects.map((project) => {
              const projectMetadata = getProjectMetadata(project)
              const projectImage = getProjectImage(project)
              const displayDescription = project.executive_summary || project.description
              const displayCreatedBy = project.created_by?.email || project.createdBy
              const displaySubmissionFee = project.submission_fee || 0
              const isArchived = project.status.toLowerCase() === "archived"
              const contractedToName = project.contract && project.contract.partner
                ? project.contract.partner.business_name
                : undefined

              return (
                <div
                  key={project.id}
                  className="border-b p-4 md:p-6 bg-card"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <div className={`grid grid-cols-1 ${gridCols} gap-4 md:gap-6`}>
                    <div
                      className="flex gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-md overflow-hidden">
                          {projectImage ? (
                            <img
                              src={projectImage || "/placeholder.svg"}
                              alt={project.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = "none"
                                target.nextElementSibling?.classList.remove("hidden")
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-full h-full bg-gray-200 flex items-center justify-center ${projectImage ? "hidden" : ""}`}
                          >
                            <span className="text-xs text-gray-500">No image</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2">{project.title}</h3>
                        <div className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3 line-clamp-2">
                          {convertToPlainText(displayDescription)}
                        </div>
                        <div className="flex flex-wrap gap-1 md:gap-2">
                          {projectMetadata.map((item, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="flex bg-background text-xs font-normal flex-wrap"
                            >
                              {item.sector || item.budget || item.timeline || item.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {userRole === "admin" && (
                      <div className="grid grid-cols-2 gap-4 md:block md:space-y-3 text-sm">
                        <div>
                          <div className="text-muted-foreground text-xs md:mb-1">Created by</div>
                          <div className="font-medium text-sm">{displayCreatedBy}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs md:mb-1">Contracted to</div>
                          <div className="font-medium text-sm">{contractedToName || "–"}</div>
                        </div>
                      </div>
                    )}

                    {userRole === "partner" ? (
                      <div className="flex items-center justify-between md:justify-end gap-3">
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="text-muted-foreground text-xs">Timeline</div>
                          <div className="font-medium">
                            {projectMetadata.find((m) => m.timeline)?.timeline || "TBD"}
                          </div>
                          <div className="text-muted-foreground text-xs mt-1">Submission Fee</div>
                          <div className="font-medium">{formatCurrency(displaySubmissionFee.toString())}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(project.status)} text-xs font-medium px-3 py-2 rounded-md`}
                        >
                          {formatStatus(project.status)}
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
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/projects/${project.id}`)
                              }}
                            >
                              <File className="mx-1" /> View details
                            </DropdownMenuItem>
                            {isArchived ? (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setProjectToArchive({ project, isCurrentlyArchived: true })
                                  archiveDialog.openDialog()
                                }}
                                disabled={archiveLoadingId === project.id}
                              >
                                <ArchiveRestore className="mr-2 h-4 w-4" />
                                {archiveLoadingId === project.id ? "Unarchiving..." : "Unarchive"}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setProjectToArchive({ project, isCurrentlyArchived: false })
                                  archiveDialog.openDialog()
                                }}
                                disabled={archiveLoadingId === project.id}
                              >
                                <Archive className="mr-2 h-4 w-4" />
                                {archiveLoadingId === project.id ? "Archiving..." : "Archive"}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setProjectToDelete(project)
                                deleteDialog.openDialog()
                              }}
                              className="text-[#C13C3D]"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {projects.length > 0 && (
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
                  <span className="sr-only">Last page</span>
                </Button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:block">Go to page:</span>
                <span className="text-sm text-muted-foreground whitespace-nowrap sm:hidden">Page:</span>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.closeDialog}
        title="Delete Project?"
        description="Are you sure you want to delete this project? This action cannot be undone and all related data, including submissions, will be permanently removed."
        confirmText="Delete Project"
        onConfirm={handleDelete}
        isLoading={deleteDialog.isLoading || deletingId !== null}
        variant="destructive"
      />

      <ConfirmDialog
        open={archiveDialog.open}
        onOpenChange={archiveDialog.closeDialog}
        title={projectToArchive?.isCurrentlyArchived ? "Unarchive Project?" : "Archive Project?"}
        description={
          projectToArchive?.isCurrentlyArchived
            ? `Are you sure you want to unarchive "${projectToArchive?.project.title}"? It will be visible in the active projects list.`
            : `Are you sure you want to archive "${projectToArchive?.project.title}"? Archived projects can be restored later.`
        }
        confirmText={projectToArchive?.isCurrentlyArchived ? "Unarchive" : "Archive"}
        onConfirm={handleArchiveToggle}
        isLoading={
          archiveDialog.isLoading || (projectToArchive ? archiveLoadingId === projectToArchive.project.id : false)
        }
        variant="warning"
      />
    </section>
  )
}
