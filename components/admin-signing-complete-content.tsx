"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Home, Building2, Mail, Clock } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

export default function AdminSigningCompleteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const [loading, setLoading] = useState(true)
  const [signatureTime, setSignatureTime] = useState<Date | null>(null)

  useEffect(() => {
    // Simulate loading and token verification
    const verifyToken = async () => {
      try {
        if (token) {
          // You can verify the token here if needed
          // await verifySignatureToken(token)
        }
        setSignatureTime(new Date())
      } catch (error) {
        toast.error("Failed to verify signature")
        router.push("/admin/login")
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [token, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-blue-600 animate-pulse" />
            </div>
            <p className="text-muted-foreground">Loading completion details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="max-w-md w-full border-blue-200">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Signature Submitted!</CardTitle>
          <CardDescription>
            Your signature as OYNTCDA representative has been recorded
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Signatory Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm text-blue-800">Signatory Details</h4>
              <Badge variant="outline" className="bg-white text-blue-700">
                OYNTCDA Admin
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 text-blue-600" />
                <span className="text-blue-700">Signed on behalf of OYNTCDA</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-blue-600" />
                <span className="text-blue-700">
                  Signed on {signatureTime?.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Thank you for signing the contract as an OYNTCDA representative. 
              Your signature has been officially recorded. The contract administrator and all relevant parties will be notified.
            </p>
          </div>
          
          {/* Next Steps */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-sm text-green-800 mb-2">Next Steps</h4>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• The contract will be moved to monitoring status</li>
              <li>• All parties will receive executed copies</li>
              <li>• The project team will be notified to begin work</li>
              <li>• Milestone tracking will commence</li>
            </ul>
          </div>
          
          {/* Notifications */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-sm text-amber-800 mb-2 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              What to Expect
            </h4>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• You will receive a confirmation email</li>
              <li>• Contract monitoring notifications will begin</li>
            </ul>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              variant="default"
              className="w-full bg-[#C13C3D] hover:bg-[#C13C3D]/90 text-white"
              onClick={() => router.push("/admin/login")}
            >
              <Home className="h-4 w-4 mr-2" />
              Login To Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}