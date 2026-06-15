export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  format: string
  resource_type: string
  bytes: number
  width?: number
  height?: number
}

interface CloudinaryErrorResponse {
  error?: {
    message?: string
  }
}

export const cloudinaryAPI = {
  /**
   * Upload a file to Cloudinary
   * @param file - The file to upload
   * @param folder - Optional folder name in Cloudinary
   * @param resourceType - Type of resource: image, video, raw, auto
   */
  uploadFile: async (
    file: File,
    folder = "ppp-portal",
    resourceType: "image" | "video" | "raw" | "auto" = "auto",
  ): Promise<CloudinaryUploadResult> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !uploadPreset) {
      throw new Error(
        "Cloudinary configuration is missing. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET environment variables.",
      )
    }

    let finalResourceType = resourceType
    if (resourceType === "auto") {
      const fileType = file.type.toLowerCase()
      if (
        fileType === "application/pdf" ||
        fileType === "application/msword" ||
        fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileType.startsWith("application/") ||
        fileType.startsWith("text/")
      ) {
        finalResourceType = "raw"
      }
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", uploadPreset)
    formData.append("folder", folder)

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${finalResourceType}/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData: CloudinaryErrorResponse = await response.json()
        throw new Error(errorData.error?.message || "Failed to upload file to Cloudinary")
      }

      const result: CloudinaryUploadResult = await response.json()
      return result
    } catch (error: unknown) {
      console.error("[v0] Cloudinary upload error:", error)

      if (error instanceof Error) {
        throw error
      }

      if (typeof error === "string") {
        throw new Error(error)
      }

      throw new Error("Failed to upload file to Cloudinary")
    }
  },

  /**
   * Upload multiple files to Cloudinary
   */
  uploadMultipleFiles: async (
    files: File[],
    folder = "ppp-portal",
    resourceType: "image" | "video" | "raw" | "auto" = "auto",
  ): Promise<CloudinaryUploadResult[]> => {
    const uploadPromises = files.map((file) => cloudinaryAPI.uploadFile(file, folder, resourceType))

    return Promise.all(uploadPromises)
  },
}

// Add this to your existing cloudinaryAPI or create a new utility
export const signatureAPI = {
  async uploadSignature(base64Data: string): Promise<string> {
    try {
      // Convert base64 to Blob (correct way)
      const blob = base64ToBlob(base64Data)

      const file = new File([blob], `signature-${Date.now()}.png`, { type: blob.type || "image/png" })

      // Upload to Cloudinary
      const cloudinaryResult = await cloudinaryAPI.uploadFile(file, "contracts/signatures", "image")

      if (!cloudinaryResult.secure_url) {
        throw new Error("Cloudinary did not return a secure_url")
      }

      return cloudinaryResult.secure_url
    } catch (error) {
      console.error("Error uploading signature:", error)
      throw new Error("Failed to upload signature")
    }
  },
}

// helper
function base64ToBlob(base64: string): Blob {
  const arr = base64.split(",")
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png"
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new Blob([u8arr], { type: mime })
}
