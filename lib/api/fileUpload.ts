import { api } from "../apiConfig"
import type { ApiResponse } from "../apiConfig"
import { cloudinaryAPI } from "../cloudinary"

export interface FileUploadResponse {
  file_url: string
  file_name: string
  file_size: number
  file_type: string
}

// Helper function to safely extract error information
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

// Helper function to convert error to the expected format
const getErrorRecord = (error: unknown): Record<string, string> => {
  const message = getErrorMessage(error)
  return { error: message }
}

export const fileUploadAPI = {
  // Upload a single file
  uploadFile: async (file: File, category?: string): Promise<ApiResponse<FileUploadResponse>> => {
    try {
      const folder = category ? `ppp-portal/${category}` : "ppp-portal"

      const cloudinaryResult = await cloudinaryAPI.uploadFile(file, folder, "auto")

      return {
        success: true,
        data: {
          file_url: cloudinaryResult.secure_url,
          file_name: file.name,
          file_size: cloudinaryResult.bytes,
          file_type: cloudinaryResult.format,
        },
        message: "File uploaded successfully",
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      console.error("[v0] File upload error:", errorMessage)
      return {
        success: false,
        message: errorMessage,
        errors: getErrorRecord(error),
      }
    }
  },

  // Upload multiple files
  uploadMultipleFiles: async (files: File[], category?: string): Promise<ApiResponse<FileUploadResponse[]>> => {
    try {
      const folder = category ? `ppp-portal/${category}` : "ppp-portal"

      const cloudinaryResults = await cloudinaryAPI.uploadMultipleFiles(files, folder, "auto")

      const uploadedFiles: FileUploadResponse[] = cloudinaryResults.map((result, index) => ({
        file_url: result.secure_url,
        file_name: files[index].name,
        file_size: result.bytes,
        file_type: result.format,
      }))

      return {
        success: true,
        data: uploadedFiles,
        message: "Files uploaded successfully",
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      console.error("[v0] Multiple file upload error:", errorMessage)
      return {
        success: false,
        message: errorMessage,
        errors: getErrorRecord(error),
      }
    }
  },

  // Delete a file
  deleteFile: async (fileUrl: string): Promise<ApiResponse<void>> => {
    try {
      await api.delete("/files/delete/", {
        data: { file_url: fileUrl },
      })

      return {
        success: true,
        message: "File deleted successfully",
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      
      return {
        success: false,
        message: errorMessage,
        errors: getErrorRecord(error),
      }
    }
  },
}

export default fileUploadAPI