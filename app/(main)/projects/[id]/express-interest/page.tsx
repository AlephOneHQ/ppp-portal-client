"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Upload, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { SuccessModal } from "@/components/modal/sucess-modal"
import { eoiAPI, type EOI, type EOISubmissionData, type KeyPersonnel, type ConsortiumMember } from "@/lib/api/projects"
import { cloudinaryAPI } from "@/lib/cloudinary"
import { toast } from "sonner"
import { notificationAPI } from "@/lib/api/notifications"
import { formStorage } from "@/lib/storage/formPersistence"
import { countries } from "@/lib/utils/countries"
import { WordCounter } from "@/components/shared/word-counter"
import { countWords, MAX_WORDS } from "@/lib/utils/wordCount"
import { AxiosError } from "axios"
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

interface EOIFormData {
  companyBio: string
  experience: string
  portfolioLink: string
  projectPlan: string
  submissionFee: string
  applyingAsConsortium: boolean // Add this
  keyPersonnel: Array<{ id: number; name: string; role: string }>
  consortiumMembers: Array<{
    id: number
    memberName: string
    role: string
    country: string
    registrationNumber: string
  }>
  uploadedFiles: Record<string, string>
}

interface SavedEOI {
  id: string
  projectId: string
  data: EOIFormData
  status: "draft"
  createdAt: string
  updatedAt: string
}

interface ServerEOI {
  id: string
  project_id: string
  status: string
  company_bio?: string
  experience?: string
  portfolio_link?: string
  project_plan?: string
  key_personnel?: Array<{ name: string; role: string }>
  consortium_members?: Array<{
    member_name: string
    role: string
    country_of_incorporation: string
    registration_number: string
  }>
}

// Validation error interface
interface ValidationErrors {
  companyBio?: string
  experience?: string
  projectPlan?: string
  portfolioLink?: string
  interestLetter?: string
  portfolioFile?: string
  clientRef1?: string
  bankStmt1?: string
  proofFunds1?: string
  keyPersonnel?: string
  applyingAsConsortium?: string // Add this
  consortiumAgreement?: string // Add this
  keyPersonnelItems?: {
    [id: number]: {
      name?: string
      role?: string
    }
  }
  consortiumMembersItems?: {
    [id: number]: {
      memberName?: string
      role?: string
      country?: string
      registrationNumber?: string
    }
  }
}

const SAVED_EOIS_KEY = "saved-eois"

// Helper functions for localStorage management
const eoiStorage = {
  saveEOI: (eoi: SavedEOI): void => {
    try {
      const existingEOIs = eoiStorage.getEOIs()
      const existingIndex = existingEOIs.findIndex((e) => e.id === eoi.id && e.projectId === eoi.projectId)

      if (existingIndex >= 0) {
        existingEOIs[existingIndex] = eoi
      } else {
        existingEOIs.push(eoi)
      }

      localStorage.setItem(SAVED_EOIS_KEY, JSON.stringify(existingEOIs))
    } catch (error) {
      console.error("Error saving EOI to localStorage:", error)
      toast.error("Failed to save EOI draft")
    }
  },

  getEOIs: (projectId?: string): SavedEOI[] => {
    try {
      const stored = localStorage.getItem(SAVED_EOIS_KEY)
      const allEOIs = stored ? JSON.parse(stored) : []
      return projectId ? allEOIs.filter((eoi: SavedEOI) => eoi.projectId === projectId) : allEOIs
    } catch (error) {
      console.error("Error reading EOIs from localStorage:", error)
      return []
    }
  },

  getEOI: (id: string, projectId: string): SavedEOI | null => {
    const eois = eoiStorage.getEOIs(projectId)
    return eois.find((e) => e.id === id) || null
  },

  deleteEOI: (id: string, projectId: string): void => {
    try {
      const eois = eoiStorage.getEOIs()
      const filteredEOIs = eois.filter((e) => !(e.id === id && e.projectId === projectId))
      localStorage.setItem(SAVED_EOIS_KEY, JSON.stringify(filteredEOIs))
    } catch (error) {
      console.error("Error deleting EOI from localStorage:", error)
      toast.error("Failed to delete EOI draft")
    }
  },

  fileToBase64: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  },

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

// Component to display and load saved EOIs
interface SavedEOIsLoaderProps {
  projectId: string
  onEOISelect: (eoiId: string) => void
  currentEOIId: string
}

