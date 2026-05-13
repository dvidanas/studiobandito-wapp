import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "messages.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(DB_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      mode TEXT CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI',
      last_message_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id),
      role TEXT CHECK(role IN ('user','assistant','human')) NOT NULL,
      content TEXT NOT NULL,
      wa_message_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv
      ON messages(conversation_id, created_at);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_wa_id
      ON messages(wa_message_id) WHERE wa_message_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS processed_webhook_messages (
      wa_message_id TEXT PRIMARY KEY,
      processed_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id),
      phone TEXT NOT NULL,
      name TEXT,
      business TEXT,
      problem TEXT,
      status TEXT CHECK(status IN ('nuevo','seguimiento','cerrado','descartado'))
        NOT NULL DEFAULT 'nuevo',
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_leads_conv ON leads(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  `);

  // Migraciones incrementales (idempotentes con try/catch)
  try {
    db.exec("ALTER TABLE conversations ADD COLUMN has_lead INTEGER NOT NULL DEFAULT 0");
  } catch { /* ya existe */ }

  try {
    db.exec("ALTER TABLE leads ADD COLUMN summary TEXT");
  } catch { /* ya existe */ }
}

// ── Tipos ──────────────────────────────────────────────────

export interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  has_lead: number;
  last_message_at: number | null;
  created_at: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "human";
  content: string;
  wa_message_id: string | null;
  created_at: number;
}

export interface Lead {
  id: number;
  conversation_id: number;
  phone: string;
  name: string | null;
  business: string | null;
  problem: string | null;
  status: "nuevo" | "seguimiento" | "cerrado" | "descartado";
  notes: string | null;
  summary: string | null;
  created_at: number;
  updated_at: number;
}

export interface LeadWithConversation extends Lead {
  conv_phone: string;
  conv_name: string | null;
}

// ── Conversaciones ─────────────────────────────────────────

export function getOrCreateConversation(
  phone: string,
  name?: string | null
): Conversation {
  const db = getDb();
  db.prepare(
    `INSERT INTO conversations (phone, name) VALUES (?, ?)
     ON CONFLICT(phone) DO UPDATE SET
       name = COALESCE(excluded.name, conversations.name)`
  ).run(phone, name ?? null);
  return db
    .prepare<string, Conversation>("SELECT * FROM conversations WHERE phone = ?")
    .get(phone)!;
}

export function getConversationById(id: number): Conversation | null {
  return (
    getDb()
      .prepare<number, Conversation>("SELECT * FROM conversations WHERE id = ?")
      .get(id) ?? null
  );
}

export function listConversations(): Conversation[] {
  return getDb()
    .prepare<[], Conversation>(
      "SELECT * FROM conversations ORDER BY COALESCE(last_message_at, created_at) DESC"
    )
    .all();
}

export function setMode(id: number, mode: "AI" | "HUMAN"): void {
  getDb()
    .prepare("UPDATE conversations SET mode = ? WHERE id = ?")
    .run(mode, id);
}

export function setConversationHasLead(conversationId: number, value: 0 | 1): void {
  getDb()
    .prepare("UPDATE conversations SET has_lead = ? WHERE id = ?")
    .run(value, conversationId);
}

export function deleteConversation(id: number): void {
  const db = getDb();
  const del = db.transaction(() => {
    db.prepare("DELETE FROM leads WHERE conversation_id = ?").run(id);
    db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);
    db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
  });
  del();
}

// ── Mensajes ───────────────────────────────────────────────

export function insertMessage(
  conversationId: number,
  role: "user" | "assistant" | "human",
  content: string,
  waMessageId: string | null
): number {
  const db = getDb();
  const insert = db.transaction(() => {
    const res = db
      .prepare(
        `INSERT INTO messages (conversation_id, role, content, wa_message_id)
         VALUES (?, ?, ?, ?)`
      )
      .run(conversationId, role, content, waMessageId);
    db.prepare(
      "UPDATE conversations SET last_message_at = unixepoch() WHERE id = ?"
    ).run(conversationId);
    return res.lastInsertRowid as number;
  });
  return insert();
}

export function updateMessageWaId(
  messageId: number,
  waMessageId: string
): void {
  getDb()
    .prepare("UPDATE messages SET wa_message_id = ? WHERE id = ?")
    .run(waMessageId, messageId);
}

export function getMessages(conversationId: number): Message[] {
  return getDb()
    .prepare<number, Message>(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
    )
    .all(conversationId);
}

export function getRecentHistory(
  conversationId: number,
  limit: number
): Message[] {
  const rows = getDb()
    .prepare<[number, number], Message>(
      `SELECT * FROM messages WHERE conversation_id = ?
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(conversationId, limit);
  return rows.reverse();
}

// ── Deduplicación webhook ──────────────────────────────────

export function wasMessageProcessed(waMessageId: string): boolean {
  return (
    getDb()
      .prepare<string, { wa_message_id: string }>(
        "SELECT wa_message_id FROM processed_webhook_messages WHERE wa_message_id = ?"
      )
      .get(waMessageId) !== undefined
  );
}

export function markMessageProcessed(waMessageId: string): void {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO processed_webhook_messages (wa_message_id)
       VALUES (?)`
    )
    .run(waMessageId);
}

// ── Leads ──────────────────────────────────────────────────

export function createLead(
  conversationId: number,
  phone: string,
  name?: string | null,
  business?: string | null,
  problem?: string | null
): number {
  const res = getDb()
    .prepare(
      `INSERT INTO leads (conversation_id, phone, name, business, problem)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(conversationId, phone, name ?? null, business ?? null, problem ?? null);
  return res.lastInsertRowid as number;
}

export function updateLead(
  id: number,
  fields: Partial<{
    name: string;
    business: string;
    problem: string;
    status: Lead["status"];
    notes: string;
  }>
): void {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const sets = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v);
  getDb()
    .prepare(`UPDATE leads SET ${sets}, updated_at = unixepoch() WHERE id = ?`)
    .run(...values, id);
}

export function deleteLead(id: number): void {
  getDb().prepare("DELETE FROM leads WHERE id = ?").run(id);
}

export function getLeadById(id: number): Lead | null {
  return (
    getDb()
      .prepare<number, Lead>("SELECT * FROM leads WHERE id = ? LIMIT 1")
      .get(id) ?? null
  );
}

export function updateLeadSummary(id: number, summary: string): void {
  getDb()
    .prepare("UPDATE leads SET summary = ?, updated_at = unixepoch() WHERE id = ?")
    .run(summary, id);
}

export function getLeadByConversationId(conversationId: number): Lead | null {
  return (
    getDb()
      .prepare<number, Lead>("SELECT * FROM leads WHERE conversation_id = ? LIMIT 1")
      .get(conversationId) ?? null
  );
}

export function listLeads(): LeadWithConversation[] {
  return getDb()
    .prepare<[], LeadWithConversation>(
      `SELECT l.*, c.phone as conv_phone, c.name as conv_name
       FROM leads l
       JOIN conversations c ON l.conversation_id = c.id
       ORDER BY l.created_at DESC`
    )
    .all();
}

export function getLeadStats(): Record<string, number> {
  const rows = getDb()
    .prepare<[], { status: string; count: number }>(
      "SELECT status, COUNT(*) as count FROM leads GROUP BY status"
    )
    .all();
  return Object.fromEntries(rows.map((r) => [r.status, r.count]));
}
