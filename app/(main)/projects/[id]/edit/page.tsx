"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, Upload, TrashIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { projectAPI } from "@/lib/api/projects"
import { toast } from "sonner"
import { formatCurrencyInput, handleCurrencyChange } from "@/lib/utils/formatting"
import type { AuthorizingSector } from "@/types/projects"
import { cloudinaryAPI } from "@/lib/cloudinary"

interface ProjectFormData {
  title: string
  executiveSummary: string
  description: string
  authorisingSector: string
  estimatedCost: string
  proposedStartDate: Date | undefined
  estimatedCompletionDate: Date | undefined
  submissionRequirements: string
  eoiStartDate: Date | undefined
  eoiEndDate: Date | undefined
  lawsAndRegulations: string
  galleryFiles: (File | null)[]
}

export default function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [existingImages, setExistingImages] = useState<Array<{ file_url: string; file_name: string }>>([])
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
    lawsAndRegulations: "",
    galleryFiles: Array(5).fill(null),
  })

  const [authorizingSectors, setAuthorizingSectors] = useState<AuthorizingSector[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSectors, setIsLoadingSectors] = useState(false)
  const [otherSectorName, setOtherSectorName] = useState("")

  const isOthersSector = authorizingSectors.find(s => s.id === projectData.authorisingSector)?.name === "Others"

  // Fetch project data
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const result = await projectAPI.get(id)
        if (result.success && result.data) {
          const project = result.data
          setProjectData({
            title: project.title || "",
            executiveSummary: project.executive_summary || "",
            description: project.description || "",
            authorisingSector: project.authorizing_sector?.id || "",
            estimatedCost: project.estimated_cost || "",
            proposedStartDate: project.proposed_start_date ? new Date(project.proposed_start_date) : undefined,
            estimatedCompletionDate: project.estimated_completion_date
              ? new Date(project.estimated_completion_date)
              : undefined,
            submissionRequirements: project.submission_requirements || "",
            eoiStartDate: project.eoi_start_date ? new Date(project.eoi_start_date) : undefined,
            eoiEndDate: project.eoi_end_date ? new Date(project.eoi_end_date) : undefined,
            lawsAndRegulations: project.laws_and_regulations || "",
            galleryFiles: Array(5).fill(null),
          })
          if (project.gallery_images && project.gallery_images.length > 0) {
            setExistingImages(project.gallery_images)
          }
        } else {
          toast.error("Failed to load project")
          router.push("/projects")
        }
      } catch (error) {
        console.error("Error fetching project:", error)
        toast.error("Error loading project")
        router.push("/projects")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [id, router])

  // Fetch authorizing sectors
  useEffect(() => {
    const fetchAuthorizingSectors = async () => {
      setIsLoadingSectors(true)
      try {
        const response = await projectAPI.getAuthorizingSectors()
        const sectors = response.data

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

  const updateField = <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => {
    setProjectData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = (files: FileList | null, index: number) => {
    if (files && files[0]) {
      const file = files[0]
      setProjectData((prev) => {
        const newFiles = [...prev.galleryFiles]
        newFiles[index] = file
        return { ...prev, galleryFiles: newFiles }
      })
    }
  }

  const handleDeleteFile = (index: number) => {
    setProjectData((prev) => {
      const newFiles = [...prev.galleryFiles]
      newFiles[index] = null
      return { ...prev, galleryFiles: newFiles }
    })
  }

  const formatDate = (date: Date | undefined): string => {
    if (!date) return ""
    return format(date, "yyyy-MM-dd")
  }

  const formatDateTime = (date: Date | undefined): string => {
    if (!date) return ""
    const newDate = new Date(date)
    if (projectData.eoiEndDate && date.getTime() === projectData.eoiEndDate.getTime()) {
      newDate.setHours(23, 59, 59, 999)
    }
    return newDate.toISOString()
  }

  const handleEstimatedCostChange = (value: string) => {
    handleCurrencyChange(value, (cleanValue) => {
      updateField("estimatedCost", cleanValue)
    })
  }

  const displayEstimatedCost = formatCurrencyInput(projectData.estimatedCost)

  const handleSaveDraft = async () => {
    await submitProject("draft")
  }

  const handlePublish = async () => {
    await submitProject("published")
  }

  const submitProject = async (status: "draft" | "published") => {
    setIsSubmitting(true)

    try {
      // Validation
      if (!projectData.title.trim()) {
        toast.error("Project title is required")
        return
      }

      if (!projectData.executiveSummary.trim()) {
        toast.error("Executive summary is required")
        return
      }

      if (!projectData.description.trim()) {
        toast.error("Project description is required")
        return
      }

      if (!projectData.authorisingSector) {
        toast.error("Authorizing sector is required")
        return
      }

      if (!projectData.estimatedCost) {
        toast.error("Estimated cost is required")
        return
      }

      if (!projectData.proposedStartDate) {
        toast.error("Proposed start date is required")
        return
      }

      if (!projectData.estimatedCompletionDate) {
        toast.error("Estimated completion date is required")
        return
      }

      if (!projectData.eoiStartDate) {
        toast.error("EOI start date is required")
        return
      }

      if (!projectData.eoiEndDate) {
        toast.error("EOI end date is required")
        return
      }

      if (
        projectData.estimatedCompletionDate &&
        projectData.proposedStartDate &&
        projectData.estimatedCompletionDate <= projectData.proposedStartDate
      ) {
        toast.error("Completion date must be after start date")
        return
      }

      if (projectData.eoiEndDate && projectData.eoiStartDate && projectData.eoiEndDate <= projectData.eoiStartDate) {
        toast.error("EOI end date must be after start date")
        return
      }

      const uploadedImageUrls: Array<{ file_url: string; file_name: string }> = [...existingImages]

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

      const apiData = {
        title: projectData.title.trim(),
        executive_summary: projectData.executiveSummary.trim(),
        description: projectData.description.trim(),
        ...(isOthersSector
          ? { authorizing_sector_name: otherSectorName.trim() }
          : { authorizing_sector_id: projectData.authorisingSector as `${string}-${string}-${string}-${string}-${string}` }),
        estimated_cost: projectData.estimatedCost,
        proposed_start_date: formatDate(projectData.proposedStartDate),
        estimated_completion_date: formatDate(projectData.estimatedCompletionDate),
        submission_requirements: projectData.submissionRequirements.trim(),
        eoi_start_date: formatDateTime(projectData.eoiStartDate),
        eoi_end_date: formatDateTime(projectData.eoiEndDate),
        laws_and_regulations: projectData.lawsAndRegulations.trim(),
        status: status,
        gallery_images: uploadedImageUrls,
      }

      const result = await projectAPI.partialUpdate(id, apiData)

      if (result.success) {
        toast.success(`Project ${status === "draft" ? "saved as draft" : "published"} successfully!`)
        router.push("/projects")
      } else {
        toast.error(result.message || `Failed to ${status === "draft" ? "save" : "publish"} project`)
        console.error("API Error:", result.errors)
      }
    } catch (error) {
      console.error("Error updating project:", error)
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push("/projects")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto md:p-4">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Projects</span>
            <span>›</span>
            <span className="text-foreground font-medium">Edit Project</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Update the project details. Once published, the information will be visible to partners.
          </p>
        </div>

        <div className="space-y-8 max-w-5xl mx-auto">
          <section>
            <h2 className="text-xl font-semibold mb-1">Overview</h2>
            <p className="text-sm text-muted-foreground mb-6">Provide the core details that define this project</p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Construction of a new courthouse"
                  value={projectData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Executive summary *</Label>
                <Textarea
                  id="summary"
                  placeholder="Describe your project in a few words"
                  value={projectData.executiveSummary}
                  onChange={(e) => updateField("executiveSummary", e.target.value)}
                  className="min-h-[100px]"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide a detailed description of the project here"
                  value={projectData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="min-h-[120px]"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sector">Authorising sector *</Label>
                  <Select
                    value={projectData.authorisingSector}
                    onValueChange={(value) => updateField("authorisingSector", value)}
                    disabled={isSubmitting || isLoadingSectors}
                  >
                    <SelectTrigger id="sector" className="w-full">
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
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost">Estimated cost *</Label>
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
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proposed start period *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start bg-[#F7F7F8] text-left font-normal",
                          !projectData.proposedStartDate && "text-muted-foreground",
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
                </div>

                <div className="space-y-2">
                  <Label>Estimated completion period *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full bg-[#F7F7F8] justify-start text-left font-normal",
                          !projectData.estimatedCompletionDate && "text-muted-foreground",
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

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4].map((index) => (
                <div
                  key={index}
                  className="relative border-2 border-dashed border-border rounded-lg p-6 hover:border-muted-foreground/50 transition-colors"
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
                  {projectData.galleryFiles[index] && (
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
                          src={URL.createObjectURL(projectData.galleryFiles[index]!)}
                          controls={false}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <img
                          src={URL.createObjectURL(projectData.galleryFiles[index]!) || "/placeholder.svg"}
                          alt="Preview"
                          className="object-cover w-full h-full"
                        />
                      )}
                    </div>
                  )}
                  {existingImages[index] && (
                    <div className="absolute inset-0 rounded-lg overflow-hidden">
                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setExistingImages(existingImages.filter((_, i) => i !== index))
                        }}
                        className="absolute top-2 right-2 bg-gray-800 opacity-70 text-slate-100 rounded-full p-2 z-10 shadow hover:cursor-pointer"
                        disabled={isSubmitting}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>

                      {/* Media Preview */}
                      <img
                        src={existingImages[index].file_url || "/placeholder.svg"}
                        alt={existingImages[index].file_name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-1">Procurement information</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This section guides partners in preparing and submitting their Expressions of Interest.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="requirements">Submission requirements</Label>
                <Textarea
                  id="requirements"
                  placeholder="Enter required submission documents or criteria"
                  value={projectData.submissionRequirements}
                  onChange={(e) => updateField("submissionRequirements", e.target.value)}
                  className="min-h-[120px]"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>EOI start date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full bg-[#F7F7F8] justify-start text-left font-normal",
                          !projectData.eoiStartDate && "text-muted-foreground",
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
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>EOI end date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full bg-[#F7F7F8] justify-start text-left font-normal",
                          !projectData.eoiEndDate && "text-muted-foreground",
                        )}
                        disabled={isSubmitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {projectData.eoiEndDate ? format(projectData.eoiEndDate, "PPP") : <span>e.g. 31 Dec 2026</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={projectData.eoiEndDate}
                        onSelect={(date) => updateField("eoiEndDate", date)}
                        initialFocus
                        disabled={(date) => date <= (projectData.eoiStartDate || new Date())}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="laws">Laws and Regulations</Label>
                <Textarea
                  id="laws"
                  placeholder="Provide the legal and regulatory frameworks guiding this procurement"
                  value={projectData.lawsAndRegulations}
                  onChange={(e) => updateField("lawsAndRegulations", e.target.value)}
                  className="min-h-[120px]"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </section>

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
      </div>
    </div>
  )
}
