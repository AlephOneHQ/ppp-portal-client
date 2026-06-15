import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get("partnerId")

    const db = getDatabase()

    let query = "SELECT * FROM eoi_submissions"
    let params: (string | number)[] = []

    if (partnerId) {
      query += " WHERE partner_id = ?"
      params = [partnerId]
    }

    query += " ORDER BY created_at DESC"

    const submissions = db.prepare(query).all(...params)

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error("[v0] Error fetching EOI submissions:", error)
    return NextResponse.json({ error: "Failed to fetch EOI submissions" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const db = getDatabase()

    const eoiId = `EOI-2025-${String(Date.now()).slice(-4)}`

    // Insert EOI submission
    const stmt = db.prepare(`
      INSERT INTO eoi_submissions (
        id, project_id, partner_id, partner_name, company_name, bio, 
        interest_letter_url, experience, portfolio_url, project_plan,
        payment_status, submission_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      eoiId,
      body.project_id,
      body.partner_id,
      body.partner_name,
      body.company_name,
      body.bio || null,
      body.interest_letter_url || null,
      body.experience || null,
      body.portfolio_url || null,
      body.project_plan || null,
      body.payment_status || "unpaid",
      body.submission_status || "draft",
    )

    // Insert key personnel if provided
    if (body.key_personnel && body.key_personnel.length > 0) {
      const personnelStmt = db.prepare(`
        INSERT INTO key_personnel (eoi_id, name, role) VALUES (?, ?, ?)
      `)

      for (const person of body.key_personnel) {
        if (person.name && person.role) {
          personnelStmt.run(eoiId, person.name, person.role)
        }
      }
    }

    // Insert consortium members if provided
    if (body.consortium_members && body.consortium_members.length > 0) {
      const consortiumStmt = db.prepare(`
        INSERT INTO consortium_members (eoi_id, member_name, role, country, registration_number)
        VALUES (?, ?, ?, ?, ?)
      `)

      for (const member of body.consortium_members) {
        if (member.member_name && member.role) {
          consortiumStmt.run(
            eoiId,
            member.member_name,
            member.role,
            member.country || "",
            member.registration_number || "",
          )
        }
      }
    }

    return NextResponse.json({ success: true, eoiId })
  } catch (error) {
    console.error("[v0] Error creating EOI submission:", error)
    return NextResponse.json({ error: "Failed to create EOI submission" }, { status: 500 })
  }
}
