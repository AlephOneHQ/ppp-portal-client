"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authAPI } from "@/lib/api/auth";
import { toast } from "sonner";

interface ForgotPasswordFormProps extends React.ComponentProps<"div"> {
    isPartner?: boolean;
}

const ForgotPasswordForm = ({isPartner = false, ...props }: ForgotPasswordFormProps) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const result = await authAPI.passwordResetRequest(email);
      
      if (result.success) {
        toast.success("Password reset code sent to your email!");
        setMessage("Password reset code sent to your email!");
        // Redirect to reset password page with email
        setTimeout(() => {
          if (isPartner) {
            router.push(`/partner/reset-password?email=${encodeURIComponent(email)}`);
          } else {
            router.push(`/admin/reset-password?email=${encodeURIComponent(email)}`);
          }
        }, 2000);
      } else {
        setMessage(result.message || "Failed to send reset code");
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.");
      console.error("Password reset request error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card {...props}>
      <CardHeader className="text-center">
        <CardTitle className="leading-[1.2] text-3xl">
          Forgot your password?
        </CardTitle>
        <CardDescription className="mx-auto text-[#444444] leading-[1.4] w-full max-w-sm">
          Enter the email address associated with your account. We&apos;ll send you a code to verify your identity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="py-4 text-[#444444]" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Enter email address</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </Field>
            
            {message && (
              <div className={`text-sm p-3 rounded ${
                message.includes("sent") 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {message}
              </div>
            )}
            
            <FieldGroup>
              <Button 
                className="rounded-xl" 
                type="submit"
                disabled={loading}
              >
                {loading ? "Sending..." : "Request code"}
              </Button>
              <Button 
                className="rounded-xl" 
                variant="ghost"
                type="button"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

export default ForgotPasswordForm;