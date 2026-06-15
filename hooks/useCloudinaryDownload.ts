import { useState } from 'react'
import { toast } from 'sonner'

export type ResourceType = 'image' | 'video' | 'raw' | 'auto'

interface DownloadOptions {
  resourceType?: ResourceType
  onProgress?: (progress: number) => void
}

export const useCloudinaryDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async (
    publicId: string, 
    filename: string, 
    options: DownloadOptions = {}
  ) => {
    if (!publicId) {
      toast.error('No file available for download')
      return
    }

    // Validate filename has extension
    if (!filename.includes('.')) {
      toast.error('Filename must include extension (e.g., .pdf, .docx)')
      return
    }

    setIsDownloading(true)
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        publicId: encodeURIComponent(publicId),
        filename: encodeURIComponent(filename),
        ...(options.resourceType && { resourceType: options.resourceType })
      })

      const response = await fetch(`/api/download-cloudinary?${params}`)
      
      if (response.status >= 300 && response.status < 400) {
        // Redirect happened, download should start automatically
        toast.success(`Downloading ${filename}`)
        return
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Download failed' }))
        throw new Error(errorData.message || `Download failed with status: ${response.status}`)
      }

      // If we get here, the response wasn't a redirect
      throw new Error('Unexpected response from server')
      
    } catch (error) {
      console.error('Download failed:', error)
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          toast.error('File not found. It may have been moved or deleted.')
        } else if (error.message.includes('401')) {
          toast.error('Authentication failed. Please check your Cloudinary configuration.')
        } else {
          toast.error(`Download failed: ${error.message}`)
        }
      } else {
        toast.error('Download failed due to an unknown error')
      }
    } finally {
      setIsDownloading(false)
    }
  }

  return {
    handleDownload,
    isDownloading
  }
}