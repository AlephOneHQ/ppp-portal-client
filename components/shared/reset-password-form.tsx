"use client"

import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { authAPI } from "@/lib/api/auth";
import { Eye, EyeOff } from "lucide-react"; // Import the eye icons from lucide-react

interface ResetPasswordFormProps extends React.ComponentProps<"div"> {
    isPartner?: boolean;
}

export function ResetPasswordForm({
    className,
    isPartner = false,
    ...props
}: ResetPasswordFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    const [formData, setFormData] = useState({
        code: "",
        new_password: "",
        confirm_password: "",
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false); // State to toggle visibility for new password
    const [showConfirmPassword, setShowConfirmPassword] = useState(false); // State to toggle visibility for confirm password

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code) return;

        setLoading(true);
        try {
            const result = await authAPI.verifyPasswordResetOTP(email, formData.code);
            
            if (result.success) {
                setResetToken(result.reset_token_id ?? "");
                setMessage("Code verified! Now set your new password.");
            } else {
                setMessage(result.message || "Invalid code");
            }
        } catch (error) {
            setMessage("Failed to verify code");
            console.error("OTP verification error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.new_password !== formData.confirm_password) {
            setMessage("Passwords do not match");
            return;
        }

        if (formData.new_password.length < 8) {
            setMessage("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            const result = await authAPI.completePasswordReset(
                email,
                resetToken,
                formData.new_password,
                formData.confirm_password
            );

            if (result.success) {
                setMessage("Password reset successful! Redirecting to login...");
                setTimeout(() => {
                    if (isPartner) {
                        router.push("/partner/login");
                    } else {
                        router.push("/admin/login");
                    }
                }, 2000);
            } else {
                setMessage(result.message || "Failed to reset password");
            }
        } catch (error) {
            setMessage("An error occurred while resetting password");
            console.error("Password reset error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetToken) {
            await handleVerifyOTP(e);
        } else {
            await handleSetPassword(e);
        }
    };

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="leading-[1.2] text-3xl">Password reset</CardTitle>
                    <CardDescription className="mx-auto text-[#444444] leading-[1.4] w-full max-w-sm">
                        {!resetToken 
                            ? "Enter the 6-digit code from your authenticator app."
                            : "Create a new password to complete the reset"
                        }
                        {!resetToken && (
                            <>
                                {" "}No authenticator app set up, or lost your phone? Contact an administrator.
                            </>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="py-4 text-[#444444]" onSubmit={handleSubmit}>
                        <FieldGroup>
                            {!resetToken ? (
                                <Field>
                                    <FieldLabel htmlFor="code">Authenticator code</FieldLabel>
                                    <Input
                                        id="code"
                                        name="code"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="\d{6}"
                                        maxLength={6}
                                        placeholder="Enter 6-digit code"
                                        required
                                        value={formData.code}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />
                                </Field>
                            ) : (
                                <>
                                    <Field>
                                        <FieldLabel htmlFor="new_password">Create Password</FieldLabel>
                                        <div className="relative">
                                            <Input 
                                                id="new_password" 
                                                name="new_password"
                                                type={showNewPassword ? "text" : "password"} // Toggle password visibility
                                                placeholder="Enter your new password (min 8 characters)" 
                                                required 
                                                minLength={8}
                                                value={formData.new_password}
                                                onChange={handleChange}
                                                disabled={loading}
                                            />
                                            <button 
                                                type="button"
                                                className="absolute top-1/2 right-3 transform -translate-y-1/2"
                                                onClick={() => setShowNewPassword(prev => !prev)}
                                            >
                                                {showNewPassword ? <EyeOff /> : <Eye />} {/* Toggle eye icon */}
                                            </button>
                                        </div>
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="confirm_password">Confirm Password</FieldLabel>
                                        <div className="relative">
                                            <Input 
                                                id="confirm_password" 
                                                name="confirm_password"
                                                type={showConfirmPassword ? "text" : "password"} // Toggle password visibility
                                                placeholder="Re-enter password" 
                                                required 
                                                minLength={8}
                                                value={formData.confirm_password}
                                                onChange={handleChange}
                                                disabled={loading}
                                            />
                                            <button 
                                                type="button"
                                                className="absolute top-1/2 right-3 transform -translate-y-1/2"
                                                onClick={() => setShowConfirmPassword(prev => !prev)}
                                            >
                                                {showConfirmPassword ? <EyeOff /> : <Eye />} {/* Toggle eye icon */}
                                            </button>
                                        </div>
                                    </Field>
                                </>
                            )}
                            
                            {message && (
                                <div className={`text-sm p-3 rounded ${
                                    message.includes("successful") || message.includes("verified")
                                        ? "bg-green-100 text-green-800" 
                                        : "bg-red-100 text-red-800"
                                }`}>
                                    {message}
                                </div>
                            )}
                            
                            <Field className="flex flex-col gap-2">
                                <Button 
                                    type="submit" 
                                    disabled={loading}
                                >
                                    {loading 
                                        ? "Processing..." 
                                        : !resetToken 
                                            ? "Verify Code" 
                                            : "Reset Password"
                                    }
                                </Button>
                                <Button 
                                    type="button"
                                    variant="ghost" 
                                    onClick={() => router.back()}
                                    disabled={loading}
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
