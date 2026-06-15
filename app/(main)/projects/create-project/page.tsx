/* eslint-disable @next/next/no-img-element */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, TrashIcon, Upload, Loader2, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { ProjectPreview } from "@/components/projects/project-preview"
import { projectAPI } from "@/lib/api/projects"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { notificationAPI } from "@/lib/api/notifications"
import { formatCurrencyInput, handleCurrencyChange } from "@/lib/utils/formatting"
import type { CreateProjectData, AuthorizingSector } from "@/types/projects"
import { formStorage } from "@/lib/storage/formPersistence"
import { cloudinaryAPI } from "@/lib/cloudinary"
import { ConfirmDialog, useConfirmDialog } from "@/components/confirm-dialog"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { sanitizeHTML } from "@/lib/utils/html-sanitizer"

// Define the form data interface that matches our form state
interface ProjectFormData {
  title: string
  executiveSummary: string
  description: string
  authorisingSector: string
  estimatedCost: string | ""
  proposedStartDate: Date | undefined
  estimatedCompletionDate: Date | undefined
  submissionRequirements: string
  eoiStartDate: Date | undefined
  eoiEndDate: Date | undefined
  submissionFee: string | ""
  lawsAndRegulations: string
  galleryFiles: (File | null)[]
  galleryPreviews: string[]
}

interface ValidationErrors {
  title?: string
  executiveSummary?: string
  description?: string
  authorisingSector?: string
  estimatedCost?: string
  proposedStartDate?: string
  estimatedCompletionDate?: string
  eoiStartDate?: string
  eoiEndDate?: string
  lawsAndRegulations?: string
  galleryFiles?: string
}

interface SavedProject {
  id: string
  data: Omit<ProjectFormData, "galleryFiles"> & {
    galleryFiles: string[] // Store base64 strings instead of File objects
  }
  status: "draft"
  createdAt: string
  updatedAt: string
}

const FORM_STORAGE_KEY = "create-project-draft"
const SAVED_PROJECTS_KEY = "saved-projects"

// Helper functions for localStorage management
const projectStorage = {
  // Save a project with ID
  saveProject: (project: SavedProject): void => {
    try {
      const existingProjects = projectStorage.getProjects()
      const existingIndex = existingProjects.findIndex((p) => p.id === project.id)

      if (existingIndex >= 0) {
        existingProjects[existingIndex] = project
      } else {
        existingProjects.push(project)
      }

      localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(existingProjects))
    } catch (error) {
      console.error("Error saving project to localStorage:", error)
      toast.error("Failed to save project draft")
    }
  },

  // Get all saved projects
  getProjects: (): SavedProject[] => {
    try {
      const stored = localStorage.getItem(SAVED_PROJECTS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("Error reading projects from localStorage:", error)
      return []
    }
  },

  // Get a specific project by ID
  getProject: (id: string): SavedProject | null => {
    const projects = projectStorage.getProjects()
    return projects.find((p) => p.id === id) || null
  },

  // Delete a project by ID
  deleteProject: (id: string): void => {
    try {
      const projects = projectStorage.getProjects()
      const filteredProjects = projects.filter((p) => p.id !== id)
      localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(filteredProjects))
    } catch (error) {
      console.error("Error deleting project from localStorage:", error)
      toast.error("Failed to delete project draft")
    }
  },

  // Convert files to base64 for storage
  fileToBase64: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  },

  // Convert base64 back to file
  base64ToFile: (base64: string, filename: string): File => {
    const arr = base64.split(",")
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }

    return new File([u8arr], filename, { type: mime })
  },
}

// Component to display and load saved projects
interface SavedProjectsListProps {
  onProjectSelect: (projectId: string) => void
  currentProjectId: string | null
}

