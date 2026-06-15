"use client"

import { use, useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Paperclip, Upload, Trash2, Download, Eye } from 'lucide-react'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { proposalStorage, type ProposalDraft } from "@/lib/storage/proposalStorage"
import { proposalAPI } from "@/lib/api/proposals"
import { eoiAPI } from "@/lib/api/eoi"
import { cloudinaryAPI, type CloudinaryUploadResult } from "@/lib/cloudinary"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface EOI {
  id: string
  project_title: string
  project_id: string
}

// Component to display saved drafts
function SavedDraftsLoader({
  eoiId,
  onDraftSelect,
  currentDraftId
}: {
  eoiId: string
  onDraftSelect: (draftId: string) => void
  currentDraftId: string
}) {
  const [drafts, setDrafts] = useState<ProposalDraft[]>([])

  useEffect(() => {
    const savedDrafts = proposalStorage.getDrafts(eoiId)
    setDrafts(savedDrafts)
  }, [eoiId])

  const handleDeleteDraft = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this draft?")) {
      proposalStorage.deleteDraft(draftId)
      setDrafts(proposalStorage.getDrafts(eoiId))
      toast.success("Draft deleted successfully")
    }
  }

  if (drafts.length === 0) {
    return <div className="text-sm text-muted-foreground">No saved drafts found.</div>
  }

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className={cn(
            "flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
            currentDraftId === draft.id ? "border-primary bg-primary/5" : "border-border"
          )}
          onClick={() => onDraftSelect(draft.id)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">
                {draft.summary ? `Draft - ${draft.summary.substring(0, 30)}...` : "Untitled Proposal"}
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Draft</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Updated: {new Date(draft.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleDeleteDraft(draft.id, e)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}

// Helper function to get file type for download
const getFileTypeFromUrl = (url: string): string => {
  const extension = url.split('.').pop()?.toLowerCase() || ''
  if (['pdf'].includes(extension)) return 'PDF'
  if (['doc', 'docx'].includes(extension)) return 'Word'
  if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return 'Image'
  return 'Document'
}

export default function SubmitProposalPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <SubmitProposalForm params={params} />
    </Suspense>
  )
}

