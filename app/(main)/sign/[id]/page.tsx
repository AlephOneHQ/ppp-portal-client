// app/sign/[id]/page.tsx
import SignaturePage from "./signature-page"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SignaturePage />
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return {
    title: `Sign Document - ${id}`,
  }
}