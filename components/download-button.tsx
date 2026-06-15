import { useDocumentDownload } from '@/hooks/useDocumentDownload'

interface DocumentDownloadButtonProps {
  publicId: string
  filename: string
  resourceType?: 'image' | 'video' | 'raw' | 'auto'
  className?: string
  children?: React.ReactNode
  showFileType?: boolean
}

export const DocumentDownloadButton: React.FC<DocumentDownloadButtonProps> = ({
  publicId,
  filename,
  resourceType,
  className = '',
  children,
  showFileType = true
}) => {
  const { downloadDocument, isDownloading, getDocumentTypeLabel } = useDocumentDownload()

  const fileTypeLabel = showFileType ? getDocumentTypeLabel(filename) : ''

  return (
    <button
      onClick={() => downloadDocument(publicId, filename, resourceType)}
      disabled={isDownloading}
      className={`download-button ${className}`}
      title={`Download ${filename}${fileTypeLabel ? ` (${fileTypeLabel})` : ''}`}
    >
      {children || (
        <>
          {isDownloading ? 'Downloading...' : 'Download'}
          {fileTypeLabel && <span className="file-type"> ({fileTypeLabel})</span>}
        </>
      )}
    </button>
  )
}