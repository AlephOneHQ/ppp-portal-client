import Database from "better-sqlite3"
import path from "path"

let db: Database.Database | null = null

export function getDatabase() {
  if (!db) {
    const dbPath = path.join(process.cwd(), "data", "ppp-portal.db")
    db = new Database(dbPath)

    // Enable foreign keys
    db.pragma("foreign_keys = ON")

    // Initialize database if needed
    initializeDatabase(db)
  }

  return db
}

function initializeDatabase(database: Database.Database) {
  // Create projects table
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      sector TEXT,
      budget TEXT,
      timeline TEXT,
      submission_fee REAL DEFAULT 0,
      created_by TEXT NOT NULL,
      assigned_to TEXT,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create EOI submissions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS eoi_submissions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      partner_id TEXT NOT NULL,
      partner_name TEXT NOT NULL,
      company_name TEXT NOT NULL,
      bio TEXT,
      interest_letter_url TEXT,
      experience TEXT,
      portfolio_url TEXT,
      project_plan TEXT,
      payment_status TEXT DEFAULT 'unpaid',
      submission_status TEXT DEFAULT 'draft',
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `)

  // Create key personnel table
  database.exec(`
    CREATE TABLE IF NOT EXISTS key_personnel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eoi_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      FOREIGN KEY (eoi_id) REFERENCES eoi_submissions(id) ON DELETE CASCADE
    )
  `)

  // Create consortium members table
  database.exec(`
    CREATE TABLE IF NOT EXISTS consortium_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eoi_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      role TEXT NOT NULL,
      country TEXT NOT NULL,
      registration_number TEXT NOT NULL,
      FOREIGN KEY (eoi_id) REFERENCES eoi_submissions(id) ON DELETE CASCADE
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS signatures (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  // Create index on created_at for efficient cleanup
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_signatures_created_at ON signatures(created_at)
  `)

  console.log("[v0] Database initialized successfully")
}

export function saveSignature(id: string, data: string) {
  const db = getDatabase()
  const stmt = db.prepare("INSERT OR REPLACE INTO signatures (id, data, created_at) VALUES (?, ?, ?)")
  stmt.run(id, data, Date.now())
}

export function getSignature(id: string) {
  const db = getDatabase()
  const stmt = db.prepare("SELECT data FROM signatures WHERE id = ?")
  const result = stmt.get(id) as { data: string } | undefined
  return result?.data
}

export function cleanupOldSignatures() {
  const db = getDatabase()
  // Delete signatures older than 1 hour
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  const stmt = db.prepare("DELETE FROM signatures WHERE created_at < ?")
  stmt.run(oneHourAgo)
}

export function deleteSignature(id: string) {
  const db = getDatabase()
  const stmt = db.prepare("DELETE FROM signatures WHERE id = ?")
  stmt.run(id)
}

// Close database connection
export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}
