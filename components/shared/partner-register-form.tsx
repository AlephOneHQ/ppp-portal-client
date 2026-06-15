"use client"

import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type * as React from "react"
import Link from "next/link"
import { useState, useMemo } from "react"
import authAPI from "@/lib/api/auth"
import { countriesNameAsCode } from "@/lib/utils/countries"
import { toast } from "sonner"

// Exact business types from Django model
const BUSINESS_TYPES = [
    { value: "agriculture_agribusiness", label: "Agriculture & Agribusiness" },
    { value: "manufacturing_production", label: "Manufacturing & Production" },
    { value: "oil_gas_energy", label: "Oil & Gas / Energy" },
    { value: "technology_ict", label: "Technology & ICT" },
    { value: "construction_real_estate", label: "Construction & Real Estate" },
    { value: "transportation_logistics", label: "Transportation & Logistics" },
    { value: "financial_services", label: "Financial Services" },
    { value: "retail_trade", label: "Retail & Trade" },
    { value: "education_training", label: "Education & Training" },
    { value: "healthcare_pharmaceuticals", label: "Healthcare & Pharmaceuticals" },
    { value: "hospitality_tourism", label: "Hospitality & Tourism" },
    { value: "media_entertainment", label: "Media & Entertainment" },
    { value: "professional_services", label: "Professional Services" }
]

// Field error interface
interface FieldErrors {
    [key: string]: string[];
}

// API Error response interface
interface ApiErrorResponse {
    response?: {
        data?: {
            message?: string;
            extra?: {
                fields?: FieldErrors;
            };
        };
    };
}

