"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { getCurrentUser } from "@/lib/user"
import { projectAPI, eoiAPI } from "@/lib/api/projects"
import type { Project } from "@/types/projects"
import { toast } from "sonner"
import { formatCurrencyInput, formatDateRange } from "@/lib/utils/formatting"
import { Spinner } from "@/components/ui/spinner"
import { ImagePreviewModal } from "@/components/image-preview-modal"
import { ContentDisplay } from "@/components/ui/content-display"

export default function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [project, setProject] = useState<Project | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  const [hasSubmittedEOI, setHasSubmittedEOI] = useState(false)
  const [eoiStatus, setEoiStatus] = useState<string | null>(null)
  const [isCheckingEOI, setIsCheckingEOI] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const userRole = currentUser?.role || "partner"
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const eoiButtonRef = useRef<HTMLDivElement | null>(null)
  const [showFloatingEOI, setShowFloatingEOI] = useState(false)
  const pageEndRef = useRef<HTMLDivElement | null>(null)
  const [isAtPageEnd, setIsAtPageEnd] = useState(false)

  const isExpressInterestDisabled = hasSubmittedEOI

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params
      setResolvedParams(resolved)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    const fetchProject = async () => {
      if (!resolvedParams?.id) return

      setIsLoadingProject(true)
      try {
        const response = await projectAPI.get(resolvedParams.id)
        const projectData = response.data

        if (!projectData) {
          console.warn("No project data received")
          setProject(null)
          return
        }

        setProject(projectData)
      } catch (error) {
        toast.error("Failed to load project")
        console.error("Error fetching project:", error)
        setProject(null)
      } finally {
        setIsLoadingProject(false)
      }
    }

    if (resolvedParams?.id) {
      fetchProject()
    }
  }, [resolvedParams])

  useEffect(() => {
    const checkExistingEOI = async () => {
      if (!resolvedParams?.id || userRole !== "partner") return

      setIsCheckingEOI(true)
      try {
        const result = await eoiAPI.list({
          project_id: resolvedParams.id,
        })

        if (result.success && result.data?.results && result.data.results.length > 0) {
          const matchingEOI = result.data.results.find(eoi =>
            eoi.project_id === resolvedParams.id ||
            eoi.project?.id === resolvedParams.id
          )

          if (matchingEOI) {
            setHasSubmittedEOI(true)
            setEoiStatus(matchingEOI.status)
          } else {
            setHasSubmittedEOI(false)
            setEoiStatus(null)
          }
        } else {
          setHasSubmittedEOI(false)
          setEoiStatus(null)
        }
      } catch (error) {
        console.error("Error checking EOI:", error)
        setHasSubmittedEOI(false)
        setEoiStatus(null)
      } finally {
        setIsCheckingEOI(false)
      }
    }

    if (resolvedParams?.id && userRole === "partner") {
      checkExistingEOI()
    }
  }, [resolvedParams, userRole])

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight
      const pageHeight = document.documentElement.scrollHeight
      setIsAtPageEnd(scrollPosition >= pageHeight - 150)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (!project || !eoiButtonRef.current || userRole !== "partner") return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloatingEOI(!entry.isIntersecting)
      },
      {
        root: null,
        threshold: 0,
        rootMargin: "0px 0px -150px 0px",
      }
    )

    observer.observe(eoiButtonRef.current)
    return () => observer.disconnect()
  }, [project, userRole])

  useEffect(() => {
    if (!pageEndRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAtPageEnd(entry.isIntersecting)
      },
      {
        root: null,
        threshold: 0,
        rootMargin: "0px 0px -200px 0px",
      }
    )

    observer.observe(pageEndRef.current)
    return () => observer.disconnect()
  }, [])

  if (isLoadingProject || !resolvedParams) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto md:px-4 py-6 max-w-7xl">
          <div className="flex justify-center items-center py-12">
            <div className="text-muted-foreground">
              <Spinner /> Loading project...
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto md:px-4 py-6 max-w-7xl">
          <div className="flex justify-center items-center py-12">
            <div className="text-destructive">Project not found</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="container mx-auto md:px-4 py-6 max-w-7xl">
        <div className="flex items-center gap-2 text-sm mb-12">
          <Link href="/projects" className="hover:text-foreground flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Projects
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium line-clamp-1">{project.title}</span>
        </div>

        <div className="bg-card border rounded-lg mx-auto max-w-5xl p-6 md:p-8 space-y-8">
          {/* Project Header Section */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 text-balance">
              {project.title}
            </h1>
            
            <div className="leading-relaxed mb-6">
              <ContentDisplay 
                content={project.description || ""}
                className="text-base leading-relaxed"
              />
            </div>

            <div className="grid gap-4">
              <div className="flex items-center gap-2 text-sm">
                <img src="/icons/building.svg" alt="building icon" />
                <span>{project.authorizing_sector?.name}</span>
              </div>
              {project.estimated_cost && (
                <div className="flex items-center gap-2 text-sm">
                  <img src="/icons/wallet.svg" alt="wallet icon" />
                  <span>₦{formatCurrencyInput(project.estimated_cost)}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <img src="/icons/calendar.svg" alt="calendar icon" />
                <span>{formatDateRange(project.proposed_start_date, project.estimated_completion_date)}</span>
              </div>
            </div>
          </div>

          {/* Project Description Section */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Project description</h2>
            <div className="space-y-4 leading-relaxed">
              <ContentDisplay 
                content={project.description || ""}
                className="leading-relaxed"
              />
            </div>
          </div>

          {/* Executive Summary Section (if exists) */}
          {project.executive_summary && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Executive Summary</h2>
              <ContentDisplay 
                content={project.executive_summary}
                className="leading-relaxed"
              />
            </div>
          )}

          {/* Project Gallery Section */}
          {project.gallery_images && project.gallery_images.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Project gallery</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.gallery_images.map((image, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setPreviewImage(image.file_url || "")}
                    className="group relative rounded-lg overflow-hidden border bg-muted focus:outline-none"
                  >
                    <img
                      src={image.file_url || "/placeholder.svg"}
                      alt={image.file_name || `Project image ${index + 1}`}
                      className="w-full h-64 object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Procurement Information Section */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">Procurement information</h2>
            <div className="space-y-6">
              {/* Submission Requirements */}
              {project.submission_requirements && (
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-2 uppercase tracking-wide">
                    Submission Requirements
                  </h3>
                  <ContentDisplay 
                    content={project.submission_requirements}
                    className="leading-relaxed"
                  />
                </div>
              )}

              {/* Expression of Interest */}
              <div>
                <h3 className="text-base font-semibold text-foreground mb-3 uppercase tracking-wide">
                  Expression of Interest
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  <img src="/icons/calendar.svg" alt="calendar icon" />
                  <span>{formatDateRange(project.eoi_start_date, project.eoi_end_date)}</span>
                </div>
              </div>

              {/* Laws and Regulations */}
              {project.laws_and_regulations && (
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-3 uppercase tracking-wide">
                    Laws and Regulations
                  </h3>
                  <ContentDisplay 
                    content={project.laws_and_regulations}
                    className="leading-relaxed"
                  />
                </div>
              )}
            </div>

            {/* EOI Button for Partners */}
            {userRole === "partner" && (
              <div ref={eoiButtonRef} className="mt-8">
                <Link href={`/projects/${resolvedParams.id}/express-interest`}>
                  <Button
                    size="lg"
                    className="bg-[#C13C3D] hover:bg-[#A02F30] text-white px-8"
                    disabled={isExpressInterestDisabled || isCheckingEOI}
                  >
                    {isCheckingEOI
                      ? "Checking..."
                      : hasSubmittedEOI
                        ? "EOI Already Submitted"
                        : "Express Interest"}
                  </Button>
                </Link>
                {hasSubmittedEOI && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {eoiStatus === "approved"
                      ? "Your Expression of Interest has been approved."
                      : "You have already submitted an Expression of Interest for this project."}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating EOI Button */}
      {userRole === "partner" &&
        showFloatingEOI &&
        !hasSubmittedEOI &&
        !isAtPageEnd && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in">
            <Link href={`/projects/${resolvedParams.id}/express-interest`}>
              <Button
                size="lg"
                disabled={isCheckingEOI}
                className="bg-[#C13C3D] text-white shadow-xl px-6"
              >
                Express Interest
              </Button>
            </Link>
          </div>
        )}

      <div ref={pageEndRef} className="h-px w-full" />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        open={!!previewImage}
        onOpenChange={() => setPreviewImage(null)}
        src={previewImage || ""}
        alt="Project image preview"
      />
    </div>
  )
}