/* eslint-disable @next/next/no-img-element */
"use client"

import { FileEdit, Building2, Wallet, Calendar, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { useState, useEffect } from "react"
import { formatNumberWithCommas } from "@/lib/utils/formatting"
import type {
  AuthorizingSector,
} from "@/types/projects"
import { sanitizeHTML, isPlainText, convertToPlainText } from "@/lib/utils/html-sanitizer"

interface ProjectData {
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
  // submissionFee: string
  lawsAndRegulations: string
  galleryFiles: (File | null)[]
}

interface ProjectPreviewProps {
  data: ProjectData
  authorizingSectors?: AuthorizingSector[]
}

export function ProjectPreview({ data, authorizingSectors = [] }: ProjectPreviewProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [mediaFiles, setMediaFiles] = useState<{ url: string; type: string }[]>([])


  useEffect(() => {
    const files = data.galleryFiles
      .filter((file): file is File => file !== null)
      .map((file) => ({
        url: URL.createObjectURL(file),
        type: file.type,
      }))

    setMediaFiles(files)

    return () => {
      files.forEach(({ url }) => URL.revokeObjectURL(url))
    }
  }, [data.galleryFiles])

  const hasContent =
    data.title || data.executiveSummary || data.description || data.authorisingSector || data.estimatedCost

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % mediaFiles.length)
  }

  const getSectorName = (sectorId: string) => {
    const sector = authorizingSectors.find(s => s.id === sectorId);
    return sector ? sector.name : sectorId;
  };

  const renderRichText = (content: string) => {
  if (!content) return null
  
  const sanitizedContent = sanitizeHTML(content)
  
  return (
    <div 
      className="prose prose-sm dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  )
}

  return (
    <div className="bg-background rounded-lg border border-border min-h-[550px]">
      <div className="mb-6 border-b p-4">
        <h2 className="text-lg font-semibold mb-1">Preview Project</h2>
        <p className="text-sm text-muted-foreground">Review project before publishing</p>
      </div>

      {!hasContent ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileEdit className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-sm text-muted-foreground max-w-[250px]">
            Nothing to preview yet. Start adding project details to see how it&apos;ll look.
          </p>
        </div>
      ) : (
        <div className="space-y-6 p-4">
          {data.title && <h3 className="text-2xl font-bold text-balance leading-tight">{data.title}</h3>}

          {data.executiveSummary && (
            <p className="text-sm text-muted-foreground leading-relaxed">{renderRichText(data.executiveSummary)}</p>
          )}

          <div className="space-y-4">
            {data.authorisingSector && (
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#C13C3D]" />
                <span>{getSectorName(data.authorisingSector)}</span>
              </div>
            )}

            {data.estimatedCost && (
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#C13C3D]" />
                <span>₦{formatNumberWithCommas(data.estimatedCost)}</span>
              </div>
            )}

            {(data.proposedStartDate || data.estimatedCompletionDate) && (
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#C13C3D]" />
                <span>
                  {data.proposedStartDate && format(data.proposedStartDate, "MMMM yyyy")}
                  {data.proposedStartDate && data.estimatedCompletionDate && " - "}
                  {data.estimatedCompletionDate && format(data.estimatedCompletionDate, "MMMM yyyy")}
                </span>
              </div>
            )}
          </div>

          {mediaFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold">Project gallery</h4>
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group">
                {mediaFiles[currentImageIndex]?.type.startsWith("video/") ? (
                  <video
                    src={mediaFiles[currentImageIndex].url}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={mediaFiles[currentImageIndex].url}
                    alt={`Gallery item ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}

                {mediaFiles.length > 1 && (
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 hover:bg-background rounded-full transition-colors"
                    aria-label="Next media"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {data.description && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold">Project description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{renderRichText(data.description)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