export function PartnerRegisterForm({ className, ...props }: React.ComponentProps<typeof Card>) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [generalError, setGeneralError] = useState("")
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

    // Form state
    const [formData, setFormData] = useState({
        email: "",
        businessName: "",
        countryOfIncorporation: "",
        cacNumber: "",
        businessType: "",
        businessAddress: "",
        contactPersonName: "",
        phoneNumber: ""
    })

    // Check if all required fields are filled
    const isFormValid = useMemo(() => {
        const requiredFields = [
            formData.email,
            formData.businessName,
            formData.countryOfIncorporation,
            formData.businessType,
            formData.businessAddress,
            formData.contactPersonName,
            formData.phoneNumber
        ]

        // Check if all required fields have values
        const allFieldsFilled = requiredFields.every(field => field.trim() !== "")

        // If country is Nigeria, CAC number is required
        const cacNumberValid = formData.countryOfIncorporation.toLowerCase() !== 'nigeria' ||
            (formData.countryOfIncorporation.toLowerCase() === 'nigeria' && formData.cacNumber.trim() !== "")

        return allFieldsFilled && cacNumberValid
    }, [formData])

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
        // Clear field error when user starts typing
        if (fieldErrors[field]) {
            setFieldErrors(prev => ({
                ...prev,
                [field]: []
            }))
        }
        // Clear general error
        if (generalError) setGeneralError("")
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!isFormValid) {
            setGeneralError("Please fill all required fields correctly")
            return
        }

        setIsLoading(true)
        setGeneralError("")
        setFieldErrors({})

        try {
            const result = await authAPI.partnerSignup({
                email: formData.email,
                business_name: formData.businessName,
                country_of_incorporation: formData.countryOfIncorporation,
                cac_number: formData.countryOfIncorporation.toLowerCase() === 'nigeria' ? formData.cacNumber : undefined,
                business_type: formData.businessType,
                business_address: formData.businessAddress,
                contact_person_name: formData.contactPersonName,
                phone_number: formData.phoneNumber
            })

            if (result.success) {
                // Store user ID for potential future use
                sessionStorage.setItem('otp_user_id', result.user_id ?? "")
                sessionStorage.setItem('login_email', formData.email)
                sessionStorage.setItem('is_new_partner', 'true')

                toast.success("Registration successful! Please verify your email with the OTP sent.")

                // Redirect to email verification page or success page
                router.push("/partner/otp-verification")
            } else {
                toast.error(result.message)
                setGeneralError(result.message ?? "")
            }
        } catch (error: unknown) {
            console.error("Registration error:", error)

            // Handle field-specific validation errors
            const apiError = error as ApiErrorResponse;
            if (apiError.response?.data?.extra?.fields) {
                setFieldErrors(apiError.response.data.extra.fields)
                setGeneralError("Please fix the validation errors below")
            } else {
                setGeneralError(apiError.response?.data?.message || "An unexpected error occurred. Please try again.")
            }
        } finally {
            setIsLoading(false)
        }
    }

    // Helper function to get error message for a field
    const getFieldError = (fieldName: string): string | null => {
        if (fieldErrors[fieldName] && fieldErrors[fieldName].length > 0) {
            return fieldErrors[fieldName][0] // Return the first error message
        }
        return null
    }

    // Helper function to check if field has error
    const hasFieldError = (fieldName: string): boolean => {
        return !!getFieldError(fieldName)
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="leading-[1.2] text-3xl">Partner sign up</CardTitle>
                    <CardDescription className="mx-auto text-[#444444] leading-[1.4] w-full max-w-md">
                        Fill the form below to create your partner account. Already have one?{" "}
                        <Link href="/partner/login" className="text-[#C13C3D] underline-offset-4 hover:underline">
                            Proceed to login
                        </Link>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="py-4 text-[#444444]" onSubmit={handleSubmit}>
                        {generalError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-6">
                                {generalError}
                            </div>
                        )}

                        <FieldSet className="mb-6">
                            <FieldLegend className="text-[#040404]">Business information</FieldLegend>
                            <FieldDescription>Tell us about your registered business.</FieldDescription>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="business-name">Business name *</FieldLabel>
                                    <Input
                                        id="business-name"
                                        type="text"
                                        placeholder="e.g. ABC Construction Ltd"
                                        required
                                        value={formData.businessName}
                                        onChange={(e) => handleInputChange('businessName', e.target.value)}
                                        disabled={isLoading}
                                        className={hasFieldError('business_name') ? "border-red-500" : ""}
                                    />
                                    {hasFieldError('business_name') && (
                                        <div className="text-red-500 text-sm mt-1">
                                            {getFieldError('business_name')}
                                        </div>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="country">Country of incorporation *</FieldLabel>
                                    <Select
                                        value={formData.countryOfIncorporation}
                                        onValueChange={(value) => handleInputChange('countryOfIncorporation', value)}
                                        disabled={isLoading}
                                    >
                                        <SelectTrigger
                                            id="country"
                                            className={hasFieldError('country_of_incorporation') ? "border-red-500" : ""}
                                        >
                                            <SelectValue placeholder="Select country" />
                                        </SelectTrigger>

                                        <SelectContent>
                                            {countriesNameAsCode.map((c) => (
                                                <SelectItem key={c.code} value={c.code.toLowerCase()}>
                                                    {c.country}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {hasFieldError('country_of_incorporation') && (
                                        <div className="text-red-500 text-sm mt-1">
                                            {getFieldError('country_of_incorporation')}
                                        </div>
                                    )}
                                </Field>

                                {/* CAC Number - Only show for Nigeria */}
                                {formData.countryOfIncorporation.toLowerCase() === 'nigeria' && (
                                    <Field>
                                        <FieldLabel htmlFor="cac-number">CAC Number *</FieldLabel>
                                        <Input
                                            id="cac-number"
                                            type="text"
                                            placeholder="Enter CAC registration number (e.g. RC1234567)"
                                            value={formData.cacNumber}
                                            onChange={(e) => handleInputChange('cacNumber', e.target.value)}
                                            disabled={isLoading}
                                            maxLength={9}
                                            className={hasFieldError('cac_number') ? "border-red-500" : ""}
                                        />
                                        {hasFieldError('cac_number') && (
                                            <div className="text-red-500 text-sm mt-1">
                                                {getFieldError('cac_number')}
                                            </div>
                                        )}
                                        <FieldDescription>
                                            Maximum 9 characters allowed (e.g., RC1234567)
                                        </FieldDescription>
                                    </Field>
                                )}

                                <Field>
                                    <FieldLabel htmlFor="business-type">Business type *</FieldLabel>
                                    <Select
                                        value={formData.businessType}
                                        onValueChange={(value) => handleInputChange('businessType', value)}
                                        disabled={isLoading}
                                    >
                                        <SelectTrigger
                                            id="business-type"
                                            className={hasFieldError('business_type') ? "border-red-500" : ""}
                                        >
                                            <SelectValue placeholder="Select business type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BUSINESS_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {hasFieldError('business_type') && (
                                        <div className="text-red-500 text-sm mt-1">
                                            {getFieldError('business_type')}
                                        </div>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="business-address">Business address *</FieldLabel>
                                    <Input
                                        id="business-address"
                                        type="text"
                                        placeholder="e.g. 123 Lagos Street, Lagos, Nigeria"
                                        required
                                        value={formData.businessAddress}
                                        onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                                        disabled={isLoading}
                                        className={hasFieldError('business_address') ? "border-red-500" : ""}
                                    />
                                    {hasFieldError('business_address') && (
                                        <div className="text-red-500 text-sm mt-1">
                                            {getFieldError('business_address')}
                                        </div>
                                    )}
                                </Field>
                            </FieldGroup>
                        </FieldSet>

                        <FieldSeparator />

                        <FieldSet className="mt-6">
                            <FieldLegend className="text-[#040404]">Contact person</FieldLegend>
                            <FieldDescription>
                                The individual listed here will be used as the official contact for correspondence and verification.
                            </FieldDescription>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="contact-name">Name of contact person *</FieldLabel>
                                    <Input
                                        id="contact-name"
                                        type="text"
                                        placeholder="Enter full name here"
                                        required
                                        value={formData.contactPersonName}
                                        onChange={(e) => handleInputChange('contactPersonName', e.target.value)}
                                        disabled={isLoading}
                                        className={hasFieldError('contact_person_name') ? "border-red-500" : ""}
                                    />
                                    {hasFieldError('contact_person_name') && (
                                        <div className="text-red-500 text-sm mt-1">
                                            {getFieldError('contact_person_name')}
                                        </div>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="phone-number">Phone number *</FieldLabel>
                                    <Input
                                        id="phone-number"
                                        type="tel"
                                        placeholder="e.g. +234 800 123 4567"
                                        required
                                        value={formData.phoneNumber}
                                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                                        disabled={isLoading}
                                        className={hasFieldError('phone_number') ? "border-red-500" : ""}
                                    />
                                    {hasFieldError('phone_number') && (
                                        <div className="text-red-500 text-sm mt-1">
                                            {getFieldError('phone_number')}
                                        </div>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="email-address">Email address *</FieldLabel>
                                    <Input
                                        id="email-address"
                                        type="email"
                                        placeholder="john.doe@example.com"
                                        required
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        disabled={isLoading}
                                        className={hasFieldError('email') ? "border-red-500" : ""}
                                    />
                                    {hasFieldError('email') && (
                                        <div className="text-red-500 text-sm mt-1">
                                            {getFieldError('email')}
                                        </div>
                                    )}
                                </Field>

                                <Field className="flex flex-col gap-2 mt-2">
                                    <Button
                                        type="submit"
                                        className="bg-[#C13C3D] hover:bg-[#A03334] text-white relative"
                                        disabled={!isFormValid || isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Submitting...
                                            </>
                                        ) : (
                                            "Continue"
                                        )}
                                    </Button>
                                    {!isFormValid && (
                                        <FieldDescription className="text-center text-amber-600">
                                            Please fill all required fields (*) to continue
                                        </FieldDescription>
                                    )}
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}