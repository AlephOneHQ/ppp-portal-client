"use client"

import { CheckCircle, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  label: string
  completed: boolean
}

// ─── Partner props ────────────────────────────────────────────────────────────
interface PartnerSigningStepsProps {
  isAdmin?: false
  witnessInvited: boolean
  witnessSigned: boolean
  partnerSigned: boolean
  signedCount: number
  totalCount: number
}

// ─── Admin props ──────────────────────────────────────────────────────────────
interface AdminSigningStepsProps {
  isAdmin: true
  /** Partner has been sent the contract invitation */
  partnerInvited: boolean
  /** Partner's witness has been invited */
  partnerWitnessInvited: boolean
  /** Partner's witness has signed */
  partnerWitnessSigned: boolean
  /** Partner has signed */
  partnerSigned: boolean
  /** Admin witness has been invited from the Witnesses tab */
  adminWitnessInvited: boolean
  /** Admin witness has signed */
  adminWitnessSigned: boolean
  /** The primary admin has signed */
  adminSigned: boolean
  /** count of admin-side signers who have signed */
  signedCount: number
  /** total admin-side signers required */
  totalCount: number
}

type ContractSigningStepsProps = PartnerSigningStepsProps | AdminSigningStepsProps

export function ContractSigningSteps(props: ContractSigningStepsProps) {
  if (props.isAdmin) {
    return <AdminSigningSteps {...props} />
  }
  return <PartnerSigningSteps {...(props as PartnerSigningStepsProps)} />
}

// ─── Partner steps ────────────────────────────────────────────────────────────
function PartnerSigningSteps({
  witnessInvited,
  witnessSigned,
  partnerSigned,
  signedCount,
  totalCount,
}: PartnerSigningStepsProps) {
  const steps: Step[] = [
    {
      label: "Go to the Witnesses tab and invite a witness to sign the contract.",
      completed: witnessInvited,
    },
    {
      label: "The witness has signed the contract.",
      completed: witnessSigned,
    },
    {
      label: "Proceed to sign the contract to complete the process.",
      completed: partnerSigned,
    },
  ]

  return (
    <StepsCard
      headerTitle="Contract Signing Instructions"
      headerBody="You will only be able to sign the contract after a witness from your organisation has signed. Please follow the steps below:"
      steps={steps}
      signedCount={signedCount}
      totalCount={totalCount}
      accentClass="amber"
    />
  )
}

// ─── Admin steps ──────────────────────────────────────────────────────────────
function AdminSigningSteps({
  partnerInvited,
  partnerWitnessInvited,
  partnerWitnessSigned,
  partnerSigned,
  adminWitnessInvited,
  adminWitnessSigned,
  adminSigned,
  signedCount,
  totalCount,
}: AdminSigningStepsProps) {
  const steps: Step[] = [
    {
      label: "Invite the partner to sign the contract.",
      completed: partnerInvited,
    },
    {
      label: "Partner invites a secondary witness to sign the contract.",
      completed: partnerWitnessInvited,
    },
    {
      label: "Contract signed by the partner's witness.",
      completed: partnerWitnessSigned,
    },
    {
      label: "Contract signed by the partner.",
      completed: partnerSigned,
    },
    {
      label: "From the Witnesses tab, invite a secondary admin from your organisation to sign as your witness.",
      completed: adminWitnessInvited,
    },
    {
      label: "Your Witness has signed the contract.",
      completed: adminWitnessSigned,
    },
    {
      label: "Proceed to sign the contract to complete the process.",
      completed: adminSigned,
    },
  ]

  return (
    <StepsCard
      headerTitle="Contract Signing Instructions"
      headerBody="You will only be able to sign the contract after the partner, their witness, and a second admin from your organisation (acting as your witness) have all signed. Please follow the steps below:"
      steps={steps}
      signedCount={signedCount}
      totalCount={totalCount}
      accentClass="blue"
    />
  )
}

// ─── Shared card ──────────────────────────────────────────────────────────────
function StepsCard({
  headerTitle,
  headerBody,
  steps,
  signedCount,
  totalCount,
  accentClass,
}: {
  headerTitle: string
  headerBody: string
  steps: Step[]
  signedCount: number
  totalCount: number
  accentClass: "amber" | "blue"
}) {
  const isAmber = accentClass === "amber"
  const border = isAmber ? "border-amber-200" : "border-blue-200"
  const bg = isAmber ? "bg-amber-50" : "bg-blue-50"
  const titleColor = isAmber ? "text-amber-900" : "text-blue-900"
  const bodyColor = isAmber ? "text-amber-800" : "text-blue-800"
  const counterColor = isAmber ? "text-amber-700" : "text-blue-700"
  const barEmpty = isAmber ? "bg-amber-200" : "bg-blue-200"
  const stepDone = isAmber ? "text-amber-900 line-through opacity-60" : "text-blue-900 line-through opacity-60"
  const stepPending = isAmber ? "text-amber-800" : "text-blue-800"
  const circleEmpty = isAmber ? "text-amber-400" : "text-blue-400"

  return (
    <div className={cn("rounded-lg border p-4 space-y-3", border, bg)}>
      {/* Header */}
      <div>
        <p className={cn("text-sm font-semibold", titleColor)}>{headerTitle}</p>
        <p className={cn("text-xs mt-1 leading-relaxed", bodyColor)}>{headerBody}</p>
      </div>

      {/* Progress counter */}
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-medium", counterColor)}>
          Signatures: {signedCount}/{totalCount}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: totalCount }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 w-6 rounded-full transition-colors",
                i < signedCount ? "bg-[#C13C3D]" : barEmpty
              )}
            />
          ))}
        </div>
      </div>

      {/* Steps */}
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={index} className="flex items-start gap-2.5">
            {step.completed ? (
              <CheckCircle className="h-4 w-4 text-[#C13C3D] mt-0.5 shrink-0" />
            ) : (
              <Circle className={cn("h-4 w-4 mt-0.5 shrink-0", circleEmpty)} />
            )}
            <span className={cn("text-xs leading-relaxed", step.completed ? stepDone : stepPending)}>
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