function SubmitProposalForm({ params }: { params: Promise<{ id: string }> }) {
  const { id: eoiId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const resubmitProposalId = searchParams.get("resubmit") // proposal ID to resubmit
  const isResubmission = !!resubmitProposalId

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [eoi, setEoi] = useState<EOI | null>(null)
  const [summary, setSummary] = useState("")
  const [implementationPlan, setImplementationPlan] = useState("")
  const [document, setDocument] = useState<File | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string>("")
  const [currentDraftId, setCurrentDraftId] = useState("")
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false)

  useEffect(() => {
    fetchEOI()
  }, [eoiId])

  // If resubmitting, pre-fill the form with the existing proposal data
  useEffect(() => {
    if (!resubmitProposalId) return
    const prefill = async () => {
      try {
        const res = await proposalAPI.getById(resubmitProposalId)
        if (res.success && res.data) {
          const p = res.data
          if (p.status !== "rejected" && p.status !== "withdrawn") {
            toast.error("Only rejected or withdrawn proposals can be resubmitted.")
            return
          }
          setSummary(p.summary || "")
          setImplementationPlan(p.implementation_plan || "")
          if (p.document_url) setDocumentUrl(p.document_url)
          toast.success(
            p.status === "withdrawn"
              ? "Withdrawn proposal loaded. Update your content and resubmit."
              : "Rejected proposal loaded. Update your content and resubmit."
          )
        }
      } catch {
        toast.error("Failed to load proposal for resubmission.")
      }
    }
    prefill()
  }, [resubmitProposalId])

  const fetchEOI = async () => {
    try {
      const response = await eoiAPI.get(eoiId)
      if (response.success && response.data) {
        setEoi({
          id: response.data.id,
          project_title: response.data.project_title || "Project",
          project_id: response.data.project_id,
        })
      } else {
        throw new Error("Failed to fetch EOI")
      }
    } catch (error) {
      console.error("Error fetching EOI:", error)
      toast.error("Failed to load EOI details")
      router.push("/eoi")
    } finally {
      setLoading(false)
    }
  }

  // Generate unique draft ID
  const generateDraftId = () => {
    return `proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Load draft from localStorage
  const loadDraft = async (draftId: string) => {
    const draft = proposalStorage.getDraft(draftId)
    if (!draft) {
      toast.error("Draft not found")
      return
    }

    setSummary(draft.summary)
    setImplementationPlan(draft.implementationPlan)

    // Load document URL from draft
    if (draft.document instanceof File) {
      setDocument(draft.document)
      setDocumentUrl("")
    } else if (typeof draft.document === "string") {
      setDocument(null)
      setDocumentUrl(draft.document)
    }


    setCurrentDraftId(draftId)
    toast.success("Draft loaded successfully")
  }

  // Save draft to localStorage
  const saveDraft = async () => {
    setLoading(true)
    try {
      const draftId = currentDraftId || generateDraftId()
      const now = new Date().toISOString()

      const draft: ProposalDraft = {
        id: draftId,
        eoiId,
        summary,
        implementationPlan,
        document: document ? document : documentUrl ? documentUrl : null,
        status: "draft",
        createdAt: currentDraftId ? proposalStorage.getDraft(draftId)?.createdAt || now : now,
        updatedAt: now
      }

      proposalStorage.saveDraft(draft)

      if (!currentDraftId) {
        setCurrentDraftId(draftId)
      }

      toast.success("Proposal saved as draft")
      router.push("/proposals")
    } catch (error) {
      console.error("Error saving draft:", error)
      toast.error("Failed to save draft")
    } finally {
      setLoading(false)
    }
  }

  // Download document
  const handleDownload = async (url: string, filename?: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)

      const a = window.document.createElement('a')  // ← NOW CORRECT
      a.href = downloadUrl
      a.download = filename || `proposal-document-${Date.now()}`
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)

      window.URL.revokeObjectURL(downloadUrl)
      toast.success("Document downloaded successfully")
    } catch (error) {
      console.error("Error downloading document:", error)
      toast.error("Failed to download document")
    }
  }


  // View document in new tab
  const handleView = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleSubmit = async () => {
    setLoading(true)
    setShowSubmitConfirmation(false)
    try {
      let finalDocumentUrl = documentUrl

      // Upload document if a new file is selected
      if (document && !documentUrl) {
        setUploading(true)
        const cloudinaryResult: CloudinaryUploadResult = await cloudinaryAPI.uploadFile(
          document,
          "proposals",
          "auto"
        )
        finalDocumentUrl = cloudinaryResult.secure_url
        setDocumentUrl(finalDocumentUrl)
      }

      let result

      if (isResubmission && resubmitProposalId) {
        // Resubmit the existing rejected proposal
        result = await proposalAPI.resubmit(resubmitProposalId, {
          summary,
          implementation_plan: implementationPlan,
          document_url: finalDocumentUrl,
          action: "submit",
          status: "submitted",
        })
      } else {
        // Create a new proposal
        result = await proposalAPI.create({
          eoi_id: eoiId,
          summary,
          implementation_plan: implementationPlan,
          document_url: finalDocumentUrl,
          action: "submit",
          status: "submitted",
        })
      }

      if (result.success) {
        // Clean up localStorage on successful submission
        if (currentDraftId) {
          proposalStorage.deleteDraft(currentDraftId)
        }
        toast.success(isResubmission ? "Proposal resubmitted successfully" : "Proposal submitted successfully")
        router.push("/proposals")
      } else {
        throw new Error(result.message || "Failed to submit proposal")
      }
    } catch (error) {
      console.error("Error submitting proposal:", error)
      toast.error(error instanceof Error ? error.message : "Failed to submit proposal")
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]

      // Validate file type and size
      const allowedTypes = ['.pdf', '.docx', '.jpg', '.jpeg', '.png']
      const maxSize = 5 * 1024 * 1024 // 5MB

      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

      if (!fileExtension || !allowedTypes.includes(fileExtension)) {
        toast.error("Invalid file type. Please upload PDF, DOCX, JPG, or PNG files.")
        return
      }

      if (file.size > maxSize) {
        toast.error("File size too large. Please upload files up to 5 MB.")
        return
      }

      setDocument(file)
      setDocumentUrl("")
    }
  }

  const handleFileRemove = () => {
    setDocument(null)
    setDocumentUrl("")
  }

  // Get display name for the document
  const getDocumentDisplayName = (): string => {
    return document ? document.name : "Supporting Document"
  }

  // Get download filename
  const getDownloadFilename = (): string => {
    return document ? document.name : 'proposal-document'
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!eoi) {
    return <div className="p-8">EOI not found</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto md:p-4">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-3 lg:col-span-2">
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
                <Link href="/eoi" className="hover:text-foreground">EOI</Link>
                <span>/</span>
                <Link href={`/eoi/${eoi.id}`} className="hover:text-foreground line-clamp-1">#{eoi.id}</Link>
                <span>/</span>
                <span className="text-foreground font-medium">Project Proposal</span>
              </div>

              <p className="mb-8 text-sm text-muted-foreground">
                {isResubmission
                  ? "Update your proposal content below and resubmit for review."
                  : "Fill in the details carefully. Once submitted, action cannot be undone."}
              </p>

              {/* Saved Drafts Section */}
              <div className="mb-8 space-y-4">
                <h2 className="text-xl font-semibold">Saved Drafts</h2>
                <p className="text-sm text-muted-foreground">
                  Load a previously saved draft to continue working on it.
                </p>
                <SavedDraftsLoader
                  eoiId={eoiId}
                  onDraftSelect={loadDraft}
                  currentDraftId={currentDraftId}
                />
              </div>

              {/* Summary Section */}
              <div className="mb-8">
                <Label htmlFor="summary" className="mb-2 text-lg font-semibold">
                  Summary
                </Label>
                <Textarea
                  id="summary"
                  placeholder="Discuss your proposal for this project in a few words."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="min-h-[150px] resize-none"
                />
              </div>

              {/* Implementation Plan Section */}
              <div className="mb-8">
                <Label htmlFor="implementation" className="mb-2 text-lg font-semibold">
                  Implementation plan
                </Label>
                <Textarea
                  id="implementation"
                  placeholder="Provide detailed implementation plan for this project."
                  value={implementationPlan}
                  onChange={(e) => setImplementationPlan(e.target.value)}
                  className="min-h-[200px] resize-none"
                />
              </div>

              {/* Supporting Document Section */}
              <div className="mb-8">
                <Label className="mb-2 text-lg font-semibold block">Supporting document</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Attach one document to support your proposal writeup.
                </p>

                {/* Uploaded file */}
                {(document || documentUrl) && (
                  <div className="flex items-center gap-3 mb-4 p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3 flex-1">
                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">
                            {getDocumentDisplayName()}
                          </span>
                          {documentUrl && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                              {getFileTypeFromUrl(documentUrl)}
                            </span>
                          )}
                        </div>
                        {documentUrl && (
                          <p className="text-xs text-green-600">
                            Uploaded!
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {documentUrl && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(documentUrl)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="View document"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(documentUrl, getDownloadFilename())}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Download document"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleFileRemove}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remove document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Upload new file */}
                {!document && !documentUrl && (
                  <div className="flex items-center gap-3 p-4 border-2 border-dashed cursor-pointer rounded-lg hover:border-muted-foreground/50 transition-colors"
                    onClick={() => window.document.getElementById("file-upload")?.click()}
                    onDragOver={(e) => e.preventDefault()}>
                    <div className="flex items-center gap-3 flex-1">
                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Drag and drop file here or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports: PDF, DOCX, JPG, PNG (Max 5MB)
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".pdf,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 border-[#C13C3D] text-[#C13C3D] bg-[#EED8D8]"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>

                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => router.back()} disabled={loading || uploading}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={saveDraft} disabled={loading || uploading}>
                  Save for Later
                </Button>
                
                {/* Submit Proposal Button with Confirmation Dialog */}
                <AlertDialog open={showSubmitConfirmation} onOpenChange={setShowSubmitConfirmation}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      disabled={loading || uploading || !summary || !implementationPlan}
                      className="bg-[#C13C3D] hover:bg-[#A02F30] text-white"
                    >
                      {uploading ? "Uploading..." : loading ? "Submitting..." : isResubmission ? "Resubmit Proposal" : "Submit Proposal"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>{isResubmission ? "Confirm Proposal Resubmission" : "Confirm Proposal Submission"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to submit this proposal? This action cannot be undone.
                      
                      {document && !documentUrl && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
                          <strong>Note:</strong> Your document will be uploaded during submission. 
                          This may take a few moments depending on file size.
                        </div>
                      )}

                      {documentUrl && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
                          <strong>Ready:</strong> Your document is already uploaded and ready for submission.
                        </div>
                      )}

                      {!document && !documentUrl && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800 text-sm">
                          <strong>Note:</strong> You are submitting without a supporting document.
                        </div>
                      )}
                    </AlertDialogDescription>
                    <div className="flex justify-end gap-3 mt-6">
                      <AlertDialogCancel asChild>
                        <Button variant="outline" disabled={loading || uploading}>
                          Cancel
                        </Button>
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleSubmit}
                        disabled={loading || uploading}
                        className="bg-[#C13C3D] hover:bg-[#A02F30] text-white"
                      >
                        {uploading ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Uploading Document...
                          </>
                        ) : loading ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Submitting...
                          </>
                        ) : (
                          "Yes, Submit Proposal"
                        )}
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="col-span-3 lg:col-span-1 lg:sticky lg:top-6 lg:self-start">
            <div className="bg-background rounded-lg border border-border min-h-[600px]">
              <div className="mb-6 border-b p-4">
                <h2 className="text-lg font-semibold mb-1">Preview Proposal</h2>
                <p className="text-sm text-muted-foreground">Review proposal before submitting.</p>
              </div>

              {summary || implementationPlan ? (
                <div className="space-y-6 p-4">
                  {summary && (
                    <div>
                      <h3 className="mb-2 font-medium">Summary</h3>
                      <p className="text-sm text-muted-foreground">{summary}</p>
                    </div>
                  )}
                  {implementationPlan && (
                    <div>
                      <h3 className="mb-2 font-medium">Implementation Plan</h3>
                      <div className="text-sm prose prose-sm max-w-none text-muted-foreground">
                        {implementationPlan}
                      </div>
                    </div>
                  )}
                  {(document || documentUrl) && (
                    <div>
                      <h3 className="mb-2 font-medium">Document</h3>
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium flex-1">
                          {getDocumentDisplayName()}
                        </span>
                        {documentUrl && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(documentUrl)}
                              className="h-6 w-6 p-0 text-blue-600"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(documentUrl, getDownloadFilename())}
                              className="h-6 w-6 p-0 text-green-600"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <svg
                    className="mb-4 h-16 w-16 text-muted-foreground/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-sm text-muted-foreground">
                    Nothing to preview yet. Start adding proposal details to see how it&apos;ll look.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}