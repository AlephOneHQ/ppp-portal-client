import jsPDF from 'jspdf'

interface PdfContractData {
  id: string
  title: string
  reference_number?: string
  project_title?: string
  partner_name?: string
  commences_on?: string
  ends_on?: string
  estimated_project_cost?: number
  scope_of_service?: string
  oyntcda_roles?: string
  partner_responsibilities?: string
  capital_structure?: string
  payment_mechanism?: string
  revenue_sharing?: string
  kpis?: string
  slas?: string
  monitoring_and_reporting?: string
  dispute_resolution?: string
  termination_and_exit_clauses?: string
  miscellaneous?: string
}

interface DigitalSignature {
  signer_name: string
  signer_type: string
  signed_at: string
}

interface Signature {
  name: string
  type: string
  date: string
}

export type { PdfContractData, DigitalSignature, Signature }

/**
 * Generate PDF using browser's print functionality
 * This is the most reliable method that works with all CSS
 */
export async function generateContractPDF(
  contractTitle: string,
  _contractRef?: string // Prefix with underscore to indicate intentionally unused
): Promise<void> {
  // Find the contract template element
  const contractElement = document.querySelector('[data-contract-template]') as HTMLElement

  if (!contractElement) {
    throw new Error('Contract template not found')
  }

  // Create a new window for printing
  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups.')
  }

  try {
    // Clone the contract element
    const clonedContent = contractElement.cloneNode(true) as HTMLElement

    // Build the print document with Tailwind CDN
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${contractTitle}</title>

          <!-- Tailwind CSS CDN for guaranteed class availability -->
          <script src="https://cdn.tailwindcss.com"></script>

          <style>
            /* Reset and base styles */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #000;
              background: white;
              margin: 0;
              padding: 0;
            }

            /* Page setup for printing */
            @page {
              size: A4;
              margin: 15mm 10mm;
            }

            @media print {
              body {
                margin: 0;
                padding: 0;
              }

              /* Reduce padding in print view */
              [data-contract-template] > div {
                padding: 1rem !important;
              }

              /* Page breaks */
              .page-break {
                page-break-after: always;
                break-after: page;
              }

              /* Allow sections to break naturally, but avoid breaking within subsections */
              .avoid-break {
                page-break-inside: avoid;
                break-inside: avoid;
              }

              /* Allow main section to break */
              section {
                page-break-inside: auto;
                break-inside: auto;
              }

              /* Prevent breaks within specific content blocks */
              section > div {
                page-break-inside: avoid;
                break-inside: avoid;
              }

              /* Hide elements that shouldn't print */
              .no-print {
                display: none !important;
              }

              /* Ensure colors print */
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }

              /* Footer on each page */
              @page {
                @bottom-left {
                  content: "Digitally Signed Contract - Legally Binding";
                  font-size: 8pt;
                  color: #666;
                }
                @bottom-center {
                  content: "${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}";
                  font-size: 8pt;
                  color: #666;
                }
                @bottom-right {
                  content: "Page " counter(page);
                  font-size: 8pt;
                  color: #666;
                }
              }
            }

            /* Additional print-specific styles */
            [data-contract-template] {
              max-width: 100%;
              background: white !important;
            }

            /* Signature section */
            .signature-section {
              page-break-inside: avoid;
            }

            /* Watermark styles */
            .watermark-container {
              z-index: 0;
            }
            .watermark-text {
              font-size: clamp(80px, 15vw, 180px);
              font-weight: bold;
              color: #2563eb;
              opacity: 0.03;
              white-space: nowrap;
              width: 200%;
              text-align: center;
              transform: rotate(-45deg);
            }
            .content-container {
              z-index: 1;
            }
          </style>
        </head>
        <body>
          ${clonedContent.outerHTML}

          <script>
            // Auto-print when loaded
            window.onload = function() {
              // Wait for Tailwind CDN to load and process classes
              setTimeout(function() {
                window.print();
                // Close window after printing (user can cancel)
                setTimeout(function() {
                  window.close();
                }, 100);
              }, 1500);
            };
          </script>
        </body>
      </html>
    `

    // Write content to print window
    printWindow.document.write(printContent)
    printWindow.document.close()

  } catch (error) {
    printWindow.close()
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
  }
}

/**
 * Alternative: Direct print of current page
 * Simpler but prints the entire page
 */
export function printCurrentPage(): void {
  window.print()
}

/**
 * Generate PDF using jsPDF with text-only approach
 * Fallback method that doesn't rely on html2canvas
 */
export async function generateSimplePDF(
  contractTitle: string,
  contractData: PdfContractData,
  signatures: DigitalSignature[]
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let yPosition = margin

  // Helper to add new page if needed
  const checkPageBreak = (requiredSpace: number = 10) => {
    if (yPosition + requiredSpace > pageHeight - margin - 15) {
      pdf.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // Helper to add footer
  const addFooter = (pageNum: number) => {
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('Digitally Signed Contract - Legally Binding', margin, pageHeight - 10)
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const dateWidth = pdf.getTextWidth(date)
    pdf.text(date, (pageWidth - dateWidth) / 2, pageHeight - 10)
    pdf.text(`Page ${pageNum}`, pageWidth - margin - 20, pageHeight - 10)
  }

  // Title
  pdf.setFontSize(20)
  pdf.setTextColor(0, 0, 0)
  pdf.text(contractTitle, pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 15

  // Contract details
  pdf.setFontSize(12)
  if (contractData.reference_number) {
    pdf.text(`Reference: ${contractData.reference_number}`, margin, yPosition)
    yPosition += 8
  }

  if (contractData.project_title) {
    pdf.text(`Project: ${contractData.project_title}`, margin, yPosition)
    yPosition += 8
  }

  if (contractData.partner_name) {
    pdf.text(`Partner: ${contractData.partner_name}`, margin, yPosition)
    yPosition += 8
  }

  yPosition += 10

  // Contract sections
  const sections = [
    { title: 'Scope of Service', content: contractData.scope_of_service },
    { title: 'OYNTCDA Roles', content: contractData.oyntcda_roles },
    { title: 'Partner Responsibilities', content: contractData.partner_responsibilities },
    { title: 'Capital Structure', content: contractData.capital_structure },
    { title: 'Payment Mechanism', content: contractData.payment_mechanism },
    { title: 'Revenue Sharing', content: contractData.revenue_sharing },
    { title: 'KPIs', content: contractData.kpis },
    { title: 'SLAs', content: contractData.slas },
    { title: 'Monitoring and Reporting', content: contractData.monitoring_and_reporting },
    { title: 'Dispute Resolution', content: contractData.dispute_resolution },
    { title: 'Termination and Exit Clauses', content: contractData.termination_and_exit_clauses },
    { title: 'Miscellaneous', content: contractData.miscellaneous },
  ]

  sections.forEach(section => {
    if (section.content) {
      checkPageBreak(15)

      // Section title
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text(section.title, margin, yPosition)
      yPosition += 8

      // Section content
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      const lines = pdf.splitTextToSize(section.content, contentWidth)
      lines.forEach((line: string) => {
        checkPageBreak(5)
        pdf.text(line, margin, yPosition)
        yPosition += 5
      })

      yPosition += 5
    }
  })

  // Signatures section
  if (signatures.length > 0) {
    checkPageBreak(30)

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Digital Signatures', margin, yPosition)
    yPosition += 10

    signatures.forEach(signature => {
      checkPageBreak(15)

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Name: ${signature.signer_name}`, margin, yPosition)
      yPosition += 5
      pdf.text(`Type: ${signature.signer_type}`, margin, yPosition)
      yPosition += 5
      pdf.text(`Signed: ${signature.signed_at}`, margin, yPosition)
      yPosition += 10
    })
  }

  // Add footer to all pages
  const totalPages = (pdf as unknown as { internal: { pages: unknown[] } }).internal.pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    addFooter(i)
  }

  // Save
  const filename = contractData.reference_number
    ? `${contractData.reference_number.replace(/[^a-z0-9]/gi, '_')}.pdf`
    : `${contractTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`

  pdf.save(filename)
}