function SavedProjectsList({ onProjectSelect, currentProjectId }: SavedProjectsListProps) {
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const deleteDialog = useConfirmDialog()
  const [projectToDelete, setProjectToDelete] = useState<SavedProject | null>(null)

  useEffect(() => {
    const projects = projectStorage.getProjects()
    setSavedProjects(projects)
    setIsLoading(false)
  }, [])

  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    deleteDialog.setIsLoading(true)
    try {
      projectStorage.deleteProject(projectToDelete.id)
      setSavedProjects(projectStorage.getProjects())
      toast.success("Draft deleted successfully")
      deleteDialog.closeDialog()
      setProjectToDelete(null)
    } finally {
      deleteDialog.setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading drafts...</div>
  }

  if (savedProjects.length === 0) {
    return <div className="text-sm text-muted-foreground">No saved drafts found.</div>
  }

  return (
    <>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {savedProjects.map((project) => (
          <div
            key={project.id}
            className={cn(
              "flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
              currentProjectId === project.id ? "border-primary bg-primary/5" : "border-border",
            )}
            onClick={() => onProjectSelect(project.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{project.data.title || "Untitled Project"}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Draft</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Updated: {format(new Date(project.updatedAt), "MMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setProjectToDelete(project)
                deleteDialog.openDialog()
              }}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.closeDialog}
        title="Delete Draft"
        description="Are you sure you want to delete this project draft? This action cannot be undone and all unsaved progress will be lost."
        confirmText="Delete Draft"
        onConfirm={handleDeleteProject}
        isLoading={deleteDialog.isLoading}
        variant="destructive"
      />
    </>
  )
}

export default function Page() {
  const router = useRouter()
  const [projectData, setProjectData] = useState<ProjectFormData>({
    title: "",
    executiveSummary: "",
    description: "",
    authorisingSector: "",
    estimatedCost: "",
    proposedStartDate: undefined,
    estimatedCompletionDate: undefined,
    submissionRequirements: "",
    eoiStartDate: undefined,
    eoiEndDate: undefined,
    submissionFee: "",
    lawsAndRegulations: "",
    galleryFiles: Array(5).fill(null),
    galleryPreviews: Array(5).fill(""),
  })

  const [previewData, setPreviewData] = useState<ProjectFormData>(projectData)
  const [authorizingSectors, setAuthorizingSectors] = useState<AuthorizingSector[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSectors, setIsLoadingSectors] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [otherSectorName, setOtherSectorName] = useState("")

  const isOthersSector = authorizingSectors.find(s => s.id === projectData.authorisingSector)?.name === "Others"

  // Generate a unique ID for new projects
  const generateProjectId = (): string => {
    return `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Mock authorizing sectors - replace with actual API call
  useEffect(() => {
    const fetchAuthorizingSectors = async () => {
      setIsLoadingSectors(true)
      try {
        const response = await projectAPI.getAuthorizingSectors()
        const sectors = response.data

        // Add null/undefined check
        if (!sectors) {
          console.warn("No sectors data received")
          setAuthorizingSectors([])
          return
        }

        const sectorsData: AuthorizingSector[] = sectors
        setAuthorizingSectors(sectorsData)
      } catch (error) {
        toast.error("Failed to load authorizing sectors")
        console.error("Error fetching sectors:", error)
        setAuthorizingSectors([])
      } finally {
        setIsLoadingSectors(false)
      }
    }

    fetchAuthorizingSectors()
  }, [])

  // Load saved draft on component mount
  useEffect(() => {
    const savedData = formStorage.load<ProjectFormData>(FORM_STORAGE_KEY)
    if (savedData) {
      // Convert date strings back to Date objects
      const restoredData = {
        ...savedData,
        proposedStartDate: savedData.proposedStartDate ? new Date(savedData.proposedStartDate) : undefined,
        estimatedCompletionDate: savedData.estimatedCompletionDate
          ? new Date(savedData.estimatedCompletionDate)
          : undefined,
        eoiStartDate: savedData.eoiStartDate ? new Date(savedData.eoiStartDate) : undefined,
        eoiEndDate: savedData.eoiEndDate ? new Date(savedData.eoiEndDate) : undefined,
        galleryFiles: Array(5).fill(null),
        galleryPreviews: savedData.galleryPreviews || Array(5).fill(""),
      }
      setProjectData(restoredData)
      toast.success("Previous draft restored")
    }
  }, [])

  // Auto-save to form storage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (projectData.title || projectData.description || projectData.executiveSummary) {
        formStorage.save(FORM_STORAGE_KEY, projectData)
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [projectData])

  // Update preview every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPreviewData(projectData)
    }, 5000)

    return () => clearInterval(interval)
  }, [projectData])

  // Clean up object URLs
  useEffect(() => {
    return () => {
      projectData.galleryPreviews.forEach((preview) => {
        if (preview && preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview)
        }
      })
    }
  }, [projectData.galleryPreviews])

  const updateField = <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => {
    setProjectData((prev) => ({ ...prev, [field]: value }))
    // Clear validation error for this field when user starts typing
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }))
    }
  }

  const handleFileUpload = async (files: FileList | null, index: number) => {
    if (files && files[0]) {
      const file = files[0]

      // Create preview URL
      const previewUrl = URL.createObjectURL(file)

      setProjectData((prev) => {
        const newFiles = [...prev.galleryFiles]
        const newPreviews = [...prev.galleryPreviews]

        // Clean up previous preview URL if it exists
        if (newPreviews[index] && newPreviews[index].startsWith("blob:")) {
          URL.revokeObjectURL(newPreviews[index])
        }

        newFiles[index] = file
        newPreviews[index] = previewUrl

        return {
          ...prev,
          galleryFiles: newFiles,
          galleryPreviews: newPreviews,
        }
      })

      // Clear gallery validation error when user uploads a file
      if (validationErrors.galleryFiles) {
        setValidationErrors((prev) => ({
          ...prev,
          galleryFiles: undefined,
        }))
      }
    }
  }

  const handleDeleteFile = (index: number) => {
    setProjectData((prev) => {
      const newFiles = [...prev.galleryFiles]
      const newPreviews = [...prev.galleryPreviews]

      // Clean up preview URL
      if (newPreviews[index] && newPreviews[index].startsWith("blob:")) {
        URL.revokeObjectURL(newPreviews[index])
      }

      newFiles[index] = null
      newPreviews[index] = ""

      return {
        ...prev,
        galleryFiles: newFiles,
        galleryPreviews: newPreviews,
      }
    })
  }

  // Format date to YYYY-MM-DD
  const formatDate = (date: Date | undefined): string => {
    if (!date) return ""
    return format(date, "yyyy-MM-dd")
  }

  // Format datetime to ISO string with timezone
  const formatDateTime = (date: Date | undefined): string => {
    if (!date) return ""
    const newDate = new Date(date)
    // Set to end of day for EOI end date
    if (projectData.eoiEndDate && date.getTime() === projectData.eoiEndDate.getTime()) {
      newDate.setHours(23, 59, 59, 999)
    }
    return newDate.toISOString()
  }

  // Update the estimated cost field (now optional)
  const handleEstimatedCostChange = (value: string) => {
    handleCurrencyChange(value, (cleanValue) => {
      updateField("estimatedCost", cleanValue)
    })
  }

  // Format currency for display (with commas)
  const displayEstimatedCost = formatCurrencyInput(projectData.estimatedCost)

  const handleSubmissionFeeChange = (value: string) => {
    handleCurrencyChange(value, (cleanValue) => {
      updateField("submissionFee", cleanValue)
    })
  }

  const displaySubmissionFee = formatCurrencyInput(projectData.submissionFee)

  // Validation function (updated - estimated cost is now optional)
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {}

    if (!projectData.title.trim()) {
      errors.title = "Project title is required"
    }

    if (!projectData.executiveSummary.trim()) {
      errors.executiveSummary = "Executive summary is required"
    }

    if (!projectData.description.trim()) {
      errors.description = "Project description is required"
    }

    if (!projectData.authorisingSector) {
      errors.authorisingSector = "Authorizing sector is required"
    } else if (isOthersSector && !otherSectorName.trim()) {
      errors.authorisingSector = "Please specify the ministry name"
    }

    // Estimated cost validation removed - now optional

    if (!projectData.proposedStartDate) {
      errors.proposedStartDate = "Proposed start date is required"
    }

    if (!projectData.estimatedCompletionDate) {
      errors.estimatedCompletionDate = "Estimated completion date is required"
    }

    if (!projectData.eoiStartDate) {
      errors.eoiStartDate = "EOI start date is required"
    }

    if (!projectData.eoiEndDate) {
      errors.eoiEndDate = "EOI end date is required"
    }

    if (!projectData.lawsAndRegulations.trim()) {
      errors.lawsAndRegulations = "Laws and regulations are required"
    }

    // Date logic validation
    if (
      projectData.estimatedCompletionDate &&
      projectData.proposedStartDate &&
      projectData.estimatedCompletionDate <= projectData.proposedStartDate
    ) {
      errors.estimatedCompletionDate = "Completion date must be after start date"
    }

    if (projectData.eoiEndDate && projectData.eoiStartDate && projectData.eoiEndDate <= projectData.eoiStartDate) {
      errors.eoiEndDate = "EOI end date must be after start date"
    }

    if (
      projectData.eoiStartDate &&
      projectData.proposedStartDate &&
      projectData.eoiStartDate > projectData.proposedStartDate
    ) {
      errors.eoiStartDate = "EOI start date cannot be after the proposed start date"
    }

    if (
      projectData.eoiEndDate &&
      projectData.proposedStartDate &&
      projectData.eoiEndDate > projectData.proposedStartDate
    ) {
      errors.eoiEndDate = "EOI end date cannot be after the proposed start date"
    }

    // Check if at least one gallery file is uploaded
    const hasGalleryFiles = projectData.galleryFiles.some((file) => file !== null)
    if (!hasGalleryFiles) {
      errors.galleryFiles = "At least one gallery image is required"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Function to show validation errors using toast
  const showValidationErrors = (errors: ValidationErrors) => {
    const errorMessages = Object.values(errors)
    if (errorMessages.length > 0) {
      toast.error("Please fix the following errors:", {
        description: (
          <ul className="list-disc list-inside">
            {errorMessages.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        ),
        duration: 8000,
      })
    }
  }

  const handleSaveDraft = async () => {
    await saveProjectToLocalStorage("draft")
  }

  const saveProjectToLocalStorage = async (status: "draft") => {
    setIsSubmitting(true)

    try {
      // Convert files to base64 for storage
      const galleryFilesBase64: string[] = []

      for (const file of projectData.galleryFiles) {
        if (file !== null) {
          try {
            const base64 = await projectStorage.fileToBase64(file)
            galleryFilesBase64.push(base64)
          } catch (error) {
            console.error("Error converting file to base64:", error)
            toast.error(`Failed to process ${file.name}`)
            return
          }
        } else {
          galleryFilesBase64.push("")
        }
      }

      // Prepare project data for storage
      const projectId = currentProjectId || generateProjectId()
      const now = new Date().toISOString()

      const projectToSave: SavedProject = {
        id: projectId,
        data: {
          title: projectData.title,
          executiveSummary: projectData.executiveSummary,
          description: projectData.description,
          authorisingSector: projectData.authorisingSector,
          estimatedCost: projectData.estimatedCost,
          proposedStartDate: projectData.proposedStartDate,
          estimatedCompletionDate: projectData.estimatedCompletionDate,
          submissionRequirements: projectData.submissionRequirements,
          eoiStartDate: projectData.eoiStartDate,
          eoiEndDate: projectData.eoiEndDate,
          submissionFee: projectData.submissionFee,
          lawsAndRegulations: projectData.lawsAndRegulations,
          galleryPreviews: projectData.galleryPreviews,
          galleryFiles: galleryFilesBase64,
        },
        status,
        createdAt: currentProjectId ? projectStorage.getProject(projectId)?.createdAt || now : now,
        updatedAt: now,
      }

      // Save the project
      projectStorage.saveProject(projectToSave)

      // Update current project ID if it's new
      if (!currentProjectId) {
        setCurrentProjectId(projectId)
      }

      formStorage.remove(FORM_STORAGE_KEY)
      toast.success("Project saved as draft successfully!")
      router.push("/projects")
    } catch (error) {
      console.error("Error saving project to localStorage:", error)
      toast.error("Failed to save project draft")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Function to load a specific project by ID
  const loadProjectFromStorage = async (projectId: string) => {
    const project = projectStorage.getProject(projectId)
    if (!project) {
      toast.error("Project not found")
      return
    }

    // Handle backward compatibility: convert plain text to rich text structure
    const convertToRichText = (text: string): string => {
      if (!text || text.startsWith('<')) {
        return text // Already HTML
      }

      // Convert plain text to HTML paragraphs
      return text
        .split('\n\n')
        .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
        .join('')
    }

    // Clean up existing preview URLs
    projectData.galleryPreviews.forEach((preview) => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview)
      }
    })

    // Convert base64 back to files and create previews
    const galleryFiles: (File | null)[] = []
    const galleryPreviews: string[] = []

    for (let i = 0; i < project.data.galleryFiles.length; i++) {
      const base64 = project.data.galleryFiles[i]
      if (base64) {
        try {
          const file = projectStorage.base64ToFile(base64, `gallery-image-${i}`)
          galleryFiles[i] = file
          galleryPreviews[i] = URL.createObjectURL(file)
        } catch (error) {
          console.error("Error converting base64 to file:", error)
          galleryFiles[i] = null
          galleryPreviews[i] = project.data.galleryPreviews[i] || ""
        }
      } else {
        galleryFiles[i] = null
        galleryPreviews[i] = project.data.galleryPreviews[i] || ""
      }
    }

    // Update project data with backward compatibility
    const loadedProjectData: ProjectFormData = {
      title: project.data.title,
      executiveSummary: convertToRichText(project.data.executiveSummary),
      description: convertToRichText(project.data.description),
      authorisingSector: project.data.authorisingSector,
      estimatedCost: project.data.estimatedCost,
      proposedStartDate: project.data.proposedStartDate ? new Date(project.data.proposedStartDate) : undefined,
      estimatedCompletionDate: project.data.estimatedCompletionDate
        ? new Date(project.data.estimatedCompletionDate)
        : undefined,
      submissionRequirements: convertToRichText(project.data.submissionRequirements),
      eoiStartDate: project.data.eoiStartDate ? new Date(project.data.eoiStartDate) : undefined,
      eoiEndDate: project.data.eoiEndDate ? new Date(project.data.eoiEndDate) : undefined,
      submissionFee: (project.data as typeof project.data & { submissionFee?: string }).submissionFee || "",
      lawsAndRegulations: convertToRichText(project.data.lawsAndRegulations),
      galleryFiles,
      galleryPreviews,
    }

    setProjectData(loadedProjectData)
    setCurrentProjectId(projectId)
    toast.success("Project loaded successfully!")
  }

  const handlePublish = async () => {
    // Validate form before publishing
    if (!validateForm()) {
      showValidationErrors(validationErrors)
      return
    }
    await submitProject("published")
  }

  const submitProject = async (status: "draft" | "published") => {
    setIsSubmitting(true)

    try {
      // Upload gallery images
      const uploadedImageUrls: Array<{ file_url: string; file_name: string }> = []

      for (const file of projectData.galleryFiles) {
        if (file !== null) {
          try {
            toast.info(`Uploading ${file.name}...`)
            const cloudinaryResult = await cloudinaryAPI.uploadFile(
              file,
              "projects/gallery",
              file.type.startsWith("video/") ? "video" : "image",
            )

            uploadedImageUrls.push({
              file_url: cloudinaryResult.secure_url,
              file_name: file.name,
            })
          } catch (uploadError) {
            console.error("Error uploading file:", uploadError)
            toast.error(`Failed to upload ${file.name}`)
            return
          }
        }
      }

      // Prepare data for API - set estimated cost to "0" if empty
      const estimatedCost = projectData.estimatedCost && projectData.estimatedCost.trim() !== "" 
        ? projectData.estimatedCost 
        : "0"

      const apiData: CreateProjectData = {
        title: projectData.title.trim(),
        executive_summary: sanitizeHTML(projectData.executiveSummary.trim()),
        description: projectData.description.trim(),
        ...(isOthersSector
          ? { authorizing_sector_name: otherSectorName.trim() }
          : { authorizing_sector_id: projectData.authorisingSector as `${string}-${string}-${string}-${string}-${string}` }),
        estimated_cost: estimatedCost,
        proposed_start_date: formatDate(projectData.proposedStartDate),
        estimated_completion_date: formatDate(projectData.estimatedCompletionDate),
        submission_requirements: projectData.submissionRequirements.trim(),
        eoi_start_date: formatDateTime(projectData.eoiStartDate),
        eoi_end_date: formatDateTime(projectData.eoiEndDate),
        ...(projectData.submissionFee && projectData.submissionFee.trim() !== ""
          ? { submission_fee: projectData.submissionFee }
          : {}),
        laws_and_regulations: projectData.lawsAndRegulations.trim(),
        status,
        gallery_images: uploadedImageUrls,
      }

      // Call API
      const result = await projectAPI.create(apiData)

      if (result.success) {
        // Clean up localStorage on successful creation
        formStorage.remove(FORM_STORAGE_KEY)
        if (currentProjectId) {
          projectStorage.deleteProject(currentProjectId)
        }

        try {
          await notificationAPI.create({
            title: "New Project Published",
            message: `${projectData.title} has been successfully published.`,
            notification_type: "PROJECT_CREATED",
            related_object_type: "project",
            related_object_id: result.data?.id,
          })
        } catch (error) {
          console.error("Failed to send notification", error)
        }

        toast.success("Project created successfully")
        router.push("/projects")
      } else {
        toast.error(result.message || `Failed to ${status === "draft" ? "save" : "publish"} project`)
        console.error("API Error:", result.errors)
      }
    } catch (error) {
      console.error("Error creating project:", error)
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel? Any unsaved changes will be lost.")) {
      formStorage.remove(FORM_STORAGE_KEY)
      router.push("/projects")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto md:p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Projects</span>
            <span>›</span>
            <span className="text-foreground font-medium">Create Project</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Fill in the details carefully. Once published, the information will be visible to partners.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="col-span-3 lg:col-span-2 space-y-8">
            {/* Saved Projects Loader */}
            <section>
              <h2 className="text-xl font-semibold mb-1">Saved Drafts</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Load a previously saved draft to continue working on it.
              </p>
              <SavedProjectsList onProjectSelect={loadProjectFromStorage} currentProjectId={currentProjectId} />
            </section>

            {/* Overview Section */}
            <section>
              <h2 className="text-xl font-semibold mb-1">Overview</h2>
              <p className="text-sm text-muted-foreground mb-6">Provide the core details that define this project</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Project title <span className="text-red-600">*</span></Label>
                  <Input
                    id="title"
                    placeholder="e.g. Construction of a new courthouse"
                    value={projectData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    disabled={isSubmitting}
                    className={validationErrors.title ? "border-red-500" : ""}
                  />
                  {validationErrors.title && <p className="text-sm text-red-500">{validationErrors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Executive summary <span className="text-red-600">*</span></Label>
                  <RichTextEditor
                    value={projectData.executiveSummary}
                    onChange={(value) => updateField("executiveSummary", value)}
                    placeholder="Describe your project in a few words..."
                    minHeight="120px"
                    disabled={isSubmitting}
                    className={validationErrors.executiveSummary ? "border-red-500" : ""}
                  />
                  {validationErrors.executiveSummary && (
                    <p className="text-sm text-red-500">{validationErrors.executiveSummary}</p>
                  )}
                  {validationErrors.executiveSummary && (
                    <p className="text-sm text-red-500">{validationErrors.executiveSummary}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Project description <span className="text-red-600">*</span></Label>
                  <RichTextEditor
                    value={projectData.description}
                    onChange={(value) => updateField("description", value)}
                    placeholder="Provide a detailed description of the project here..."
                    minHeight="120px"
                    disabled={isSubmitting}
                    className={validationErrors.description ? "border-red-500" : ""}
                  />
                  {validationErrors.description && (
                    <p className="text-sm text-red-500">{validationErrors.description}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sector">Authorising sector <span className="text-red-600">*</span></Label>
                    <Select
                      value={projectData.authorisingSector}
                      onValueChange={(value) => updateField("authorisingSector", value)}
                      disabled={isSubmitting || isLoadingSectors}
                    >
                      <SelectTrigger
                        id="sector"
                        className={cn("w-full", validationErrors.authorisingSector ? "border-red-500" : "")}
                      >
                        <SelectValue
                          placeholder={isLoadingSectors ? "Loading sectors..." : "Select authorising sector"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {authorizingSectors.map((sector) => (
                          <SelectItem key={sector.id} value={sector.id}>
                            {sector.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isOthersSector && (
                      <Input
                        placeholder="Enter ministry name"
                        value={otherSectorName}
                        onChange={(e) => setOtherSectorName(e.target.value)}
                        disabled={isSubmitting}
                        className={cn("mt-2", validationErrors.authorisingSector && !otherSectorName.trim() ? "border-red-500" : "")}
                      />
                    )}
                    {validationErrors.authorisingSector && (
                      <p className="text-sm text-red-500">{validationErrors.authorisingSector}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cost">Estimated cost (Optional)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                      <Input
                        id="cost"
                        type="text"
                        placeholder="00.00"
                        value={displayEstimatedCost}
                        onChange={(e) => handleEstimatedCostChange(e.target.value)}
                        className="pl-7"
                        disabled={isSubmitting}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Leave empty if cost is not yet determined (will default to 0)</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Proposed start period <span className="text-red-600">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start bg-[#F7F7F8] text-left font-normal",
                            !projectData.proposedStartDate && "text-muted-foreground",
                            validationErrors.proposedStartDate ? "border-red-500" : "",
                          )}
                          disabled={isSubmitting}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {projectData.proposedStartDate ? (
                            format(projectData.proposedStartDate, "PPP")
                          ) : (
                            <span>e.g. Jan 1900</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={projectData.proposedStartDate}
                          onSelect={(date) => updateField("proposedStartDate", date)}
                          initialFocus
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    {validationErrors.proposedStartDate && (
                      <p className="text-sm text-red-500">{validationErrors.proposedStartDate}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Estimated completion period <span className="text-red-600">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full bg-[#F7F7F8] justify-start text-left font-normal",
                            !projectData.estimatedCompletionDate && "text-muted-foreground",
                            validationErrors.estimatedCompletionDate ? "border-red-500" : "",
                          )}
                          disabled={isSubmitting}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {projectData.estimatedCompletionDate ? (
                            format(projectData.estimatedCompletionDate, "PPP")
                          ) : (
                            <span>e.g. Dec 2026</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={projectData.estimatedCompletionDate}
                          onSelect={(date) => updateField("estimatedCompletionDate", date)}
                          initialFocus
                          disabled={(date) => date <= (projectData.proposedStartDate || new Date())}
                        />
                      </PopoverContent>
                    </Popover>
                    {validationErrors.estimatedCompletionDate && (
                      <p className="text-sm text-red-500">{validationErrors.estimatedCompletionDate}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Project Gallery Section */}
            <section>
              <h2 className="text-xl font-semibold mb-1">Project gallery</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Add relevant photos or renderings that support your project description.
              </p>

              {validationErrors.galleryFiles && (
                <p className="text-sm text-red-500 mb-4">{validationErrors.galleryFiles}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className={cn(
                      "relative border-2 border-dashed border-border rounded-lg p-6 hover:border-muted-foreground/50 transition-colors",
                      validationErrors.galleryFiles ? "border-red-300" : "",
                    )}
                  >
                    <input
                      type="file"
                      id={`file-${index}`}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/jpeg,image/png,image/jpg,video/mp4,video/webm,video/quicktime"
                      onChange={(e) => handleFileUpload(e.target.files, index)}
                      disabled={isSubmitting}
                    />
                    <div className="flex flex-col items-center justify-center text-center space-y-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div className="text-xs text-muted-foreground">
                        <p>Drag and drop your media here, or</p>
                        <button
                          type="button"
                          className="text-[#C13C3D] underline"
                          onClick={() => document.getElementById(`file-${index}`)?.click()}
                          disabled={isSubmitting}
                        >
                          browse your files
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">(Supports .jpg, .png & .mp4 up to 720p)</p>
                    </div>
                    {projectData.galleryPreviews[index] && (
                      <div className="absolute inset-0 rounded-lg overflow-hidden">
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(index)}
                          className="absolute top-2 right-2 bg-gray-800 opacity-70 text-slate-100 rounded-full p-2 z-10 shadow hover:cursor-pointer"
                          disabled={isSubmitting}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>

                        {/* Media Preview */}
                        {projectData.galleryFiles[index]?.type.startsWith("video/") ? (
                          <video
                            src={projectData.galleryPreviews[index]}
                            controls={false}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <img
                            src={projectData.galleryPreviews[index] || "/placeholder.svg"}
                            alt="Preview"
                            className="object-cover w-full h-full"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Procurement Information Section */}
            <section>
              <h2 className="text-xl font-semibold mb-1">Procurement information</h2>
              <p className="text-sm text-muted-foreground mb-6">
                This section guides partners in preparing and submitting their Expressions of Interest.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="requirements">Submission requirements</Label>
                  <RichTextEditor
                    value={projectData.submissionRequirements}
                    onChange={(value) => updateField("submissionRequirements", value)}
                    placeholder="Enter required submission documents or criteria..."
                    minHeight="120px"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>EOI start date <span className="text-red-600">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full bg-[#F7F7F8] justify-start text-left font-normal",
                            !projectData.eoiStartDate && "text-muted-foreground",
                            validationErrors.eoiStartDate ? "border-red-500" : "",
                          )}
                          disabled={isSubmitting}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {projectData.eoiStartDate ? (
                            format(projectData.eoiStartDate, "PPP")
                          ) : (
                            <span>e.g. 01 Jan 1900</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={projectData.eoiStartDate}
                          onSelect={(date) => updateField("eoiStartDate", date)}
                          initialFocus
                          disabled={(date) => {
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)

                            // Disable dates before today
                            if (date < today) return true

                            // Disable dates after proposed start date
                            if (projectData.proposedStartDate && date > projectData.proposedStartDate) return true

                            return false
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {validationErrors.eoiStartDate && (
                      <p className="text-sm text-red-500">{validationErrors.eoiStartDate}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>EOI end date <span className="text-red-600">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full bg-[#F7F7F8] justify-start text-left font-normal",
                            !projectData.eoiEndDate && "text-muted-foreground",
                            validationErrors.eoiEndDate ? "border-red-500" : "",
                          )}
                          disabled={isSubmitting}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {projectData.eoiEndDate ? (
                            format(projectData.eoiEndDate, "PPP")
                          ) : (
                            <span>e.g. 31 Dec 2026</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={projectData.eoiEndDate}
                          onSelect={(date) => updateField("eoiEndDate", date)}
                          initialFocus
                          disabled={(date) => {
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)

                            // Disable dates before EOI start date
                            if (projectData.eoiStartDate && date <= projectData.eoiStartDate) return true

                            // Disable dates after proposed start date
                            if (projectData.proposedStartDate && date > projectData.proposedStartDate) return true

                            return false
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {validationErrors.eoiEndDate && (
                      <p className="text-sm text-red-500">{validationErrors.eoiEndDate}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="submission-fee">
                    Submission fee (Optional)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <Input
                      id="submission-fee"
                      type="text"
                      placeholder="e.g. 50,000.00"
                      value={displaySubmissionFee}
                      onChange={(e) => handleSubmissionFeeChange(e.target.value)}
                      className="pl-7"
                      disabled={isSubmitting}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The fee partners must pay to submit an Expression of Interest for this project.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="laws">Laws and Regulations <span className="text-red-600">*</span></Label>
                  <RichTextEditor
                    value={projectData.lawsAndRegulations}
                    onChange={(value) => updateField("lawsAndRegulations", value)}
                    placeholder="Provide the legal and regulatory frameworks guiding this procurement..."
                    minHeight="120px"
                    disabled={isSubmitting}
                    className={validationErrors.lawsAndRegulations ? "border-red-500" : ""}
                  />
                  {validationErrors.lawsAndRegulations && (
                    <p className="text-sm text-red-500">{validationErrors.lawsAndRegulations}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Action Buttons */}
            <div className="flex flex-col justify-end sm:flex-row gap-3 pb-8">
              <Button
                variant="ghost"
                className="flex-1 sm:flex-none bg-transparent"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="flex-1 sm:flex-none bg-transparent"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save for Later"}
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={handlePublish} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
              </Button>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="col-span-3 lg:col-span-1 lg:sticky lg:top-6 lg:self-start">
            <ProjectPreview data={previewData} authorizingSectors={authorizingSectors} />
          </div>
        </div>
      </div>
    </div>
  )
}