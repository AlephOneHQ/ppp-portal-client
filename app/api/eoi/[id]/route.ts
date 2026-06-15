import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/db"

interface EOIUpdateBody {
  payment_status?: string;
  submission_status?: string;
  admin_notes?: string;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = getDatabase()

    const submission = db.prepare("SELECT * FROM eoi_submissions WHERE id = ?").get(id)

    if (!submission) {
      return NextResponse.json({ error: "EOI submission not found" }, { status: 404 })
    }

    // Get key personnel
    const keyPersonnel = db.prepare("SELECT * FROM key_personnel WHERE eoi_id = ?").all(id)

    // Get consortium members
    const consortiumMembers = db.prepare("SELECT * FROM consortium_members WHERE eoi_id = ?").all(id)

    return NextResponse.json({
      submission,
      keyPersonnel,
      consortiumMembers,
    })
  } catch (error) {
    console.error("[v0] Error fetching EOI submission:", error)
    return NextResponse.json({ error: "Failed to fetch EOI submission" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body: EOIUpdateBody = await request.json() // Typing the body as EOIUpdateBody
    const db = getDatabase()

    const updates: string[] = []
    const values: (string | undefined)[] = []  // Specifying the type for values

    if (body.payment_status !== undefined) {
      updates.push("payment_status = ?")
      values.push(body.payment_status)
    }

    if (body.submission_status !== undefined) {
      updates.push("submission_status = ?")
      values.push(body.submission_status)
    }

    if (body.admin_notes !== undefined) {
      updates.push("admin_notes = ?")
      values.push(body.admin_notes)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    updates.push("updated_at = CURRENT_TIMESTAMP")
    values.push(id)

    const stmt = db.prepare(`
      UPDATE eoi_submissions 
      SET ${updates.join(", ")}
      WHERE id = ?
    `)

    stmt.run(...values)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating EOI submission:", error)
    return NextResponse.json({ error: "Failed to update EOI submission" }, { status: 500 })
  }
}
