import { useCloudinaryDownload, ResourceType } from './useCloudinaryDownload'

const DOCUMENT_CONFIG: Record<string, { resourceType: ResourceType; label: string }> = {
  pdf: { resourceType: 'raw', label: 'PDF' },
  doc: { resourceType: 'raw', label: 'Word Document' },
  docx: { resourceType: 'raw', label: 'Word Document' },
  txt: { resourceType: 'raw', label: 'Text File' },
  xls: { resourceType: 'raw', label: 'Excel Spreadsheet' },
  xlsx: { resourceType: 'raw', label: 'Excel Spreadsheet' },
  ppt: { resourceType: 'raw', label: 'PowerPoint' },
  pptx: { resourceType: 'raw', label: 'PowerPoint' },
  zip: { resourceType: 'raw', label: 'ZIP Archive' },
  rar: { resourceType: 'raw', label: 'RAR Archive' },
}

export const useDocumentDownload = () => {
  const { handleDownload, isDownloading } = useCloudinaryDownload()

  const downloadDocument = (
    publicId: string, 
    filename: string,
    customResourceType?: ResourceType
  ) => {
    const extension = filename.split('.').pop()?.toLowerCase()
    const config = extension ? DOCUMENT_CONFIG[extension] : null
    
    const resourceType = customResourceType || config?.resourceType || 'raw'
    
    return handleDownload(publicId, filename, { resourceType })
  }

  const getDocumentTypeLabel = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase()
    return extension ? DOCUMENT_CONFIG[extension]?.label || 'Document' : 'Document'
  }

  return {
    downloadDocument,
    isDownloading,
    getDocumentTypeLabel
  }
}