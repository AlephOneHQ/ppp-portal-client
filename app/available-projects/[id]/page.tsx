/* eslint-disable @next/next/no-img-element */
"use client"

import { useState, useEffect } from "react"
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Clock,
  Landmark,
  Wallet,
  ChevronLeft,
  Calendar,
  FileText,
  Building2,
  DollarSign,
  Users,
  Menu,
  X
} from "lucide-react";
import { isAuthenticated } from "@/lib/user";
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { formatCurrencyInput, formatDateRange } from "@/lib/utils/formatting"
import type { Project, ProjectFilters } from "@/types/projects"
import { useAvailableProjects } from "@/hooks/useAvailableProjects"
import { transformToAvailableProject } from "@/lib/transformProjectToAvailable"
import { ContentDisplay } from "@/components/ui/content-display"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

// Helper function to format currency for display
const formatCurrency = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  
  // Return "Not specified" if amount is 0
  if (num === 0) {
    return "Not specified"
  }
  
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

// Helper to format date for display
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Helper to check if cost should show as "Not specified"
const getCostDisplay = (cost: string | number) => {
  const num = typeof cost === 'string' ? parseFloat(cost) : cost
  return num === 0 ? "Not specified" : formatCurrency(cost)
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleExpressInterest = () => {
    if (isAuthenticated()) {
      router.push(`/projects/${project?.id}/express-interest`)
    } else {
      router.push("/partner/login")
    }
  }

  // Set up filters to fetch all published projects
  const filters: ProjectFilters = {
    status: "published",
    sort_by: "-created_at",
    limit: 50, // Increased limit to ensure we get all projects
    offset: 0,
  }

  const { availableProjects, loading, error } = useAvailableProjects(filters)

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params
      setResolvedParams(resolved)
    }
    resolveParams()
  }, [params])

  // Find the specific project from the fetched projects
  useEffect(() => {
    if (!resolvedParams?.id || !availableProjects.length) return

    // Find the project by ID from the available projects
    const foundProject = availableProjects.find(p => p.id === resolvedParams.id)
    
    if (foundProject) {
      // Transform the project data
      const transformedProject = transformToAvailableProject(foundProject)
      setProject(foundProject) // or use transformedProject if you need the transformed format
      
      // Set first image as selected if gallery exists
      if (foundProject.gallery_images?.length > 0) {
        setSelectedImage(foundProject.gallery_images[0].file_url)
      }
    } else {
      // Project not found in the list
      setProject(null)
    }
  }, [resolvedParams, availableProjects])

  // Handle error state
  useEffect(() => {
    if (error) {
      toast.error("Failed to load projects")
    }
  }, [error])

  // Loading state
  if (loading || !resolvedParams) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#F4EFE6] to-[#FFE0AF]/30">
        {/* Header */}
        <header className="container mx-auto px-4 py-4 md:py-6 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <img
              src="/icons/oyntcda-logo.svg"
              className="h-12 w-12 md:h-20 md:w-20"
              alt="oyntcda logo"
            />
          </Link>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/available-projects" className="text-[#383F1E] hover:text-[#C13C3D] transition-colors">
              Projects
            </Link>
            <Button asChild className="bg-gradient-to-r from-[#C13C3D] to-[#C9481C] text-white px-8 py-6 rounded-xl shadow-lg">
              <Link href="/partner/login">Partner</Link>
            </Button>
          </nav>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="absolute top-20 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-[#FFE0AF] p-4 md:hidden z-50">
              <nav className="flex flex-col space-y-4">
                <Link 
                  href="/available-projects" 
                  className="text-[#383F1E] hover:text-[#C13C3D] transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Projects
                </Link>
                <Link 
                  href="/partner/login" 
                  className="bg-gradient-to-r from-[#C13C3D] to-[#C9481C] text-white px-6 py-3 rounded-xl shadow-lg text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Partner Portal
                </Link>
              </nav>
            </div>
          )}
        </header>

        {/* Loading State */}
        <main className="container mx-auto px-4 py-8 md:py-16 max-w-6xl">
          <div className="flex justify-center items-center py-12">
            <div className="text-[#383F1E] flex items-center gap-3">
              <Spinner />
              <span>Loading project details...</span>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Project not found state
  if (!project && !loading && resolvedParams) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#F4EFE6] to-[#FFE0AF]/30">
        {/* Header */}
        <header className="container mx-auto px-4 py-4 md:py-6 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <img
              src="/icons/oyntcda-logo.svg"
              className="h-12 w-12 md:h-20 md:w-20"
              alt="oyntcda logo"
            />
          </Link>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/available-projects" className="text-[#383F1E] hover:text-[#C13C3D] transition-colors">
              Projects
            </Link>
            <Button asChild className="bg-gradient-to-r from-[#C13C3D] to-[#C9481C] text-white px-8 py-6 rounded-xl shadow-lg">
              <Link href="/partner/login">Partner</Link>
            </Button>
          </nav>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="absolute top-20 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-[#FFE0AF] p-4 md:hidden z-50">
              <nav className="flex flex-col space-y-4">
                <Link 
                  href="/available-projects" 
                  className="text-[#383F1E] hover:text-[#C13C3D] transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Projects
                </Link>
                <Link 
                  href="/partner/login" 
                  className="bg-gradient-to-r from-[#C13C3D] to-[#C9481C] text-white px-6 py-3 rounded-xl shadow-lg text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Partner Portal
                </Link>
              </nav>
            </div>
          )}
        </header>

        {/* Not Found State */}
        <main className="container mx-auto px-4 py-8 md:py-16 max-w-6xl">
          <div className="flex justify-center items-center py-8 md:py-12">
            <div className="text-center px-4">
              <h2 className="text-xl md:text-2xl font-bold text-[#040404] mb-3 md:mb-4">Project Not Found</h2>
              <p className="text-[#383F1E] mb-4 md:mb-6">The project you&apos;re looking for doesn&apos;t exist or has been removed.</p>
              <Button asChild className="bg-[#C13C3D] hover:bg-[#A02F30] text-white w-full md:w-auto">
                <Link href="/available-projects">Browse Available Projects</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Main render with project data
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#F4EFE6] to-[#FFE0AF]/30 text-[#040404]">
      {/* ================= HEADER ================= */}
      <header className="container mx-auto px-4 py-4 md:py-6 flex justify-between items-center relative">
        <Link href="/" className="flex items-center space-x-2">
          <img
            src="/icons/oyntcda-logo.svg"
            className="h-12 w-12 md:h-20 md:w-20"
            alt="oyntcda logo"
          />
        </Link>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link
            href="/available-projects"
            className="text-[#383F1E] hover:text-[#C13C3D] transition-colors"
          >
            Projects
          </Link>

          <Button
            asChild
            className="bg-gradient-to-r from-[#C13C3D] to-[#C9481C] text-white px-8 py-6 rounded-xl shadow-lg"
          >
            <Link href="/partner/login">Partner</Link>
          </Button>
        </nav>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-20 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-[#FFE0AF] p-4 md:hidden z-50">
            <nav className="flex flex-col space-y-4">
              <Link 
                href="/available-projects" 
                className="text-[#383F1E] hover:text-[#C13C3D] transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Projects
              </Link>
              <Link 
                href="/partner/login" 
                className="bg-gradient-to-r from-[#C13C3D] to-[#C9481C] text-white px-6 py-3 rounded-xl shadow-lg text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Partner Portal
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
        {/* Breadcrumb - Mobile Optimized */}
        <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm mb-4 md:mb-8 overflow-hidden">
          <Link
            href="/available-projects"
            className="text-[#383F1E] hover:text-[#C13C3D] transition-colors flex items-center gap-1 shrink-0"
          >
            <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden xs:inline">All Projects</span>
            <span className="xs:hidden">Back</span>
          </Link>
          <span className="text-[#383F1E]/50 shrink-0">/</span>
          <span className="text-[#040404] font-medium truncate">{project?.title}</span>
        </div>

        {/* Project Header Card - Mobile Optimized */}
        <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border border-[#FFE0AF] mb-4 md:mb-8 py-0">
          <CardContent className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
              {/* Project Thumbnail - Responsive height */}
              <div className="w-full md:w-64 h-48 md:h-48 relative bg-white rounded-lg overflow-hidden border border-[#FFE0AF] flex items-center justify-center">
                {project?.gallery_images && project.gallery_images.length > 0 ? (
                  <Image
                    src={project.gallery_images[0].file_url}
                    alt={project.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 256px"
                  />
                ) : (
                  <Image
                    src="/icons/oyntcda-logo.svg"
                    alt="Project placeholder"
                    width={80}
                    height={80}
                    className="opacity-60"
                  />
                )}
              </div>

              {/* Project Info */}
              <div className="flex-1 w-full">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#040404] mb-3 md:mb-4">
                  {project?.title}
                </h1>

                <div className="grid grid-cols-1 gap-3 md:gap-4 mb-3 md:mb-4">
                  <div className="flex items-start gap-2 text-xs md:text-sm text-[#383F1E]">
                    <Building2 className="h-4 w-4 text-[#C13C3D] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-medium block sm:inline">Ministry:</span>
                      <span className="block sm:inline sm:ml-1 truncate">{project?.authorizing_sector?.name}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-xs md:text-sm text-[#383F1E]">
                    <DollarSign className="h-4 w-4 text-[#C13C3D] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-medium block sm:inline">Est. Cost:</span>
                      <span className="block sm:inline sm:ml-1">
                        {project && getCostDisplay(project.estimated_cost)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-xs md:text-sm text-[#383F1E]">
                    <Calendar className="h-4 w-4 text-[#C13C3D] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-medium block sm:inline">Timeline:</span>
                      <span className="block sm:inline sm:ml-1">
                        {project && formatDateRange(project.proposed_start_date, project.estimated_completion_date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-xs md:text-sm text-[#383F1E]">
                    <Clock className="h-4 w-4 text-[#C13C3D] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-medium block sm:inline">EOI:</span>
                      <span className="block sm:inline sm:ml-1">
                        {project && formatDateRange(project.eoi_start_date, project.eoi_end_date)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:gap-3 mt-2 md:mt-4">
                  <Badge className="bg-[#C13C3D]/10 text-[#C13C3D] border-0 text-xs">
                    Status: {project?.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1) : ""}
                  </Badge>
                  <Badge className="bg-[#C9481C]/10 text-[#C9481C] border-0 text-xs">
                    Published: {project && formatDate(project.created_at)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for detailed information - Mobile Optimized */}
        <Tabs defaultValue="summary" className="space-y-4 md:space-y-6">
          <TabsList className="bg-white/60 backdrop-blur-sm border border-[#FFE0AF] w-full flex flex-wrap h-auto p-1">
            <TabsTrigger 
              value="summary" 
              className="data-[state=active]:bg-[#C13C3D] data-[state=active]:text-white text-xs md:text-sm flex-1 py-2 px-1 md:px-3"
            >
              <span className="hidden xs:inline">Executive Summary</span>
              <span className="xs:hidden">Summary</span>
            </TabsTrigger>
            <TabsTrigger 
              value="gallery" 
              className="data-[state=active]:bg-[#C13C3D] data-[state=active]:text-white text-xs md:text-sm flex-1 py-2 px-1 md:px-3"
            >
              Gallery
            </TabsTrigger>
            <TabsTrigger 
              value="timeline" 
              className="data-[state=active]:bg-[#C13C3D] data-[state=active]:text-white text-xs md:text-sm flex-1 py-2 px-1 md:px-3"
            >
              <span className="hidden xs:inline">Timeline & Details</span>
              <span className="xs:hidden">Details</span>
            </TabsTrigger>
          </TabsList>

          {/* Executive Summary Tab - Mobile Optimized */}
          <TabsContent value="summary">
            <Card className="bg-white/80 backdrop-blur-sm border border-[#FFE0AF] py-0">
              <CardContent className="grid gap-4 md:gap-6 p-4 md:p-8">
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-[#040404] mb-3 md:mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 md:h-5 md:w-5 text-[#C13C3D]" />
                    Executive Summary
                  </h2>
                  <Separator className="mb-3 md:mb-4 bg-[#FFE0AF]" />
                  <div className="prose prose-sm md:prose-base max-w-none text-[#383F1E] leading-relaxed">
                    <ContentDisplay
                      content={project?.executive_summary || ''}
                      className="text-[#383F1E] text-sm md:text-base"
                    />
                  </div>
                </div>

                {project?.description && (
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-[#040404] mb-3 md:mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4 md:h-5 md:w-5 text-[#C13C3D]" />
                      Project Description
                    </h2>
                    <Separator className="mb-3 md:mb-4 bg-[#FFE0AF]" />
                    <div className="prose prose-sm md:prose-base max-w-none text-[#383F1E] leading-relaxed">
                      <ContentDisplay
                        content={project.description}
                        className="text-[#383F1E] text-sm md:text-base"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gallery Tab - Mobile Optimized */}
          <TabsContent value="gallery">
            <Card className="bg-white/80 backdrop-blur-sm border border-[#FFE0AF] py-0">
              <CardContent className="p-4 md:p-8">
                <h2 className="text-lg md:text-xl font-semibold text-[#040404] mb-3 md:mb-4">Project Gallery</h2>
                <Separator className="mb-4 md:mb-6 bg-[#FFE0AF]" />

                {project?.gallery_images && project.gallery_images.length > 0 ? (
                  <div className="space-y-4">
                    {/* Main selected image - Responsive height */}
                    <div className="relative h-64 sm:h-80 md:h-96 w-full bg-white rounded-lg overflow-hidden border border-[#FFE0AF] flex items-center justify-center">
                      <Image
                        src={selectedImage || project.gallery_images[0].file_url}
                        alt="Project gallery"
                        fill
                        className="object-contain"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 80vw, 1024px"
                      />
                    </div>

                    {/* Thumbnail grid - Responsive columns */}
                    {project.gallery_images.length > 1 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-4">
                        {project.gallery_images.map((image, index) => (
                          <button
                            key={image.id}
                            onClick={() => setSelectedImage(image.file_url)}
                            className={`relative aspect-square bg-white rounded-lg overflow-hidden border-2 transition-all ${
                              selectedImage === image.file_url 
                                ? 'border-[#C13C3D]' 
                                : 'border-[#FFE0AF] hover:border-[#C9481C]'
                            }`}
                          >
                            <Image
                              src={image.file_url}
                              alt={`Gallery image ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 100px"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 md:py-12 text-[#383F1E]">
                    No gallery images available for this project.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline & Details Tab - Mobile Optimized */}
          <TabsContent value="timeline">
            <Card className="bg-white/80 backdrop-blur-sm border border-[#FFE0AF] py-0">
              <CardContent className="p-4 md:p-8">
                <h2 className="text-lg md:text-xl font-semibold text-[#040404] mb-3 md:mb-4">Project Timeline & Details</h2>
                <Separator className="mb-4 md:mb-6 bg-[#FFE0AF]" />

                <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                  {/* Timeline Section */}
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-[#040404] mb-3 md:mb-4 flex items-center gap-2">
                      <Calendar className="h-4 w-4 md:h-5 md:w-5 text-[#C13C3D]" />
                      Key Dates
                    </h3>

                    <div className="space-y-3 md:space-y-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-[#FFE0AF]">
                        <span className="text-xs md:text-sm text-[#383F1E]">Proposed Start Date</span>
                        <span className="font-medium text-[#040404] text-sm md:text-base">{project && formatDate(project.proposed_start_date)}</span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-[#FFE0AF]">
                        <span className="text-xs md:text-sm text-[#383F1E]">Estimated Completion</span>
                        <span className="font-medium text-[#040404] text-sm md:text-base">{project && formatDate(project.estimated_completion_date)}</span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-[#FFE0AF]">
                        <span className="text-xs md:text-sm text-[#383F1E]">EOI Start Date</span>
                        <span className="font-medium text-[#040404] text-sm md:text-base">{project && formatDate(project.eoi_start_date)}</span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-[#FFE0AF]">
                        <span className="text-xs md:text-sm text-[#383F1E]">EOI End Date</span>
                        <span className="font-medium text-[#040404] text-sm md:text-base">{project && formatDate(project.eoi_end_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Project Details Section */}
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-[#040404] mb-3 md:mb-4 flex items-center gap-2">
                      <Building2 className="h-4 w-4 md:h-5 md:w-5 text-[#C13C3D]" />
                      Project Details
                    </h3>

                    <div className="space-y-3 md:space-y-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 py-2 border-b border-[#FFE0AF]">
                        <div className="flex items-center gap-1">
                          <Landmark className="h-4 w-4 md:h-5 md:w-5 text-[#C13C3D] shrink-0" />
                          <span className="text-xs md:text-sm text-[#383F1E]">Authorizing Sector</span>
                        </div>
                        <span className="font-medium text-[#040404] text-sm md:text-base sm:text-right">
                          {project?.authorizing_sector?.name}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 py-2 border-b border-[#FFE0AF]">
                        <div className="flex items-center gap-1">
                          <Wallet className="h-4 w-4 md:h-5 md:w-5 text-[#C13C3D] shrink-0" />
                          <span className="text-xs md:text-sm text-[#383F1E]">Estimated Cost</span>
                        </div>
                        <span className="font-medium text-[#040404] text-sm md:text-base sm:text-right">
                          {project && getCostDisplay(project.estimated_cost)}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 py-2 border-b border-[#FFE0AF]">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 md:h-5 md:w-5 text-[#C13C3D] shrink-0" />
                          <span className="text-xs md:text-sm text-[#383F1E]">Project Status</span>
                        </div>
                        <div className="sm:text-right">
                          <Badge className="bg-[#C13C3D]/10 text-[#C13C3D] border-0 text-xs">
                            {project?.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1) : ""}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Call to Action - Mobile Optimized */}
        <div className="mt-6 md:mt-8 flex justify-center">
          <Button
            onClick={handleExpressInterest}
            size="lg"
            className="bg-gradient-to-r from-[#C13C3D] to-[#C9481C] text-white px-6 md:px-12 py-4 md:py-6 rounded-xl shadow-lg hover:shadow-xl transition-all w-full sm:w-auto flex items-center justify-center gap-2"
          >
            Express Interest
            <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="relative bg-white/80 backdrop-blur-sm border-t border-[#FFE0AF] mt-8 md:mt-12">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {/* Brand */}
            <div className="sm:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Link href="/" className="border-r pr-4">
                  <img src="/icons/oyntcda-logo.svg" className="h-12 w-12 md:h-16 md:w-16" alt="oyntcda logo" />
                </Link>
                <Link href="/" className="px-2">
                  <img src="/icons/oyo-logo.png" className="h-8 w-8 md:h-12 md:w-12" alt="oyo state logo" />
                </Link>
              </div>
              <p className="text-[#383F1E] text-xs md:text-sm leading-relaxed">
                A government-led initiative transforming urban landscapes through innovative public-private partnerships.
                Building sustainable, smart cities for future generations.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-3 md:mb-4 text-[#040404] text-sm md:text-base">Quick Access</h3>
              <div className="space-y-2">
                <Link href="/partner/login" className="block text-[#383F1E] hover:text-[#C13C3D] transition-colors text-xs md:text-sm">
                  Partner Portal
                </Link>
                <Link href="/available-projects" className="block text-[#383F1E] hover:text-[#C13C3D] transition-colors text-xs md:text-sm">
                  Available Projects
                </Link>
                <Link href="#contact" className="block text-[#383F1E] hover:text-[#C13C3D] transition-colors text-xs md:text-sm">
                  Contact Support
                </Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold mb-3 md:mb-4 text-[#040404] text-sm md:text-base">Contact Info</h3>
              <div className="space-y-2 text-xs md:text-sm text-[#383F1E]">
                <div>📍 Aba Akinjide Rd, Agodi GRA, Ibadan, Oyo State, Nigeria</div>
                <div>📞 09114444144</div>
                <div>✉️ enquiries@oyntcda.oy.gov.ng</div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-[#FFE0AF] mt-6 md:mt-8 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-[#383F1E] text-xs md:text-sm order-2 md:order-1">
              © {new Date().getFullYear()} PPP Portal. All rights reserved.
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 order-1 md:order-2">
              <Link href="/privacy" className="text-[#383F1E] hover:text-[#C13C3D] transition-colors text-xs md:text-sm">
                Privacy
              </Link>
              <Link href="/terms" className="text-[#383F1E] hover:text-[#C13C3D] transition-colors text-xs md:text-sm">
                Terms
              </Link>
              <Link href="/accessibility" className="text-[#383F1E] hover:text-[#C13C3D] transition-colors text-xs md:text-sm">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}