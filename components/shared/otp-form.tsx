"use client";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useState, useEffect, useRef } from "react";
import authAPI from "@/lib/api/auth";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner"

interface OTPFormProps extends React.ComponentProps<"div"> {
  isPartner?: boolean;
}

// Define proper types for the API responses
interface VerifyPartnerOTPResponse {
  success: boolean;
  data: {
    email: string
    setup_token: string
  }
  message: string;
}

interface VerifyOTPResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  message: string;
}

const OTPForm = ({ isPartner, ...props }: OTPFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isNewPartner, setIsNewPartner] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedUserId = sessionStorage.getItem('otp_user_id');
    const storedEmail = sessionStorage.getItem('login_email');
    const storedIsNewPartner = sessionStorage.getItem('is_new_partner');

    if (!storedUserId || !storedEmail) {
      if (isPartner) {
        router.push('/partner/login');
      } else {
        router.push('/admin/login');
      }
      return;
    }

    setUserId(storedUserId);
    setEmail(storedEmail);
    setIsNewPartner(storedIsNewPartner === 'true');
  }, [router, isPartner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError("Please enter a complete 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      let result;

      if (isPartner) {
        if (isNewPartner) {
          // NEW PARTNER: Use verifyPartnerOTP which returns setup_token
          console.log("Verifying OTP for NEW partner");
          result = await authAPI.verifyPartnerOTP(userId, otp, email) as VerifyPartnerOTPResponse;
        } else {
          // EXISTING PARTNER: Use verifyOTP which returns JWT tokens
          console.log("Verifying OTP for EXISTING partner");
          result = await authAPI.verifyOTP(userId, otp, email) as VerifyOTPResponse;
        }
      } else {
        // ADMIN USER: Use verifyOTP
        result = await authAPI.verifyOTP(userId, otp, email) as VerifyOTPResponse;
      }

      console.log("OTP verification result:", result);

      if (result.success) {
        sessionStorage.removeItem("otp_user_id");
        sessionStorage.removeItem("login_email");
        sessionStorage.removeItem("is_new_partner");

        toast.success("OTP verified successfully!");

        if (isPartner) {
          if (isNewPartner) {
            const partnerResult = result as VerifyPartnerOTPResponse;
            console.log("New partner setup token:", partnerResult);
            if (partnerResult.data.setup_token) {
              sessionStorage.setItem('setup_token', partnerResult.data.setup_token);
              sessionStorage.setItem('partner_email', email);
              router.push("/partner/set-password");
            } else {
              setError("Setup token missing. Please contact support.");
              toast.error("Setup token missing. Please contact support.");
            }
          } else {
            router.push(redirect || "/projects");
          }
        } else {
          router.push(redirect || "/projects");

        }

        setOtp("");
        setError("");
      }
      else {
        setError(result.message);
        setOtp(""); // Clear OTP input
        toast.error(result.message);
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    setError("");

    try {
      let result;

      if (isPartner) {
        result = await authAPI.resendPartnerOTP(email);
      } else {
        // Admin has no dedicated resend endpoint — redirect to login to re-authenticate
        sessionStorage.removeItem('otp_user_id');
        sessionStorage.removeItem('login_email');
        toast.info("Please log in again to receive a new OTP.");
        router.push('/admin/login');
        return;
      }

      if (result.success) {
        toast.success("OTP resent successfully. Please check your email.");
        startCountdown(60);
      } else {
        setError(result.message || "Failed to resend OTP. Please try again.");
        toast.error(result.message || "Failed to resend OTP. Please try again.");
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      setError("Failed to resend OTP. Please try again.");
      toast.error("Failed to resend OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const startCountdown = (seconds: number) => {
    setCountdown(seconds);
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    startCountdown(60);
    return () => clearInterval(intervalRef.current!);
  }, []);

  return (
    <Card {...props}>
      <CardHeader className="text-center">
        <CardTitle className="leading-[1.2] text-3xl">
          Confirm that it&apos;s you
        </CardTitle>
        <CardDescription className="mx-auto text-[#444444] leading-[1.4] w-full max-w-xs">
          Enter the 6-digit code that was sent to your registered email address.
          {email && (
            <div className="mt-2 text-sm font-medium">
              Sent to: <span className="text-[#C13C3D]">{email}</span>
              {isPartner && (
                <div className="text-xs text-gray-500 mt-1">
                  {isNewPartner ? "New partner account" : "Existing partner account"}
                </div>
              )}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="py-4 text-[#444444]" onSubmit={handleSubmit}>
          <FieldGroup>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}

            <Field>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  setError(""); // Clear error when user starts typing
                }}
                disabled={isLoading}
                required
              >
                <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border w-full">
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </Field>

            <FieldGroup>
              <Button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full relative"
              >
                {isLoading ? (
                  <>
                    <Spinner />
                    Verifying...
                  </>
                ) : (
                  "Verify Email & Login"
                )}
              </Button>

              <FieldDescription className="text-center">
                Didn&apos;t receive a code?{" "}
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={countdown > 0 || isLoading}
                  className="text-[#C13C3D] no-underline hover:text-[#a03030] hover:no-underline disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {countdown > 0 ? `Request another in ${countdown}s` : "Request another"}
                </button>
              </FieldDescription>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default OTPForm;