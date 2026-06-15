"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { CheckCircle, User } from "lucide-react"

interface ContractData {
  title: string
  reference_number?: string
  project_title: string
  partner_name: string
  partner_contact_name?: string
  commences_on: string
  ends_on: string
  estimated_project_cost: number
  scope_of_service: string
  oyntcda_roles: string
  partner_responsibilities: string
  capital_structure: string
  payment_mechanism: string
  revenue_sharing?: string
  kpis: string
  slas: string
  monitoring_and_reporting: string
  dispute_resolution: string
  termination_and_exit_clauses: string
  miscellaneous?: string
  status?: string
}

interface Milestone {
  description: string
  due_date: string
}

interface Signatory {
  id: string
  name: string
  email: string
  role?: string
  signature_url?: string
  signed_at?: string
}

export type { ContractData, Milestone, Signatory }

interface ContractTemplateProps {
  contract: ContractData
  milestones?: Milestone[]
  partner_contract_signatories?: Signatory[]
  admin_contract_signatories?: Signatory[]
  logoUrl?: string
  oyoLogoUrl?: string
  watermarkLogoUrl?: string  // Changed from watermarkText to watermarkLogoUrl
  showSignatures?: boolean
}

export function ContractTemplate({
  contract,
  milestones = [],
  partner_contract_signatories = [],
  admin_contract_signatories = [],
  logoUrl,
  oyoLogoUrl,
  watermarkLogoUrl,  // Changed prop name
  showSignatures = true,
}: ContractTemplateProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Find admin and partner signatories
  const adminSignatory = admin_contract_signatories.find(sig => sig.role === "Admin") || admin_contract_signatories[0]
  const adminWitnessSignatory = admin_contract_signatories.find(sig => sig.role === "Admin Witness") || admin_contract_signatories[1]
  const partnerSignatory = partner_contract_signatories[0]

  return (
    <>
      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          
          /* Page setup */
          @page {
            size: A4;
            margin: 20mm;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
          
          [data-contract-template] {
            background: white !important;
            max-width: 100% !important;
            padding: 0 !important;
          }
          
          /* Ensure colors print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Page breaks */
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          
          .avoid-break, section {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Signatures section */
          .signature-section {
            page-break-inside: avoid;
          }
          
          /* Watermark on every page */
          .watermark-container {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: -1 !important;
            pointer-events: none !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          
          .watermark-logo {
            max-width: 40% !important;
            max-height: 40% !important;
            opacity: 0.15 !important;
            filter: grayscale(100%) !important;
            transform: rotate(-45deg) scale(2) !important;
            object-fit: contain !important;
          }
        }
      `}</style>

      <div className="relative bg-white min-h-screen" data-contract-template>
        <div className="relative max-w-[210mm] mx-auto p-8 space-y-8 text-gray-600">
          {/* Watermark Container - Fixed positioning for print */}
          {watermarkLogoUrl && (
            <div className="watermark-container fixed inset-0 pointer-events-none select-none flex items-center justify-center overflow-hidden">
              <div className="watermark-logo-wrapper">
                <img
                  src={watermarkLogoUrl}
                  alt="Watermark Logo"
                  className="watermark-logo"
                  crossOrigin="anonymous"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Content Container */}
          <div className="relative">
            {/* Header */}
            <header className="border-b border-[#C13C3D] pb-8 space-y-4">
              <div className="text-center grid grid-cols-7 items-center gap-3">
                {oyoLogoUrl && (
                  <div className="mb-4 col-span-1">
                    <img
                      src={oyoLogoUrl}
                      alt="Organization Logo"
                      className="h-20 mx-auto"
                      crossOrigin="anonymous"
                      loading="lazy"
                    />
                  </div>
                )}

                <p className="col-span-5 uppercase font-extrabold text-[#C13C3D] text-2xl">
                  Oyo state new towns and cities development authority (oyntcda)
                </p>

                {logoUrl && (
                  <div className="mb-4 col-span-1">
                    <img
                      src={logoUrl}
                      alt="Organization Logo"
                      className="h-20 mx-auto"
                      crossOrigin="anonymous"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 italic max-w-sm">
                Further correspondence on this contract should be addressed to the Executive Adviser, quoting
              </p>

              {contract.reference_number && (
                <Badge variant="outline" className="text-sm px-4 py-1 border-2 border-[#C13C3D] text-[#C13C3D] bg-white">
                  Contract Reference: {contract.reference_number}
                </Badge>
              )}
            </header>

            {/* Contract Details */}
            <section className="space-y-6">
              <p className="my-2">Dear Sir/Ma</p>
              <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                CONTRACT AWARD FOR <span className="text-[#C13C3D]">{contract.title}</span>
              </h1>

              <p>
                We are pleased to inform you that <span className="font-bold">Oyo State New Towns And Cities Development
                  Authority (&quot;OYNTCDA&quot;)</span> has awarded the subject contract to you, <span className="font-bold">{contract.partner_name} (&quot;Consultant&quot;)</span> under the terms and conditions stated herein, as the successful bidder, following
                a competitive procurement process. This contract outlines the terms and conditions under which you
                will provide the specified goods/services to <span className="font-bold">OYNTCDA</span>. Please review the details of the contract carefully
                and proceed with the necessary steps to formalize our agreement.
              </p>

              <div>
                <p className="text-lg text-[#C13C3D] font-bold">
                  Scope Of Service
                </p>
                <p className="whitespace-pre-wrap">{contract.scope_of_service}</p>
              </div>

              <div>
                <p className="text-lg text-[#C13C3D] font-bold">
                  Commencement Date
                </p>
                <p className="whitespace-pre-wrap">The Project shall commence on <span className="font-bold">{formatDate(contract.commences_on)}</span></p>
              </div>

              <div>
                <p className="text-lg text-[#C13C3D] font-bold">
                  Completion Period
                </p>
                <p className="whitespace-pre-wrap">The timeline for all deliverables is the <span className="font-bold">{formatDate(contract.ends_on)}</span>, after which a review period of 2 days is required.</p>
              </div>

              <div>
                <p className="text-lg text-[#C13C3D] font-bold">
                  Contract Sum
                </p>
                <p className="whitespace-pre-wrap">The total sum is of (<span className="font-bold">{formatCurrency(contract.estimated_project_cost)}</span>), after which a review period of 2 days is required.</p>
              </div>

              <div>
                <p className="text-lg text-[#C13C3D] font-bold">
                  Project Milestones
                </p>
                {milestones.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-semibold">S/N</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-semibold">Description</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-semibold">Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {milestones.map((milestone, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                            <td className="border border-gray-300 px-4 py-2">{milestone.description}</td>
                            <td className="border border-gray-300 px-4 py-2">{formatDate(milestone.due_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No milestones defined for this contract.</p>
                )}
              </div>

              <div>
                <p className="text-lg text-[#C13C3D] font-bold">
                  Roles & Responsibilities
                </p>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">OYNTCDA Responsibilities</h3>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {contract.oyntcda_roles}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Partner Responsibilities</h3>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {contract.partner_responsibilities}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-lg text-[#C13C3D] font-bold">
                  Finance
                </p>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Capital Structure</h3>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {contract.capital_structure}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Payment Mechanism</h3>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {contract.payment_mechanism}
                    </p>
                  </div>

                  {contract.revenue_sharing && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Revenue Sharing</h3>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {contract.revenue_sharing}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-lg text-[#C13C3D] font-bold">
                  Management & Compliance
                </p>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Key Performance Indicators (KPIs)</h3>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {contract.kpis}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Service Level Agreements (SLAs)</h3>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {contract.slas}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Monitoring & Reporting</h3>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {contract.monitoring_and_reporting}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Dispute Resolution</h3>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {contract.dispute_resolution}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Termination & Exit Clauses</h3>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {contract.termination_and_exit_clauses}
                    </p>
                  </div>

                  {contract.miscellaneous && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Miscellaneous</h3>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {contract.miscellaneous}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p>
                  As we congratulate you on the award, kindly indicate your acceptance of the above terms and conditions
                  by signing the attached Memorandum of Acceptance below and return a duly signed copy of this letter
                  to <span className="font-semibold">OYNTCDA</span> within 7 days from the date of this letter. We look forward to a successful partnership and the timely delivery of the project.
                </p>

                <p className="my-4">Yours Faithfully,</p>
                <p className="font-bold text-gray-900">For: Executive Adviser</p>
                <p className="font-bold text-gray-900">Oyo State New Towns And Cities Development Authority (OYNTCDA)</p>
              </div>
            </section>

            {/* Signatures Section */}
            {showSignatures && (
              <section className="space-y-8 pt-4 border-gray-300 signature-section">
                {/* Admin Signatures Header */}
                <div className="grid grid-cols-2 gap-8">
                  {/* Admin Signature */}
                  <div>
                    {adminSignatory?.signature_url && (
                      <div className="mt-2 border-b border-gray-300">
                        <img
                          src={adminSignatory.signature_url}
                          alt="Admin Signature"
                          className="h-16 object-contain"
                        />
                      </div>
                    )}
                    <div className="grid items-baseline pb-1 my-2">
                      <p className="font-semibold text-gray-900">Name: {adminSignatory?.name || '______________________'}</p>
                      <p className="text-sm text-gray-600">Designation: {adminSignatory?.role || 'Admin'}</p>
                      <p className="text-sm text-gray-600">Date signed: {adminSignatory?.signed_at ? formatShortDate(adminSignatory.signed_at) : '_____________'}</p>
                    </div>
                  </div>

                  {/* Admin Witness Signature */}
                  <div>
                    {adminWitnessSignatory?.signature_url && (
                      <div className="mt-2 border-b border-gray-300">
                        <img
                          src={adminWitnessSignatory.signature_url}
                          alt="Admin Witness Signature"
                          className="h-16 object-contain"
                        />
                      </div>
                    )}
                    <div className="grid items-baseline pb-1 my-2">
                      <p className="font-semibold text-gray-900">Name: {adminWitnessSignatory?.name || '______________________'}</p>
                      <p className="text-sm text-gray-600">Designation: {adminWitnessSignatory?.role || '_____________'}</p>
                      <p className="text-sm text-gray-600">Date signed: {adminWitnessSignatory?.signed_at ? formatShortDate(adminWitnessSignatory.signed_at) : '_____________'}</p>
                    </div>
                  </div>
                </div>

                {/* Partner's Memorandum of Acceptance */}
                <div className="mt-8 space-y-6">
                  <h3 className="text-xl font-bold text-gray-900">MEMORANDUM OF ACCEPTANCE</h3>

                  <p>
                    I, <span className="font-bold underline">{contract.partner_contact_name || contract.partner_name}</span>, on behalf of <span className="font-bold underline">{contract.partner_name}</span> hereby accept the terms and
                    conditions of the engagement stated above.
                  </p>

                  {/* Partner Signature Area */}
                  <div className="mt-8">
                    <div className="border-b border-gray-400 mb-2 w-64">
                      {partnerSignatory?.signature_url ? (
                        <img
                          src={partnerSignatory.signature_url}
                          alt="Partner Signature"
                          className="h-16 object-contain"
                        />
                      ) : (
                        <div className="h-16"></div>
                      )}
                    </div>
                    <p className="font-bold text-gray-900">{contract.partner_contact_name || contract.partner_name}</p>
                    {partnerSignatory?.role && (
                      <p className="text-sm text-gray-600">Designation: {partnerSignatory.role}</p>
                    )}
                    <p className="text-sm text-gray-600">
                      Date signed: {partnerSignatory?.signed_at ? formatShortDate(partnerSignatory.signed_at) : '_____________'}
                    </p>
                  </div>

                  {/* IN THE PRESENCE OF Section */}
                  <div className="mt-4 pt-6">
                    <h4 className="font-semibold text-gray-900 mb-4">IN THE PRESENCE OF:</h4>

                    <div className="grid grid-cols-1 gap-2 max-w-sm">
                      {partner_contract_signatories[1]?.signature_url && (
                        <div className="mt-2 border-b border-gray-300">
                          <img
                            src={partner_contract_signatories[1].signature_url}
                            alt="Admin Signature"
                            className="h-16 object-contain"
                          />
                        </div>
                      )}
                      <div className="grid items-baseline pb-1 my-2">
                        <p className="font-semibold text-gray-900">Name: {partner_contract_signatories[1]?.name || '______________________'}</p>
                        <p className="text-sm text-gray-600">Designation: {partner_contract_signatories[1]?.role}</p>
                        <p className="text-sm text-gray-600">Date signed: {partner_contract_signatories[1]?.signed_at ? formatShortDate(partner_contract_signatories[1].signed_at) : '_____________'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        <style>{`
        .watermark-container {
          z-index: 0;
          position: fixed !important;
        }
        .watermark-logo-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        .watermark-logo {
          max-width: 60%;
          max-height: 60%;
          opacity: 0.08;
          filter: grayscale(100%);
          transform: rotate(-45deg) scale(1.2);
          object-fit: contain;
        }
        .relative {
          z-index: 1;
        }
        
        /* Print-specific watermark styles */
        @media print {
          .watermark-container {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: -1 !important;
            pointer-events: none !important;
          }
          
          .watermark-logo {
            max-width: 50% !important;
            max-height: 50% !important;
            opacity: 0.12 !important;
            transform: rotate(-45deg) scale(1.8) !important;
          }
          
          /* Ensure content appears above watermark */
          [data-contract-template] > div {
            position: relative !important;
            z-index: 1 !important;
            background: transparent !important;
          }
        }
      `}</style>
      </div>
    </>
  )
}