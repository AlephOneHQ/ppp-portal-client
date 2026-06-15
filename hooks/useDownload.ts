import { useState } from 'react'
import { toast } from 'sonner'

export const useDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async (url: string, filename: string) => {
    if (!url) {
      toast.error('No file available for download')
      return
    }

    setIsDownloading(true)
    
    try {
      // Method 1: Direct download (for public Cloudinary files)
      const directDownload = async () => {
        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to fetch file')
        
        const blob = await response.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up
        window.URL.revokeObjectURL(blobUrl)
      }

      // Method 2: Using your API endpoint (recommended for secure downloads)
      const apiDownload = async () => {
        const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
        
        const response = await fetch(downloadUrl)
        if (!response.ok) throw new Error('Download failed')
        
        const blob = await response.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        window.URL.revokeObjectURL(blobUrl)
      }

      // Try API endpoint first, fallback to direct download
      await apiDownload()
      toast.success('Download started')
      
    } catch (error) {
      console.error('Download failed:', error)
      
      // Fallback: Try direct Cloudinary URL with fl_attachment transform
      try {
        // Add Cloudinary transformation for forced download
        const downloadUrl = url.includes('cloudinary') 
          ? `${url}${url.includes('?') ? '&' : '?'}fl_attachment:${encodeURIComponent(filename)}`
          : url
        
        const link = document.createElement('a')
        link.href = downloadUrl
        link.target = '_blank' // Open in new tab as fallback
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        toast.info('File opened in new tab. Use browser "Save As" if download doesn\'t start.')
      } catch (fallbackError) {
        toast.error('Failed to download file. Please try again.')
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