function SavedEOIsLoader({ projectId, onEOISelect, currentEOIId }: SavedEOIsLoaderProps) {
  const [savedEOIs, setSavedEOIs] = useState<SavedEOI[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const eois = eoiStorage.getEOIs(projectId)
    setSavedEOIs(eois)
    setIsLoading(false)
  }, [projectId])

  const handleDeleteEOI = (eoiId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (confirm("Are you sure you want to delete this draft?")) {
      eoiStorage.deleteEOI(eoiId, projectId)
      setSavedEOIs(eoiStorage.getEOIs(projectId))
      toast.success("Draft deleted successfully")
    }
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading drafts...</div>
  }

  if (savedEOIs.length === 0) {
    return <div className="text-sm text-muted-foreground">No saved drafts found.</div>
  }

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {savedEOIs.map((eoi) => (
        <div
          key={eoi.id}
          className={cn(
            "flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
            currentEOIId === eoi.id ? "border-primary bg-primary/5" : "border-border",
          )}
          onClick={() => onEOISelect(eoi.id)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">
                {eoi.data.companyBio ? `EOI Draft - ${eoi.data.companyBio.substring(0, 30)}...` : "Untitled EOI"}
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Draft</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Updated: {format(new Date(eoi.updatedAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleDeleteEOI(eoi.id, e)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}

function format(date: Date, formatString: string): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ")
}

// Enhanced URL validation function
const isValidHttpsUrl = (urlString: string): boolean => {
  if (!urlString.trim()) return false
  
  try {
    const url = new URL(urlString)
    return url.protocol === 'https:'
  } catch (error) {
    return false
  }
}

export default function ExpressInterestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const [projectId, setProjectId] = useState<string>("")
  const [resubmitEOIId, setResubmitEOIId] = useState<string | null>(null)
  const router = useRouter()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDraftLoading, setIsDraftLoading] = useState(true)
  const [eoiId, setEoiId] = useState<string | null>(null)
  const [existingEOI, setExistingEOI] = useState<ServerEOI | null>(null)
  const [isResubmission, setIsResubmission] = useState(false)
  const [currentEOIId, setCurrentEOIId] = useState<string>("")
  const [referenceId, setReferenceId] = useState<string>("")

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  // Resolve the async params safely
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params
        const resolvedSearchParams = await searchParams

        setProjectId(resolvedParams.id)

        // Check if this is a resubmission
        if (resolvedSearchParams.resubmit) {
          setResubmitEOIId(resolvedSearchParams.resubmit as string)
          setIsResubmission(true)
          console.log("Resubmission detected for EOI:", resolvedSearchParams.resubmit)
        }
      } catch (error) {
        console.error("Error resolving params:", error)
        toast.error("Failed to load project information")
      }
    }

    resolveParams()
  }, [params, searchParams])

  const FORM_STORAGE_KEY = `eoi-form-${projectId}`

  // Dynamic state
  const [keyPersonnel, setKeyPersonnel] = useState([
    { id: 1, name: "", role: "" },
    { id: 2, name: "", role: "" },
    { id: 3, name: "", role: "" },
  ])

  const [consortiumMembers, setConsortiumMembers] = useState([
    { id: 1, memberName: "", role: "", country: "", registrationNumber: "" },
  ])

  // Form state
  const [formData, setFormData] = useState({
    companyBio: "",
    experience: "",
    portfolioLink: "",
    projectPlan: "",
    submissionFee: "",
    applyingAsConsortium: false, // Default to No
  })

  // File upload management
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File | null>>({})

  // Generate a unique ID for new EOIs
  const generateEOIId = (): string => {
    return `eoi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Function to show validation errors using toast (same pattern as project form)
  const showValidationErrors = (errors: ValidationErrors) => {
    const errorMessages = Object.values(errors).filter(msg => typeof msg === 'string')
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

  // Enhanced validation function (following the same pattern as project form)
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {}

    // Required text fields
    if (!formData.companyBio.trim()) {
      errors.companyBio = "Company profile is required"
    }

    if (!formData.experience.trim()) {
      errors.experience = "Experience is required"
    }

    if (!formData.experience.trim()) {
      errors.projectPlan = "Project Plan is required"
    }

    // Project plan must not exceed the word limit (same rule as the server).
    if (countWords(formData.projectPlan) > MAX_WORDS) {
      errors.projectPlan = `Project plan must not exceed ${MAX_WORDS} words.`
    }

    // Portfolio is now optional - only validate if provided
    if (formData.portfolioLink.trim() && !isValidHttpsUrl(formData.portfolioLink)) {
      errors.portfolioLink = "Please enter a valid URL starting with https:// (e.g., https://example.com)"
    }

    // Required files
    if (!uploadedFiles.interestLetter) {
      errors.interestLetter = "Interest letter is required"
    }

    // Client references are now optional (removed from required validation)

    // Validate key personnel
    const validKeyPersonnel = keyPersonnel.some((person) => person.name.trim() && person.role.trim())
    if (!validKeyPersonnel) {
      errors.keyPersonnel = "At least one key personnel member with name and role is required"
    }

    // Validate individual key personnel items
    const keyPersonnelItems: ValidationErrors["keyPersonnelItems"] = {}
    keyPersonnel.forEach((person) => {
      const itemErrors: { name?: string; role?: string } = {}
      if (!person.name.trim() && person.role.trim()) {
        itemErrors.name = "Name is required"
      }
      if (!person.role.trim() && person.name.trim()) {
        itemErrors.role = "Role is required"
      }
      if (Object.keys(itemErrors).length > 0) {
        keyPersonnelItems[person.id] = itemErrors
      }
    })
    if (Object.keys(keyPersonnelItems).length > 0) {
      errors.keyPersonnelItems = keyPersonnelItems
    }

    // Validate consortium members only if applying as consortium
    if (formData.applyingAsConsortium) {
      const consortiumMembersItems: ValidationErrors["consortiumMembersItems"] = {}
      consortiumMembers.forEach((member) => {
        // All fields are required when applying as consortium
        const itemErrors: { memberName?: string; role?: string; country?: string; registrationNumber?: string } = {}
        
        if (!member.memberName.trim()) {
          itemErrors.memberName = "Member name is required"
        }
        if (!member.role.trim()) {
          itemErrors.role = "Role is required"
        }
        if (!member.country.trim()) {
          itemErrors.country = "Country is required"
        }
        if (!member.registrationNumber.trim()) {
          itemErrors.registrationNumber = "Registration number is required"
        }

        if (Object.keys(itemErrors).length > 0) {
          consortiumMembersItems[member.id] = itemErrors
        }
      })
      if (Object.keys(consortiumMembersItems).length > 0) {
        errors.consortiumMembersItems = consortiumMembersItems
      }

      // Validate consortium agreement is required when applying as consortium
      if (!uploadedFiles.consortiumAgreement) {
        errors.consortiumAgreement = "Consortium agreement is required when applying as a consortium"
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Clear validation errors for a specific field (same pattern as project form)
  const clearValidationError = (field: keyof ValidationErrors) => {
    setValidationErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }))
  }

  // Clear validation errors for key personnel item
  const clearKeyPersonnelError = (id: number, field: "name" | "role") => {
    setValidationErrors((prev) => {
      const newErrors = { ...prev }
      if (newErrors.keyPersonnelItems?.[id]) {
        delete newErrors.keyPersonnelItems[id][field]
        if (Object.keys(newErrors.keyPersonnelItems[id]).length === 0) {
          delete newErrors.keyPersonnelItems[id]
        }
        if (Object.keys(newErrors.keyPersonnelItems || {}).length === 0) {
          delete newErrors.keyPersonnelItems
        }
      }
      return newErrors
    })
  }

  // Clear validation errors for consortium member item
  const clearConsortiumMemberError = (id: number, field: "memberName" | "role" | "country" | "registrationNumber") => {
    setValidationErrors((prev) => {
      const newErrors = { ...prev }
      if (newErrors.consortiumMembersItems?.[id]) {
        delete newErrors.consortiumMembersItems[id][field]
        if (Object.keys(newErrors.consortiumMembersItems[id]).length === 0) {
          delete newErrors.consortiumMembersItems[id]
        }
        if (Object.keys(newErrors.consortiumMembersItems || {}).length === 0) {
          delete newErrors.consortiumMembersItems
        }
      }
      return newErrors
    })
  }

  useEffect(() => {
    if (!projectId) return

    const savedData = formStorage.load<EOIFormData>(FORM_STORAGE_KEY)
    if (savedData) {
      setFormData({
        companyBio: savedData.companyBio || "",
        experience: savedData.experience || "",
        portfolioLink: savedData.portfolioLink || "",
        projectPlan: savedData.projectPlan || "",
        submissionFee: savedData.submissionFee || "",
        applyingAsConsortium: savedData.applyingAsConsortium || false, // Restore toggle state
      })

      if (savedData.keyPersonnel && savedData.keyPersonnel.length > 0) {
        setKeyPersonnel(savedData.keyPersonnel)
      }

      if (savedData.consortiumMembers && savedData.consortiumMembers.length > 0) {
        setConsortiumMembers(savedData.consortiumMembers)
      }

      // Load base64 files back to File objects
      if (savedData.uploadedFiles) {
        const files: Record<string, File | null> = {}
        Object.entries(savedData.uploadedFiles).forEach(([key, base64]) => {
          if (base64) {
            try {
              const file = eoiStorage.base64ToFile(base64, `${key}-file`)
              files[key] = file
            } catch (error) {
              console.error(`Error converting base64 to file for ${key}:`, error)
              files[key] = null
            }
          } else {
            files[key] = null
          }
        })
        setUploadedFiles(files)
      }

      toast.success("Form data restored from last session")
    }
  }, [FORM_STORAGE_KEY, projectId])

  useEffect(() => {
    if (!projectId) return

    const saveInterval = setInterval(() => {
      const dataToSave: EOIFormData = {
        companyBio: formData.companyBio,
        experience: formData.experience,
        portfolioLink: formData.portfolioLink,
        projectPlan: formData.projectPlan,
        submissionFee: formData.submissionFee,
        applyingAsConsortium: formData.applyingAsConsortium,
        keyPersonnel,
        consortiumMembers,
        uploadedFiles: {},
      }
      formStorage.save(FORM_STORAGE_KEY, dataToSave)
    }, 2000)

    return () => clearInterval(saveInterval)
  }, [formData, keyPersonnel, consortiumMembers, FORM_STORAGE_KEY, projectId])

  useEffect(() => {
    if (!projectId) {
      setIsDraftLoading(false)
      return
    }

    const loadDraft = async () => {
      try {
        // If this is a resubmission, load the specific EOI
        if (resubmitEOIId) {
          const result = await eoiAPI.get(resubmitEOIId)
          if (result.success && result.data) {
            const eoi = result.data

            // Verify this EOI belongs to the current project and is rejected or withdrawn
            if (eoi.project_id === projectId && (eoi.status === "rejected" || eoi.status === "withdrawn")) {
              setExistingEOI(eoi)
              setEoiId(eoi.id)
              setIsResubmission(true)

              // Pre-fill the form with existing data
              setFormData({
                companyBio: eoi.company_bio || "",
                experience: eoi.experience || "",
                portfolioLink: eoi.portfolio_link || "",
                projectPlan: eoi.project_plan || "",
                submissionFee: "",
                applyingAsConsortium: false, // Default to false, will be determined by consortium members
              })

              if (eoi.key_personnel && eoi.key_personnel.length > 0) {
                setKeyPersonnel(
                  eoi.key_personnel.map((person, index) => ({
                    id: index + 1,
                    name: person.name,
                    role: person.role,
                  })),
                )
              }

              if (eoi.consortium_members && eoi.consortium_members.length > 0) {
                setConsortiumMembers(
                  eoi.consortium_members.map((member, index) => ({
                    id: index + 1,
                    memberName: member.member_name,
                    role: member.role,
                    country: member.country_of_incorporation,
                    registrationNumber: member.registration_number,
                  })),
                )
                // If there are consortium members, set toggle to Yes
                setFormData(prev => ({
                  ...prev,
                  applyingAsConsortium: true
                }))
              }

              formStorage.remove(FORM_STORAGE_KEY)
              toast.success("Resubmission form loaded from rejected EOI")
            } else {
              toast.error("Cannot resubmit this EOI - project mismatch or invalid status")
              setIsResubmission(false)
            }
          }
        } else {
          // Original logic for new submissions or drafts
          const result = await eoiAPI.list({
            project_id: projectId,
          })

          if (result.success && result.data?.results && result.data.results.length > 0) {
            const eoi = result.data.results[0] as ServerEOI

            if (eoi.project_id === projectId) {
              setExistingEOI(eoi)
              setEoiId(eoi.id)

              if (eoi.status === "rejected" || eoi.status === "withdrawn") {
                setIsResubmission(true)
                console.log("Found rejected/withdrawn EOI for this project, enabling resubmission mode")

                // Load rejected EOI data for resubmission
                setFormData({
                  companyBio: eoi.company_bio || "",
                  experience: eoi.experience || "",
                  portfolioLink: eoi.portfolio_link || "",
                  projectPlan: eoi.project_plan || "",
                  submissionFee: "",
                  applyingAsConsortium: false, // Default to false
                })

                if (eoi.key_personnel && eoi.key_personnel.length > 0) {
                  setKeyPersonnel(
                    eoi.key_personnel.map((person, index) => ({
                      id: index + 1,
                      name: person.name,
                      role: person.role,
                    })),
                  )
                }

                if (eoi.consortium_members && eoi.consortium_members.length > 0) {
                  setConsortiumMembers(
                    eoi.consortium_members.map((member, index) => ({
                      id: index + 1,
                      memberName: member.member_name,
                      role: member.role,
                      country: member.country_of_incorporation,
                      registrationNumber: member.registration_number,
                    })),
                  )
                  // If there are consortium members, set toggle to Yes
                  setFormData(prev => ({
                    ...prev,
                    applyingAsConsortium: true
                  }))
                }

                formStorage.remove(FORM_STORAGE_KEY)
                toast.success("Rejected EOI loaded for resubmission")
              } else if (eoi.status === "draft") {
                // Load draft data
                setFormData({
                  companyBio: eoi.company_bio || "",
                  experience: eoi.experience || "",
                  portfolioLink: eoi.portfolio_link || "",
                  projectPlan: eoi.project_plan || "",
                  submissionFee: "",
                  applyingAsConsortium: false, // Default to false
                })

                if (eoi.key_personnel && eoi.key_personnel.length > 0) {
                  setKeyPersonnel(
                    eoi.key_personnel.map((person, index) => ({
                      id: index + 1,
                      name: person.name,
                      role: person.role,
                    })),
                  )
                }

                if (eoi.consortium_members && eoi.consortium_members.length > 0) {
                  setConsortiumMembers(
                    eoi.consortium_members.map((member, index) => ({
                      id: index + 1,
                      memberName: member.member_name,
                      role: member.role,
                      country: member.country_of_incorporation,
                      registrationNumber: member.registration_number,
                    })),
                  )
                  // If there are consortium members, set toggle to Yes
                  setFormData(prev => ({
                    ...prev,
                    applyingAsConsortium: true
                  }))
                }

                formStorage.remove(FORM_STORAGE_KEY)
                toast.success("Draft loaded from server")
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading EOI data:", error)
        toast.error("Failed to load EOI data")
      } finally {
        setIsDraftLoading(false)
      }
    }

    loadDraft()
  }, [projectId, FORM_STORAGE_KEY, resubmitEOIId])

  const handleFileUpload = (file: File, key: string) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10MB limit.")
      return
    }
    setUploadedFiles((prev) => ({ ...prev, [key]: file }))
    
    // Clear validation error for this field when user uploads a file
    clearValidationError(key as keyof ValidationErrors)
    
    // Clear portfolio validation errors when a file is uploaded
    if (key === "portfolioFile") {
      clearValidationError("portfolioLink")
    }
  }

  const handleFileRemove = (key: string) => {
    setUploadedFiles((prev) => ({ ...prev, [key]: null }))
    // Clear validation error when file is removed
    clearValidationError(key as keyof ValidationErrors)
  }

  const addKeyPersonnel = () => {
    setKeyPersonnel([...keyPersonnel, { id: keyPersonnel.length + 1, name: "", role: "" }])
  }

  const deleteKeyPersonnel = (id: number) => {
    setKeyPersonnel((prev) => prev.filter((p) => p.id !== id))
    // Clear any validation errors for this personnel
    setValidationErrors((prev) => {
      const newErrors = { ...prev }
      if (newErrors.keyPersonnelItems?.[id]) {
        delete newErrors.keyPersonnelItems[id]
        if (Object.keys(newErrors.keyPersonnelItems).length === 0) {
          delete newErrors.keyPersonnelItems
        }
      }
      return newErrors
    })
  }

  const addConsortiumMember = () => {
    setConsortiumMembers([
      ...consortiumMembers,
      { id: consortiumMembers.length + 1, memberName: "", role: "", country: "", registrationNumber: "" },
    ])
  }

  const deleteConsortiumMember = (id: number) => {
    if (consortiumMembers.length > 1) {
      setConsortiumMembers((prev) => prev.filter((member) => member.id !== id))
      // Clear any validation errors for this member
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        if (newErrors.consortiumMembersItems?.[id]) {
          delete newErrors.consortiumMembersItems[id]
          if (Object.keys(newErrors.consortiumMembersItems).length === 0) {
            delete newErrors.consortiumMembersItems
          }
        }
        return newErrors
      })
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    
    // Clear validation error for this field when user starts typing
    clearValidationError(field as keyof ValidationErrors)
    
    // Clear portfolio validation errors when a valid URL is being entered
    if (field === "portfolioLink" && typeof value === 'string' && value.trim()) {
      clearValidationError("portfolioLink")
    }

    // If user changes consortium toggle to No, clear consortium validation errors
    if (field === "applyingAsConsortium" && value === false) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.consortiumAgreement
        delete newErrors.consortiumMembersItems
        return newErrors
      })
    }
  }

  const handleKeyPersonnelChange = (id: number, field: string, value: string) => {
    setKeyPersonnel((prev) => prev.map((person) => (person.id === id ? { ...person, [field]: value } : person)))
    clearKeyPersonnelError(id, field as "name" | "role")
  }

  const handleConsortiumMemberChange = (id: number, field: string, value: string) => {
    setConsortiumMembers((prev) => prev.map((member) => (member.id === id ? { ...member, [field]: value } : member)))
    clearConsortiumMemberError(id, field as "memberName" | "role" | "country" | "registrationNumber")
  }

  const uploadFiles = async (): Promise<Record<string, string>> => {
    const fileUrls: Record<string, string> = {}

    for (const [key, file] of Object.entries(uploadedFiles)) {
      if (file) {
        try {
          toast.info(`Uploading ${file.name}...`)

          const cloudinaryResult = await cloudinaryAPI.uploadFile(file, "eoi/documents")

          fileUrls[key] = cloudinaryResult.secure_url
        } catch (error) {
          console.error(`Error uploading ${key}:`, error)
          toast.error(`Failed to upload ${file.name}`)
          throw error
        }
      }
    }

    return fileUrls
  }

  const saveEOIToLocalStorage = async (status: "draft") => {
    if (!projectId) {
      toast.error("Project ID is missing")
      return
    }

    setIsSubmitting(true)

    try {
      // Convert files to base64 for storage
      const uploadedFilesBase64: Record<string, string> = {}

      for (const [key, file] of Object.entries(uploadedFiles)) {
        if (file !== null) {
          try {
            const base64 = await eoiStorage.fileToBase64(file)
            uploadedFilesBase64[key] = base64
          } catch (error) {
            console.error("Error converting file to base64:", error)
            toast.error(`Failed to process ${file.name}`)
            return
          }
        } else {
          uploadedFilesBase64[key] = ""
        }
      }

      // Prepare EOI data for storage
      const eoiStorageId = currentEOIId || generateEOIId()
      const now = new Date().toISOString()

      const eoiToSave: SavedEOI = {
        id: eoiStorageId,
        projectId: projectId,
        data: {
          companyBio: formData.companyBio,
          experience: formData.experience,
          portfolioLink: formData.portfolioLink,
          projectPlan: formData.projectPlan,
          submissionFee: formData.submissionFee,
          applyingAsConsortium: formData.applyingAsConsortium,
          keyPersonnel,
          consortiumMembers,
          uploadedFiles: uploadedFilesBase64,
        },
        status,
        createdAt: currentEOIId ? eoiStorage.getEOI(eoiStorageId, projectId)?.createdAt || now : now,
        updatedAt: now,
      }

      // Save the EOI
      eoiStorage.saveEOI(eoiToSave)

      // Update current EOI ID if it's new
      if (!currentEOIId) {
        setCurrentEOIId(eoiStorageId)
      }

      formStorage.remove(FORM_STORAGE_KEY)
      toast.success("Expression of Interest saved as draft successfully!")
      router.push("/projects")
    } catch (error) {
      console.error("Error saving EOI to localStorage:", error)
      toast.error("Failed to save EOI draft")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Function to load a specific EOI by ID
  const loadEOIFromStorage = async (eoiId: string) => {
    if (!projectId) {
      toast.error("Project ID is missing")
      return
    }

    const eoi = eoiStorage.getEOI(eoiId, projectId)
    if (!eoi) {
      toast.error("EOI draft not found")
      return
    }

    // Convert base64 back to files
    const files: Record<string, File | null> = {}

    for (const [key, base64] of Object.entries(eoi.data.uploadedFiles)) {
      if (base64) {
        try {
          const file = eoiStorage.base64ToFile(base64, `${key}-file`)
          files[key] = file
        } catch (error) {
          console.error(`Error converting base64 to file for ${key}:`, error)
          files[key] = null
        }
      } else {
        files[key] = null
      }
    }

    // Update form data
    setFormData({
      companyBio: eoi.data.companyBio,
      experience: eoi.data.experience,
      portfolioLink: eoi.data.portfolioLink,
      projectPlan: eoi.data.projectPlan,
      submissionFee: eoi.data.submissionFee,
      applyingAsConsortium: eoi.data.applyingAsConsortium
    })

    setKeyPersonnel(eoi.data.keyPersonnel)
    setConsortiumMembers(eoi.data.consortiumMembers)
    setUploadedFiles(files)
    setCurrentEOIId(eoiId)

    // Clear any existing validation errors
    setValidationErrors({})

    toast.success("EOI draft loaded successfully!")
  }

  const handleSubmit = async (e: React.FormEvent, action: "save" | "submit" = "submit") => {
    e.preventDefault()

    if (!projectId) {
      toast.error("Project ID is missing")
      return
    }

    // For submission, validate first before proceeding
    if (action === "submit") {
      if (!validateForm()) {
        showValidationErrors(validationErrors)
        return
      }
      // Show confirmation modal instead of immediately submitting
      setShowSubmitConfirmation(true)
      return
    }

    setIsSubmitting(true)

    try {
      if (action === "save") {
        await saveEOIToLocalStorage("draft")
        return
      }

      const fileUrls = await uploadFiles()

      const keyPersonnelData: KeyPersonnel[] = keyPersonnel
        .filter((person) => person.name.trim() && person.role.trim())
        .map((person) => ({
          name: person.name,
          role: person.role,
        }))

      // Only include consortium members if applying as consortium
      const consortiumMembersData: ConsortiumMember[] = formData.applyingAsConsortium
        ? consortiumMembers
            .filter((member) => member.memberName.trim())
            .map((member) => ({
              member_name: member.memberName,
              role: member.role,
              country_of_incorporation: member.country,
              registration_number: member.registrationNumber,
            }))
        : []

      let result

      // For resubmissions, use the resubmit endpoint
      if (isResubmission && eoiId) {
        const resubmitData = {
          company_bio: formData.companyBio,
          interest_letter_url: fileUrls.interestLetter || "",
          key_personnel: keyPersonnelData,
          experience: formData.experience,
          portfolio_link: formData.portfolioLink.trim() ? formData.portfolioLink : undefined,
          portfolio_file_url: fileUrls.portfolioFile || undefined,
          client_reference_url: fileUrls.clientRef1 || "",
          project_plan: formData.projectPlan,
          consortium_members: consortiumMembersData,
          consortium_agreement_url: formData.applyingAsConsortium ? fileUrls.consortiumAgreement || undefined : undefined,
          bank_statement_url: fileUrls.bankStmt1 || undefined,
          proof_of_funds_url: fileUrls.proofFunds1 || undefined,
        }

        result = await eoiAPI.resubmit(eoiId, resubmitData)

        if (result.success) {
          try {
            await notificationAPI.create({
              title: "EOI Resubmitted",
              message: `Expression of Interest for ${existingEOI?.id || "project"} has been resubmitted.`,
              notification_type: "EOI_RESUBMITTED",
              related_object_type: "eoi",
              related_object_id: eoiId,
            })
          } catch (error) {
            console.error("Failed to create notification:", error)
          }
        }
      } else {
        // New submission
        const eoiData: EOISubmissionData = {
          project_id: projectId,
          company_bio: formData.companyBio,
          interest_letter_url: fileUrls.interestLetter || "",
          key_personnel: keyPersonnelData,
          experience: formData.experience,
          portfolio_link: formData.portfolioLink.trim() ? formData.portfolioLink : undefined,
          portfolio_file_url: fileUrls.portfolioFile || undefined,
          client_reference_url: fileUrls.clientRef1 || "",
          project_plan: formData.projectPlan,
          consortium_members: formData.applyingAsConsortium ? consortiumMembersData : undefined,
          consortium_agreement_url: formData.applyingAsConsortium ? fileUrls.consortiumAgreement || undefined : undefined,
          bank_statement_url: fileUrls.bankStmt1 || undefined,
          proof_of_funds_url: fileUrls.proofFunds1 || undefined,
          submission_fee: formData.submissionFee || "",
          action: "submit",
          status: "submit",
        }

        result = await eoiAPI.submit(eoiData)

        if (result.success) {
          try {
            const eoiId = (result.data as EOI).id
            await notificationAPI.create({
              title: "New EOI Submission",
              message: `A new Expression of Interest has been submitted.`,
              notification_type: "EOI_SUBMITTED",
              related_object_type: "eoi",
              related_object_id: eoiId,
            })
          } catch (error) {
            console.error("Failed to create notification:", error)
          }
        }
      }

      if (result.success) {
        if (action === "submit") {
          const submittedEOI = result.data as EOI
          setEoiId(submittedEOI.id)
          setReferenceId(submittedEOI.reference_id)

          formStorage.remove(FORM_STORAGE_KEY)
          // Clean up localStorage if EOI was submitted
          if (currentEOIId) {
            eoiStorage.deleteEOI(currentEOIId, projectId)
          }
          setShowSuccessModal(true)
        } else {
          toast.success("Expression of Interest saved as draft")
          if (result.data?.id) {
            setEoiId(result.data.id)
          }
          formStorage.remove(FORM_STORAGE_KEY)
        }
      } else {
        console.error("EOI submission failed:", result)
        throw new Error(result.message || "Failed to submit EOI")
      }
    } catch (error: unknown) {
      console.error("EOI submission error:", error)

      if (error instanceof AxiosError) {
        const errorData = error.response?.data as
          | {
            message?: string
            extra?: {
              fields?: Record<string, string[]>
            }
          }
          | undefined

        // Check for portfolio_link error specifically
        if (errorData?.extra?.fields?.portfolio_link) {
          const portfolioError = errorData.extra.fields.portfolio_link[0]
          toast.error(`Error in portfolio link. ${portfolioError}`)
        } else if (errorData?.message) {
          toast.error(errorData.message)
        } else {
          toast.error("Failed to submit Expression of Interest")
        }
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to submit Expression of Interest"
        toast.error(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Function to handle confirmed submission
  const handleConfirmedSubmit = async () => {
    setShowSubmitConfirmation(false)
    setIsSubmitting(true)

    try {
      const fileUrls = await uploadFiles()

      const keyPersonnelData: KeyPersonnel[] = keyPersonnel
        .filter((person) => person.name.trim() && person.role.trim())
        .map((person) => ({
          name: person.name,
          role: person.role,
        }))

      // Only include consortium members if applying as consortium
      const consortiumMembersData: ConsortiumMember[] = formData.applyingAsConsortium
        ? consortiumMembers
            .filter((member) => member.memberName.trim())
            .map((member) => ({
              member_name: member.memberName,
              role: member.role,
              country_of_incorporation: member.country,
              registration_number: member.registrationNumber,
            }))
        : []

      let result

      // For resubmissions, use the resubmit endpoint
      if (isResubmission && eoiId) {
        const resubmitData = {
          company_bio: formData.companyBio,
          interest_letter_url: fileUrls.interestLetter || "",
          key_personnel: keyPersonnelData,
          experience: formData.experience,
          portfolio_link: formData.portfolioLink.trim() ? formData.portfolioLink : undefined,
          portfolio_file_url: fileUrls.portfolioFile || undefined,
          client_reference_url: fileUrls.clientRef1 || "",
          project_plan: formData.projectPlan,
          consortium_members: consortiumMembersData,
          consortium_agreement_url: formData.applyingAsConsortium ? fileUrls.consortiumAgreement || undefined : undefined,
          bank_statement_url: fileUrls.bankStmt1 || undefined,
          proof_of_funds_url: fileUrls.proofFunds1 || undefined,
        }

        result = await eoiAPI.resubmit(eoiId, resubmitData)

        if (result.success) {
          try {
            await notificationAPI.create({
              title: "EOI Resubmitted",
              message: `Expression of Interest for ${existingEOI?.id || "project"} has been resubmitted.`,
              notification_type: "EOI_RESUBMITTED",
              related_object_type: "eoi",
              related_object_id: eoiId,
            })
          } catch (error) {
            console.error("Failed to create notification:", error)
          }
        }
      } else {
        // New submission
        const eoiData: EOISubmissionData = {
          project_id: projectId,
          company_bio: formData.companyBio,
          interest_letter_url: fileUrls.interestLetter || "",
          key_personnel: keyPersonnelData,
          experience: formData.experience,
          portfolio_link: formData.portfolioLink.trim() ? formData.portfolioLink : undefined,
          portfolio_file_url: fileUrls.portfolioFile || undefined,
          client_reference_url: fileUrls.clientRef1 || "",
          project_plan: formData.projectPlan,
          consortium_members: formData.applyingAsConsortium ? consortiumMembersData : undefined,
          consortium_agreement_url: formData.applyingAsConsortium ? fileUrls.consortiumAgreement || undefined : undefined,
          bank_statement_url: fileUrls.bankStmt1 || undefined,
          proof_of_funds_url: fileUrls.proofFunds1 || undefined,
          submission_fee: formData.submissionFee || "",
          action: "submit",
          status: "submit",
        }

        result = await eoiAPI.submit(eoiData)

        if (result.success) {
          try {
            const eoiId = (result.data as EOI).id
            await notificationAPI.create({
              title: "New EOI Submission",
              message: `A new Expression of Interest has been submitted.`,
              notification_type: "EOI_SUBMITTED",
              related_object_type: "eoi",
              related_object_id: eoiId,
            })
          } catch (error) {
            console.error("Failed to create notification:", error)
          }
        }
      }

      if (result.success) {
        const submittedEOI = result.data as EOI
        setEoiId(submittedEOI.id)
        setReferenceId(submittedEOI.reference_id)

        formStorage.remove(FORM_STORAGE_KEY)
        // Clean up localStorage if EOI was submitted
        if (currentEOIId) {
          eoiStorage.deleteEOI(currentEOIId, projectId)
        }
        setShowSuccessModal(true)
      } else {
        console.error("EOI submission failed:", result)
        throw new Error(result.message || "Failed to submit EOI")
      }
    } catch (error: unknown) {
      console.error("EOI submission error:", error)

      if (error instanceof AxiosError) {
        const errorData = error.response?.data as
          | {
            message?: string
            extra?: {
              fields?: Record<string, string[]>
            }
          }
          | undefined

        // Check for portfolio_link error specifically
        if (errorData?.extra?.fields?.portfolio_link) {
          const portfolioError = errorData.extra.fields.portfolio_link[0]
          toast.error(`Error in portfolio link. ${portfolioError}`)
        } else if (errorData?.message) {
          toast.error(errorData.message)
        } else {
          toast.error("Failed to submit Expression of Interest")
        }
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to submit Expression of Interest"
        toast.error(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = (e: React.FormEvent) => {
    handleSubmit(e, "save")
  }

  const UploadField = ({
    id,
    label,
    isRequiredField = false,
    accept = ".pdf,.docx,.jpg,.png",
    maxSizeMB = 10,
    note,
  }: {
    id: string
    label: string
    isRequiredField?: boolean
    accept?: string
    maxSizeMB?: number
    note?: string
  }) => {
    // Get the error message for this specific field
    const errorMessage = validationErrors[id as keyof ValidationErrors]

    return (
      <div className="space-y-2">
        <Label className="text-base font-semibold">{label} {isRequiredField && (<span className="text-red-600">*</span>)}</Label>
        <div
          className={`border-2 border-dashed rounded-lg p-4 hover:border-muted-foreground/50 transition-colors cursor-pointer ${errorMessage ? "border-red-500 bg-red-50" : ""
            }`}
          onClick={() => document.getElementById(id)?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) handleFileUpload(file, id)
          }}
        >
          <div className="flex gap-2 justify-between items-center">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop or browse (.pdf, .docx, .jpg, .png up to {maxSizeMB} MB)
              </p>
            </div>
            <span className="border p-2 rounded-md shrink-0 border-[#C13C3D] text-[#C13C3D] bg-[#EED8D8]">
              <Upload className="h-4 w-4" />
            </span>
          </div>
        </div>

        <input
          id={id}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file, id)
          }}
        />

        {/* Only render error message if it's a string */}
        {typeof errorMessage === "string" && <p className="text-sm text-red-600 mt-1">{errorMessage}</p>}

        {uploadedFiles[id] && (
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-foreground">Uploaded: {uploadedFiles[id]?.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => handleFileRemove(id)}
            >
              Remove
            </Button>
          </div>
        )}

        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
    )
  }

  if (isDraftLoading || !projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto md:px-4 py-6 max-w-7xl">
        {/* Submit Confirmation Dialog */}
        <AlertDialog open={showSubmitConfirmation} onOpenChange={setShowSubmitConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to submit your Expression of Interest? 
                {!isResubmission && " You will be required to pay a processing fee to complete your submission."}
                
                {isResubmission && (
                  <span className="block mt-2 text-amber-600 font-medium">
                    Note: This is a resubmission of a previously rejected EOI.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmedSubmit}
                disabled={isSubmitting}
                className="bg-[#C13C3D] hover:bg-[#A02F30]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Yes, Submit EOI"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link href="/projects" className="hover:text-foreground">
            Projects
          </Link>
          <span>/</span>
          <Link href={`/projects/${projectId}`} className="hover:text-foreground line-clamp-1">
            Project Details
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Expression of Interest</span>
        </div>

        <div className="bg-card border rounded-lg mx-auto max-w-5xl space-y-8">
          <form onSubmit={(e) => handleSubmit(e, "submit")}>
            {/* Header */}
            <div className="p-5 border-b">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {isResubmission ? "Resubmit Expression of Interest" : "Expression of Interest"}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isResubmission
                  ? "Your previous submission was rejected. Please update your information and resubmit for review."
                  : "Fill out this form to indicate your interest in this project. Ensure all information is accurate before submitting."}
                {!isResubmission && " You'll be required to pay a processing fee to register your submission."}
              </p>
              {isResubmission && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-amber-800 text-sm">
                    <strong>Note:</strong> Your previous EOI was rejected. Please review and update all information
                    before resubmitting.
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 space-y-8">
              {/* Saved EOIs Loader */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-1">Saved Drafts</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Load a previously saved draft to continue working on it.
                </p>
                <SavedEOIsLoader projectId={projectId} onEOISelect={loadEOIFromStorage} currentEOIId={currentEOIId} />
              </div>

              {/* Company Profile - REQUIRED */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-base font-semibold">
                  Company profile <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="bio"
                  placeholder="Briefly describe your company's background, mission, and areas of expertise"
                  className={`min-h-32 resize-none ${validationErrors.companyBio ? "border-red-500 focus:border-red-500" : ""
                    }`}
                  value={formData.companyBio}
                  onChange={(e) => handleInputChange("companyBio", e.target.value)}
                />
                {validationErrors.companyBio && <p className="text-sm text-red-600">{validationErrors.companyBio}</p>}
              </div>

              {/* Interest Letter - REQUIRED */}
              <UploadField
                id="interestLetter"
                label="Interest letter"
                isRequiredField={true}
                note="*Ensure letter is printed on company letterhead and includes visible signature and stamp"
              />

              {/* Project Plan - MOVED HERE, OPTIONAL */}
              <div className="space-y-2">
                <Label htmlFor="project-plan" className="text-base font-semibold">
                  Project plan (optional)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Describe in detail your proposed concept for developing this project.
                </p>
                <Textarea
                  id="project-plan"
                  placeholder="E.g. Your vision and development approach, proposed phasing plan, operation/management model, community participation strategy, sustainability and ESG integration"
                  className={`min-h-32 resize-none ${validationErrors.projectPlan || countWords(formData.projectPlan) > MAX_WORDS ? "border-red-500 focus:border-red-500" : ""
                    }`}
                  value={formData.projectPlan}
                  onChange={(e) => handleInputChange("projectPlan", e.target.value)}
                  aria-describedby="project-plan-word-counter"
                  aria-invalid={countWords(formData.projectPlan) > MAX_WORDS}
                />
                <WordCounter value={formData.projectPlan} fieldId="project-plan" />
                {validationErrors.projectPlan && <p className="text-sm text-red-600">{validationErrors.projectPlan}</p>}
              </div>

              {/* Key Personnel - REQUIRED */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Key personnel <span className="text-red-600">*</span></Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add names and roles of team members who will contribute to this project.
                  </p>
                  {validationErrors.keyPersonnel && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.keyPersonnel}</p>
                  )}
                </div>
                <div className="space-y-3">
                  {keyPersonnel.map((person, index) => (
                    <div key={person.id} className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 items-center">
                      <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                      <div className="space-y-1">
                        <Input
                          placeholder="Personnel name"
                          className={`bg-muted/50 ${validationErrors.keyPersonnelItems?.[person.id]?.name ? "border-red-500" : ""
                            }`}
                          value={person.name}
                          onChange={(e) => handleKeyPersonnelChange(person.id, "name", e.target.value)}
                        />
                        {validationErrors.keyPersonnelItems?.[person.id]?.name && (
                          <p className="text-xs text-red-600">{validationErrors.keyPersonnelItems[person.id].name}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Input
                          placeholder="Role"
                          className={`bg-muted/50 ${validationErrors.keyPersonnelItems?.[person.id]?.role ? "border-red-500" : ""
                            }`}
                          value={person.role}
                          onChange={(e) => handleKeyPersonnelChange(person.id, "role", e.target.value)}
                        />
                        {validationErrors.keyPersonnelItems?.[person.id]?.role && (
                          <p className="text-xs text-red-600">{validationErrors.keyPersonnelItems[person.id].role}</p>
                        )}
                      </div>
                      {keyPersonnel.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deleteKeyPersonnel(person.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addKeyPersonnel}
                  className="text-sm text-[#C13C3D] hover:underline font-medium"
                >
                  + Add More Members
                </button>
              </div>

              {/* Experience - REQUIRED */}
              <div className="space-y-2">
                <Label htmlFor="experience" className="text-base font-semibold">
                  Experience <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="experience"
                  placeholder="Summarise your organisation's experience in implementing or supervising PPP projects."
                  className={`min-h-32 resize-none ${validationErrors.experience ? "border-red-500 focus:border-red-500" : ""
                    }`}
                  value={formData.experience}
                  onChange={(e) => handleInputChange("experience", e.target.value)}
                />
                {validationErrors.experience && <p className="text-sm text-red-600">{validationErrors.experience}</p>}
              </div>

              {/* Portfolio - OPTIONAL */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Portfolio (optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Please attach a portfolio containing up to 5 relevant projects (optional).
                </p>
                <p className="text-sm text-muted-foreground">
                  Provide either a portfolio link (must start with <span className="font-medium">https://</span>) OR upload a portfolio file.
                </p>
                
                <div className="flex gap-3">
                  <Input
                    placeholder="https://example.com/portfolio"
                    className={`flex-1 ${validationErrors.portfolioLink ? "border-red-500 focus:border-red-500" : ""}`}
                    value={formData.portfolioLink}
                    onChange={(e) => handleInputChange("portfolioLink", e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">or upload a document</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 border-[#C13C3D] text-[#C13C3D] bg-[#EED8D8]"
                      onClick={() => document.getElementById("portfolioFile")?.click()}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Portfolio Validation Error - Only show if trying to submit invalid URL */}
                {validationErrors.portfolioLink && (
                  <p className="text-sm text-red-600">{validationErrors.portfolioLink}</p>
                )}
                
                <input
                  id="portfolioFile"
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, "portfolioFile")
                  }}
                />
                
                {/* Show uploaded portfolio file */}
                {uploadedFiles.portfolioFile && (
                  <div className="flex items-center justify-between mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-800 font-medium">Portfolio file uploaded:</span>
                      <span className="text-sm text-green-700">{uploadedFiles.portfolioFile.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleFileRemove("portfolioFile")}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {/* Financial Information - MOVED HERE, OPTIONAL */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Financial information (optional)</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Provide evidence of your organisation&apos;s financial standing to support this Expression of Interest.
                  </p>
                </div>

                {/* Bank Statements */}
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">Bank statement (Optional)</Label>
                  <UploadField key={`bankStmt`} id={`bankStmt`} label={`Statement`} />
                </div>

                {/* Proof of Funds */}
                <div className="space-y-3 mt-4">
                  <Label className="text-sm text-muted-foreground">Proof of funds (Optional)</Label>
                  <UploadField key={`proofFunds`} id={`proofFunds`} label={`Proof`} />
                </div>
              </div>

              {/* Client Reference - OPTIONAL, MOVED AFTER FINANCIAL */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Client reference (optional)</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload signed reference letters from previous clients that verify your performance or experience.
                  </p>
                </div>
                {[1, 2].map((num) => (
                  <UploadField key={`clientRef${num}`} id={`clientRef${num}`} label={`Reference Letter ${num}`} />
                ))}
              </div>

              {/* Consortium Toggle */}
              <div className="space-y-4 border rounded-lg p-4">
                <Label className="text-base font-semibold">
                  Are you applying as a consortium? <span className="text-red-600">*</span>
                </Label>
                <RadioGroup
                  value={formData.applyingAsConsortium ? "yes" : "no"}
                  onValueChange={(value) => handleInputChange("applyingAsConsortium", value === "yes")}
                  className="flex gap-6 mt-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="no" id="consortium-no" />
                    <Label htmlFor="consortium-no" className="text-sm font-medium cursor-pointer">
                      No
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="yes" id="consortium-yes" />
                    <Label htmlFor="consortium-yes" className="text-sm font-medium cursor-pointer">
                      Yes
                    </Label>
                  </div>
                </RadioGroup>
                {validationErrors.applyingAsConsortium && (
                  <p className="text-sm text-red-600">{validationErrors.applyingAsConsortium}</p>
                )}
              </div>

              {/* Consortium Details - Only show if applying as consortium */}
              {formData.applyingAsConsortium && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Consortium details</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add details for organisations in your consortium.
                    </p>
                  </div>

                  {consortiumMembers.map((member, index) => (
                    <div key={member.id} className="space-y-4 p-4 border rounded-lg relative">
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteConsortiumMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Member name <span className="text-red-600">*</span></Label>
                          <Input
                            placeholder="Enter full member name"
                            value={member.memberName}
                            onChange={(e) => handleConsortiumMemberChange(member.id, "memberName", e.target.value)}
                            className={
                              validationErrors.consortiumMembersItems?.[member.id]?.memberName ? "border-red-500" : ""
                            }
                          />
                          {validationErrors.consortiumMembersItems?.[member.id]?.memberName && (
                            <p className="text-xs text-red-600">
                              {validationErrors.consortiumMembersItems[member.id].memberName}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Role <span className="text-red-600">*</span></Label>
                          <Input
                            placeholder="Enter member role"
                            value={member.role}
                            onChange={(e) => handleConsortiumMemberChange(member.id, "role", e.target.value)}
                            className={validationErrors.consortiumMembersItems?.[member.id]?.role ? "border-red-500" : ""}
                          />
                          {validationErrors.consortiumMembersItems?.[member.id]?.role && (
                            <p className="text-xs text-red-600">
                              {validationErrors.consortiumMembersItems[member.id].role}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Country of incorporation <span className="text-red-600">*</span></Label>
                          <Select
                            value={member.country}
                            onValueChange={(value) => handleConsortiumMemberChange(member.id, "country", value)}
                          >
                            <SelectTrigger
                              className={`w-full ${validationErrors.consortiumMembersItems?.[member.id]?.country ? "border-red-500" : ""
                                }`}
                            >
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {validationErrors.consortiumMembersItems?.[member.id]?.country && (
                            <p className="text-xs text-red-600">
                              {validationErrors.consortiumMembersItems[member.id].country}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Registration number <span className="text-red-600">*</span></Label>
                          <Input
                            placeholder="e.g. RC1234567890"
                            value={member.registrationNumber}
                            onChange={(e) =>
                              handleConsortiumMemberChange(member.id, "registrationNumber", e.target.value)
                            }
                            className={
                              validationErrors.consortiumMembersItems?.[member.id]?.registrationNumber
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {validationErrors.consortiumMembersItems?.[member.id]?.registrationNumber && (
                            <p className="text-xs text-red-600">
                              {validationErrors.consortiumMembersItems[member.id].registrationNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    onClick={addConsortiumMember}
                    variant="outline"
                    className="border-[#C13C3D] text-[#C13C3D] hover:bg-[#C13C3D]/10 bg-transparent"
                  >
                    + Add New Member
                  </Button>

                  <UploadField
                    id="consortiumAgreement"
                    label="Consortium agreement"
                    isRequiredField={true}
                    note="Drag and drop or browse to upload (.pdf, .docx, .jpg, .png up to 5 MB max)"
                  />
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => router.push(`/projects/${projectId}`)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-[#C13C3D] border-[#C13C3D] bg-transparent"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save for Later"}
                </Button>
                <Button
                  type="submit"
                  className="bg-[#C13C3D] hover:bg-[#A02F30] text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Complete & Submit"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <SuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        projectId={projectId}
        referenceId={referenceId}
      />
    </div>
  )
}