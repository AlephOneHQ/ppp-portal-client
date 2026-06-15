"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import * as React from "react";
import Link from "next/link";
import { useState } from "react";
import authAPI from "@/lib/api/auth";
import { Eye, EyeClosedIcon } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

interface LoginFormProps extends React.ComponentProps<"div"> {
  cardTitle: string;
  isPartner?: boolean;
  cardDescription: string;
}

export function LoginForm({
  className,
  cardTitle,
  cardDescription,
  isPartner = false,
  ...props
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      let result;

      if (isPartner) {
        result = await authAPI.partnerLogin(email, password);
      } else {
        result = await authAPI.adminLogin(email, password);
      }

      if (result.success) {
        // Store user ID in session storage for OTP verification
        sessionStorage.setItem("otp_user_id", result.user_id ?? "");
        sessionStorage.setItem("login_email", email);

        // Success notification using Sonner
        toast.success("Login successful! Redirecting...");

        if (isPartner) {
          router.push("/partner/otp-verification");
        } else {
          router.push("/admin/otp-verification");
        }
      } else {
        setError(result.message);
        toast.error(result.message || "Login failed. Please try again.");
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="leading-[1.2] text-3xl">{cardTitle}</CardTitle>
          <CardDescription className="mx-auto text-[#444444] leading-[1.4] w-full max-w-xs">
            {cardDescription}{" "}
            {isPartner ? (
              <Link
                href="/partner/sign-up"
                className="ml-auto inline-block text-sm text-[#C13C3D] underline"
              >
                Sign up now
              </Link>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="py-4 text-[#444444]" onSubmit={handleSubmit}>
            <FieldGroup>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email Address</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={passwordVisible ? "text" : "password"} // Toggle between text and password
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)} // Toggle visibility
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  >
                    {passwordVisible ? <EyeClosedIcon /> : <Eye />} {/* Eye icon */}
                  </button>
                </div>
              </Field>
              <Field>
                <div className="flex items-center flex-wrap md:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" disabled={isLoading} />
                    <Label htmlFor="remember">Remember me</Label>
                  </div>
                  <Link
                    href={isPartner ? "/partner/forgot-password" : "/admin/forgot-password"}
                    className="ml-auto inline-block text-sm text-[#C13C3D] hover:text-[#a03030] transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </Field>
              <Field className="flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={isLoading || !email || !password} // 👈 Disable when loading OR fields are empty
                  className="relative"
                >
                  {isLoading ? (
                    <>
                      <Spinner />
                      Sending OTP...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
