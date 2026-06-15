import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/db"

export async function GET() {
  try {
    const db = getDatabase()
    const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all()

    return NextResponse.json({ projects })
  } catch (error) {
    console.error("[v0] Error fetching projects:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const db = getDatabase()

    const stmt = db.prepare(`
      INSERT INTO projects (id, title, description, sector, budget, timeline, submission_fee, created_by, assigned_to, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      body.id || `proj-${Date.now()}`,
      body.title,
      body.description,
      body.sector,
      body.budget,
      body.timeline,
      body.submission_fee || 0,
      body.created_by,
      body.assigned_to || "",
      body.status || "Draft",
    )

    return NextResponse.json({ success: true, id: result.lastInsertRowid })
  } catch (error) {
    console.error("[v0] Error creating project:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}
