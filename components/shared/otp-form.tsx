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
import { useState, useEffect } from "react";
import authAPI from "@/lib/api/auth";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner"
import { QRCodeSVG } from "qrcode.react";
import { Copy } from "lucide-react";

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
  const [isNewPartner, setIsNewPartner] = useState(false);
  // Authenticator-app enrollment data (only on first login)
  const [otpauthUri, setOtpauthUri] = useState("");
  const [totpSecret, setTotpSecret] = useState("");

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
    setOtpauthUri(sessionStorage.getItem('mfa_otpauth_uri') ?? "");
    setTotpSecret(sessionStorage.getItem('mfa_secret') ?? "");
  }, [router, isPartner]);

  const clearLoginSession = () => {
    sessionStorage.removeItem("otp_user_id");
    sessionStorage.removeItem("login_email");
    sessionStorage.removeItem("is_new_partner");
    sessionStorage.removeItem("mfa_otpauth_uri");
    sessionStorage.removeItem("mfa_secret");
  };

  const backToLogin = () => {
    clearLoginSession();
    router.push(isPartner ? '/partner/login' : '/admin/login');
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(totpSecret);
      toast.success("Setup key copied");
    } catch {
      toast.error("Could not copy. Please type the key manually.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit code");
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
        clearLoginSession();

        toast.success(isNewPartner ? "Authenticator app linked!" : "Verified successfully!");

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

  // New partners who lost the QR code (or got locked out) can restart setup
  const handleRestartSetup = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await authAPI.resendPartnerOTP(email);

      if (result.success && result.otpauth_uri) {
        sessionStorage.setItem('mfa_otpauth_uri', result.otpauth_uri);
        sessionStorage.setItem('mfa_secret', result.totp_secret ?? "");
        setOtpauthUri(result.otpauth_uri);
        setTotpSecret(result.totp_secret ?? "");
        setOtp("");
        toast.success("Setup restarted. Scan the QR code and enter the new code.");
      } else {
        setError(result.message || "Could not restart setup. Please try again.");
        toast.error(result.message || "Could not restart setup. Please try again.");
      }
    } catch (error) {
      console.error("Restart setup error:", error);
      setError("Could not restart setup. Please try again.");
      toast.error("Could not restart setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isSetup = !!otpauthUri;

  return (
    <Card {...props}>
      <CardHeader className="text-center">
        <CardTitle className="leading-[1.2] text-3xl">
          Confirm that it&apos;s you
        </CardTitle>
        <CardDescription className="mx-auto text-[#444444] leading-[1.4] w-full max-w-xs">
          {isNewPartner && !isSetup ? (
            <>
              Open your authenticator app and enter the 6-digit code for this account.
              {email && (
                <div className="mt-2 text-sm font-medium">
                  Account: <span className="text-[#C13C3D]">{email}</span>
                </div>
              )}
            </>
          ) : isSetup ? (
            <>
              Two-factor authentication is required. Scan this QR code with an authenticator app
              (Google Authenticator, Microsoft Authenticator, Authy), then enter the 6-digit code it shows.
            </>
          ) : (
            <>
              Open your authenticator app and enter the 6-digit code for this account.
              {email && (
                <div className="mt-2 text-sm font-medium">
                  Account: <span className="text-[#C13C3D]">{email}</span>
                </div>
              )}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="py-4 text-[#444444]" onSubmit={handleSubmit}>
          <FieldGroup>
            {isSetup && (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-md border bg-white p-3">
                  <QRCodeSVG value={otpauthUri} size={180} />
                </div>
                {totpSecret && (
                  <div className="text-center text-xs text-gray-600">
                    Can&apos;t scan? Enter this key in your app:
                    <button
                      type="button"
                      onClick={copySecret}
                      className="mt-1 flex items-center gap-1 mx-auto font-mono text-sm text-[#444444] break-all"
                      title="Copy setup key"
                    >
                      {totpSecret.match(/.{1,4}/g)?.join(" ")}
                      <Copy className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  </div>
                )}
              </div>
            )}

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
                  isNewPartner ? "Verify & Continue" : "Verify & Login"
                )}
              </Button>

              {isNewPartner ? (
                <FieldDescription className="text-center">
                  Lost the QR code or locked out?{" "}
                  <button
                    type="button"
                    onClick={handleRestartSetup}
                    disabled={isLoading}
                    className="text-[#C13C3D] no-underline hover:text-[#a03030] hover:no-underline disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Restart setup
                  </button>
                </FieldDescription>
              ) : (
                <FieldDescription className="text-center">
                  Lost access to your authenticator app? Contact an administrator to reset it.{" "}
                  <button
                    type="button"
                    onClick={backToLogin}
                    disabled={isLoading}
                    className="text-[#C13C3D] no-underline hover:text-[#a03030] hover:no-underline transition-colors"
                  >
                    Back to login
                  </button>
                </FieldDescription>
              )}
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default OTPForm;