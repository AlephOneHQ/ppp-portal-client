"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeClosedIcon } from "lucide-react";

export default function PartnerSignupPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false); // Toggle for password visibility
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false); // Toggle for confirm password visibility

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('partner_email');
    const setupToken = sessionStorage.getItem('setup_token');
    
    if (!storedEmail || !setupToken) {
      router.push('/partner/login');
      return;
    }
    
    setEmail(storedEmail);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    setIsLoading(true);

    try {
      const setupToken = sessionStorage.getItem('setup_token');
      
      // You'll need to add this method to your authAPI
      const result = await authAPI.partnerSetPassword({
        email,
        setup_token: setupToken,
        password,
        confirm_password: confirmPassword
      });

      if (result.success) {
        toast.success("Password set successfully! Welcome to the Partner Portal.");
        sessionStorage.removeItem('setup_token');
        sessionStorage.removeItem('partner_email');
        router.push('/projects');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to set password. Please try again.");
      console.error("Set password error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Navigate to the login page or another appropriate page when the user cancels
    router.push('/partner/login');
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="leading-[1.2] text-3xl">Create Password</CardTitle>
          <CardDescription className="mx-auto text-[#444444] leading-[1.4] w-full max-w-xs">
            Set a secure password to complete your account setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="py-4 text-[#444444]" onSubmit={handleSubmit}>
            <FieldGroup>
              {/* Password */}
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={passwordVisible ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  >
                    {passwordVisible ? <EyeClosedIcon /> : <Eye />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Password must be at least 4 characters
                </p>
              </Field>

              {/* Confirm Password */}
              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={confirmPasswordVisible ? "text" : "password"}
                    required
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  >
                    {confirmPasswordVisible ? <EyeClosedIcon /> : <Eye />}
                  </button>
                </div>
              </Field>

              <Field className="flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={isLoading || !password || !confirmPassword}
                  className="relative"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Completing Setup...
                    </>
                  ) : (
                    "Complete Sign Up"
                  )}
                </Button>

                {/* Cancel Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="mt-4"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
