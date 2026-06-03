import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { clientConfig } from "./client.config";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "messages.db");
const DB_DIR = path.dirname(DB_PATH);

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

  // Tablas de turnos
  db.exec(`
    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS availability_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL REFERENCES resources(id),
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      time_start TEXT NOT NULL,
      time_end TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL REFERENCES resources(id),
      conversation_id INTEGER REFERENCES conversations(id),
      service TEXT,
      date TEXT NOT NULL,
      time_start TEXT NOT NULL,
      time_end TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      status TEXT CHECK(status IN ('pending','confirmed','cancelled')) NOT NULL DEFAULT 'pending',
      source TEXT CHECK(source IN ('manual','bot')) NOT NULL DEFAULT 'manual',
      notes TEXT,
      contact_name TEXT,
      contact_phone TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appointments_resource ON appointments(resource_id, date);

    CREATE TABLE IF NOT EXISTS blocked_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL REFERENCES resources(id),
      date TEXT NOT NULL,
      time_start TEXT NOT NULL,
      time_end TEXT NOT NULL,
      reason TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_blocked_date ON blocked_slots(resource_id, date);
  `);

  // Seed recursos desde client.config si la tabla está vacía
  {
    const count = db.prepare<[], { count: number }>("SELECT COUNT(*) as count FROM resources").get()!;
    if (count.count === 0) {
      const appt = clientConfig.appointments as { enabled?: boolean; resource?: string } | undefined;
      const resourceName = appt?.resource ?? clientConfig.businessName;
      const insertRes = db.prepare("INSERT INTO resources (name) VALUES (?)");
      const insertSlot = db.prepare(
        "INSERT INTO availability_slots (resource_id, day_of_week, time_start, time_end) VALUES (?, ?, ?, ?)"
      );
      const r = insertRes.run(resourceName);
      // Disponibilidad Lun–Sáb según horarios de client.config
      const days: Array<[number, keyof typeof clientConfig.hours]> = [
        [1, "monday"], [2, "tuesday"], [3, "wednesday"],
        [4, "thursday"], [5, "friday"], [6, "saturday"],
      ];
      for (const [dayNum, dayKey] of days) {
        const h = clientConfig.hours[dayKey];
        if (h) insertSlot.run(r.lastInsertRowid, dayNum, h.open, h.close);
      }
    }
  }

  // Tablas de configuración
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // Seed settings desde client.config si la tabla está vacía
  const settingsCount = db.prepare<[], { count: number }>("SELECT COUNT(*) as count FROM settings").get()!;
  if (settingsCount.count === 0) {
    const ins = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
    ins.run("business_name", clientConfig.businessName);
    ins.run("business_description", clientConfig.businessDescription.trim());
  }

  // Seed servicios desde client.config si la tabla está vacía
  const servicesCount = db.prepare<[], { count: number }>("SELECT COUNT(*) as count FROM services").get()!;
  if (servicesCount.count === 0) {
    const ins = db.prepare("INSERT INTO services (name, description, price, duration_minutes, active) VALUES (?, ?, ?, ?, 1)");
    for (const svc of clientConfig.services) {
      ins.run(
        svc.name,
        svc.description ?? null,
        String(svc.price),
        svc.duration ?? clientConfig.appointmentDuration ?? 40,
      );
    }
  }

  // Migraciones incrementales (idempotentes con try/catch)
  try {
    db.exec("ALTER TABLE conversations ADD COLUMN has_lead INTEGER NOT NULL DEFAULT 0");
  } catch { /* ya existe */ }

  try {
    db.exec("ALTER TABLE leads ADD COLUMN summary TEXT");
  } catch { /* ya existe */ }

  try {
    db.exec("ALTER TABLE resources ADD COLUMN phone TEXT");
  } catch { /* ya existe */ }

  db.exec(`
    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      discount TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

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

// ── Appointments ────────────────────────────────────────────

interface AppointmentsConfig {
  enabled: boolean;
  defaultDuration: number;
  resources: string[];
  workingHours: { start: string; end: string };
  workingDays: number[];
}

export interface Resource {
  id: number;
  name: string;
  phone: string | null;
  active: number;
}

export interface AvailabilitySlot {
  id: number;
  resource_id: number;
  day_of_week: number;
  time_start: string;
  time_end: string;
}

export interface Appointment {
  id: number;
  resource_id: number;
  conversation_id: number | null;
  service: string | null;
  date: string;
  time_start: string;
  time_end: string;
  duration_minutes: number;
  status: "pending" | "confirmed" | "cancelled";
  source: "manual" | "bot";
  notes: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: number;
}

export interface AppointmentWithResource extends Appointment {
  resource_name: string;
}

export interface BlockedSlot {
  id: number;
  resource_id: number;
  date: string;
  time_start: string;
  time_end: string;
  reason: string | null;
}

export interface AvailableSlot {
  resource_id: number;
  resource_name: string;
  time_start: string;
  time_end: string;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

function generateSlots(
  windowStart: string,
  windowEnd: string,
  durationMin: number
): Array<{ time_start: string; time_end: string }> {
  const start = timeToMinutes(windowStart);
  const end = timeToMinutes(windowEnd);
  const slots = [];
  for (let t = start; t + durationMin <= end; t += durationMin) {
    slots.push({ time_start: minutesToTime(t), time_end: minutesToTime(t + durationMin) });
  }
  return slots;
}

function overlapsAny(
  slotStart: string,
  slotEnd: string,
  occupied: Array<{ time_start: string; time_end: string }>
): boolean {
  const s = timeToMinutes(slotStart);
  const e = timeToMinutes(slotEnd);
  return occupied.some((o) => s < timeToMinutes(o.time_end) && e > timeToMinutes(o.time_start));
}

export function listResources(): Resource[] {
  return getDb().prepare<[], Resource>("SELECT * FROM resources WHERE active = 1 ORDER BY id").all();
}

export function getAvailableSlots(date: string, durationMinutes: number, excludeAppointmentId?: number): AvailableSlot[] {
  const db = getDb();
  // JS Date with noon UTC avoids DST shifts when parsing YYYY-MM-DD
  const dayOfWeek = new Date(date + "T12:00:00Z").getUTCDay();
  const resources = db.prepare<[], Resource>("SELECT * FROM resources WHERE active = 1").all();
  const result: AvailableSlot[] = [];

  for (const resource of resources) {
    const windows = db
      .prepare<[number, number], AvailabilitySlot>(
        "SELECT * FROM availability_slots WHERE resource_id = ? AND day_of_week = ?"
      )
      .all(resource.id, dayOfWeek);

    const booked = excludeAppointmentId
      ? db
          .prepare<[number, string, number], Pick<Appointment, "time_start" | "time_end">>(
            "SELECT time_start, time_end FROM appointments WHERE resource_id = ? AND date = ? AND status != 'cancelled' AND id != ?"
          )
          .all(resource.id, date, excludeAppointmentId)
      : db
          .prepare<[number, string], Pick<Appointment, "time_start" | "time_end">>(
            "SELECT time_start, time_end FROM appointments WHERE resource_id = ? AND date = ? AND status != 'cancelled'"
          )
          .all(resource.id, date);

    const blocked = db
      .prepare<[number, string], Pick<BlockedSlot, "time_start" | "time_end">>(
        "SELECT time_start, time_end FROM blocked_slots WHERE resource_id = ? AND date = ?"
      )
      .all(resource.id, date);

    const occupied = [...booked, ...blocked];

    for (const window of windows) {
      for (const slot of generateSlots(window.time_start, window.time_end, durationMinutes)) {
        if (!overlapsAny(slot.time_start, slot.time_end, occupied)) {
          result.push({ resource_id: resource.id, resource_name: resource.name, ...slot });
        }
      }
    }
  }

  return result;
}

export function getNextAvailableSlots(days: number, durationMinutes = 30): Array<AvailableSlot & { date: string }> {
  const result: Array<AvailableSlot & { date: string }> = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const slots = getAvailableSlots(dateStr, durationMinutes);
    result.push(...slots.slice(0, 4).map((s) => ({ ...s, date: dateStr })));
  }
  return result;
}

export function listAppointments(from: string, to: string): AppointmentWithResource[] {
  return getDb()
    .prepare<[string, string], AppointmentWithResource>(
      `SELECT a.*, r.name as resource_name
       FROM appointments a
       JOIN resources r ON a.resource_id = r.id
       WHERE a.date >= ? AND a.date <= ?
       ORDER BY a.date ASC, a.time_start ASC`
    )
    .all(from, to);
}

export function createAppointment(data: {
  resource_id: number;
  conversation_id?: number | null;
  service?: string | null;
  date: string;
  time_start: string;
  duration_minutes: number;
  source?: "manual" | "bot";
  notes?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
}): number {
  const endMins = timeToMinutes(data.time_start) + data.duration_minutes;
  const time_end = minutesToTime(endMins);
  const res = getDb()
    .prepare(
      `INSERT INTO appointments
        (resource_id, conversation_id, service, date, time_start, time_end, duration_minutes, source, notes, contact_name, contact_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.resource_id,
      data.conversation_id ?? null,
      data.service ?? null,
      data.date,
      data.time_start,
      time_end,
      data.duration_minutes,
      data.source ?? "manual",
      data.notes ?? null,
      data.contact_name ?? null,
      data.contact_phone ?? null
    );
  return res.lastInsertRowid as number;
}

export function updateAppointmentStatus(
  id: number,
  status: Appointment["status"]
): void {
  getDb()
    .prepare("UPDATE appointments SET status = ? WHERE id = ?")
    .run(status, id);
}

export function updateAppointment(
  id: number,
  data: {
    resource_id: number;
    service?: string | null;
    date: string;
    time_start: string;
    duration_minutes: number;
    notes?: string | null;
    contact_name?: string | null;
    contact_phone?: string | null;
  }
): void {
  const endMins = timeToMinutes(data.time_start) + data.duration_minutes;
  const time_end = minutesToTime(endMins);
  getDb()
    .prepare(
      `UPDATE appointments
       SET resource_id = ?,
           service = ?,
           date = ?,
           time_start = ?,
           time_end = ?,
           duration_minutes = ?,
           notes = ?,
           contact_name = ?,
           contact_phone = ?
       WHERE id = ?`
    )
    .run(
      data.resource_id,
      data.service ?? null,
      data.date,
      data.time_start,
      time_end,
      data.duration_minutes,
      data.notes ?? null,
      data.contact_name ?? null,
      data.contact_phone ?? null,
      id
    );
}

export function deleteAppointment(id: number): void {
  getDb().prepare("DELETE FROM appointments WHERE id = ?").run(id);
}

export function hasAppointmentForSlot(conversationId: number, date: string, timeStart: string): boolean {
  return (
    getDb()
      .prepare<[number, string, string], { id: number }>(
        "SELECT id FROM appointments WHERE conversation_id = ? AND date = ? AND time_start = ? AND status != 'cancelled'"
      )
      .get(conversationId, date, timeStart) !== undefined
  );
}

export function getAppointmentStats(): { pending: number; confirmed: number; cancelled: number } {
  const today = new Date().toISOString().slice(0, 10);
  const rows = getDb()
    .prepare<[string], { status: string; count: number }>(
      "SELECT status, COUNT(*) as count FROM appointments WHERE date >= ? GROUP BY status"
    )
    .all(today);
  const map = Object.fromEntries(rows.map((r) => [r.status, r.count]));
  return {
    pending: map.pending ?? 0,
    confirmed: map.confirmed ?? 0,
    cancelled: map.cancelled ?? 0,
  };
}

// ── Settings ────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  return getDb().prepare<[string], { value: string }>("SELECT value FROM settings WHERE key = ?").get(key)?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb().prepare<[], { key: string; value: string }>("SELECT key, value FROM settings").all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ── Services ────────────────────────────────────────────────

export interface Service {
  id: number;
  name: string;
  description: string | null;
  price: string | null;
  duration_minutes: number;
  active: number;
  created_at: number;
}

export function listServices(includeInactive = false): Service[] {
  const query = includeInactive
    ? "SELECT * FROM services ORDER BY name ASC"
    : "SELECT * FROM services WHERE active = 1 ORDER BY name ASC";
  return getDb().prepare<[], Service>(query).all();
}

export function createService(data: Omit<Service, "id" | "created_at">): number {
  const res = getDb()
    .prepare("INSERT INTO services (name, description, price, duration_minutes, active) VALUES (?, ?, ?, ?, ?)")
    .run(data.name, data.description ?? null, data.price ?? null, data.duration_minutes, data.active);
  return res.lastInsertRowid as number;
}

export function updateService(id: number, data: Partial<Omit<Service, "id" | "created_at">>): void {
  const fields = Object.entries(data).map(([k]) => `${k} = ?`).join(", ");
  const values = Object.values(data);
  getDb().prepare(`UPDATE services SET ${fields} WHERE id = ?`).run(...values, id);
}

export function deleteService(id: number): void {
  getDb().prepare("DELETE FROM services WHERE id = ?").run(id);
}

// ── Promotions ──────────────────────────────────────────────

export interface Promotion {
  id: number;
  title: string;
  description: string | null;
  discount: string | null;
  active: number;
  created_at: number;
}

export function listPromotions(includeInactive = false): Promotion[] {
  const query = includeInactive
    ? "SELECT * FROM promotions ORDER BY created_at DESC"
    : "SELECT * FROM promotions WHERE active = 1 ORDER BY created_at DESC";
  return getDb().prepare<[], Promotion>(query).all();
}

export function createPromotion(data: { title: string; description?: string | null; discount?: string | null }): number {
  const res = getDb()
    .prepare("INSERT INTO promotions (title, description, discount) VALUES (?, ?, ?)")
    .run(data.title, data.description ?? null, data.discount ?? null);
  return res.lastInsertRowid as number;
}

export function updatePromotion(id: number, data: Partial<Pick<Promotion, "title" | "description" | "discount" | "active">>): void {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (!entries.length) return;
  const fields = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v);
  getDb().prepare(`UPDATE promotions SET ${fields} WHERE id = ?`).run(...values, id);
}

export function deletePromotion(id: number): void {
  getDb().prepare("DELETE FROM promotions WHERE id = ?").run(id);
}

// ── Resources CRUD ──────────────────────────────────────────

export function listAllResources(): Resource[] {
  return getDb().prepare<[], Resource>("SELECT * FROM resources ORDER BY id").all();
}

export function createResource(name: string, phone?: string | null): number {
  const res = getDb().prepare("INSERT INTO resources (name, phone) VALUES (?, ?)").run(name, phone ?? null);
  return res.lastInsertRowid as number;
}

export function updateResource(id: number, data: { name?: string; phone?: string | null; active?: number }): void {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (!entries.length) return;
  const fields = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v);
  getDb().prepare(`UPDATE resources SET ${fields} WHERE id = ?`).run(...values, id);
}

export function deleteResource(id: number): { ok: boolean; error?: string } {
  const db = getDb();
  const activeAppts = (db
    .prepare<[number], { count: number }>(
      "SELECT COUNT(*) as count FROM appointments WHERE resource_id = ? AND status != 'cancelled'"
    )
    .get(id))!.count;
  if (activeAppts > 0) {
    return {
      ok: false,
      error: `Este recurso tiene ${activeAppts} turno(s) activo(s). Desactivalo en lugar de eliminarlo.`,
    };
  }
  db.prepare("DELETE FROM availability_slots WHERE resource_id = ?").run(id);
  db.prepare("DELETE FROM blocked_slots WHERE resource_id = ?").run(id);
  db.prepare("DELETE FROM appointments WHERE resource_id = ?").run(id);
  db.prepare("DELETE FROM resources WHERE id = ?").run(id);
  return { ok: true };
}

// ── Availability slots CRUD ─────────────────────────────────

export interface AvailabilitySlotRow {
  id: number;
  resource_id: number;
  day_of_week: number;
  time_start: string;
  time_end: string;
}

export function getAvailabilityForResource(resourceId: number): AvailabilitySlotRow[] {
  return getDb()
    .prepare<[number], AvailabilitySlotRow>(
      "SELECT * FROM availability_slots WHERE resource_id = ? ORDER BY day_of_week, time_start"
    )
    .all(resourceId);
}

export function setAvailabilityForResource(
  resourceId: number,
  slots: Array<{ day_of_week: number; time_start: string; time_end: string }>
): void {
  const db = getDb();
  db.prepare("DELETE FROM availability_slots WHERE resource_id = ?").run(resourceId);
  const ins = db.prepare("INSERT INTO availability_slots (resource_id, day_of_week, time_start, time_end) VALUES (?, ?, ?, ?)");
  for (const s of slots) ins.run(resourceId, s.day_of_week, s.time_start, s.time_end);
}

// ── Closed dates (special closed days) ──────────────────────

export function listClosedDates(): string[] {
  const raw = getSetting("closed_dates");
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

export function addClosedDate(date: string): void {
  const db = getDb();
  const dates = listClosedDates();
  if (!dates.includes(date)) {
    setSetting("closed_dates", JSON.stringify([...dates, date].sort()));
  }
  const resources = db.prepare<[], { id: number }>("SELECT id FROM resources WHERE active = 1").all();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO blocked_slots (resource_id, date, time_start, time_end, reason) VALUES (?, ?, '00:00', '23:59', 'closed')"
  );
  for (const r of resources) insert.run(r.id, date);
}

export function removeClosedDate(date: string): void {
  const dates = listClosedDates().filter((d) => d !== date);
  setSetting("closed_dates", JSON.stringify(dates));
  getDb()
    .prepare("DELETE FROM blocked_slots WHERE date = ? AND time_start = '00:00' AND time_end = '23:59' AND reason = 'closed'")
    .run(date);
}

// ── Métricas ─────────────────────────────────────────────────

export interface MetricsResult {
  contacts: { total: number; thisWeek: number; thisMonth: number };
  messages: { total: number; ai: number; byUser: number; humanHandled: number; humanInterventions: number };
  appointments: { total: number; pending: number; confirmed: number; cancelled: number; thisMonth: number; fromBot: number; fromManual: number };
  conversion: { rate: number; contactsWithAppts: number };
  topServices: Array<{ service: string; count: number }>;
  appointmentsByDay: Array<{ date: string; count: number }>;
  messagesByDay: Array<{ day: string; user: number; ai: number }>;
}

export function getMetrics(): MetricsResult {
  const db = getDb();

  const totalContacts = db.prepare<[], { c: number }>("SELECT COUNT(*) as c FROM conversations").get()!.c;
  const weekContacts = db.prepare<[], { c: number }>("SELECT COUNT(*) as c FROM conversations WHERE created_at >= unixepoch('now', '-7 days')").get()!.c;
  const monthContacts = db.prepare<[], { c: number }>("SELECT COUNT(*) as c FROM conversations WHERE created_at >= unixepoch('now', '-30 days')").get()!.c;

  const msgRows = db.prepare<[], { role: string; count: number }>("SELECT role, COUNT(*) as count FROM messages GROUP BY role").all();
  const msgMap: Record<string, number> = Object.fromEntries(msgRows.map(r => [r.role, r.count]));
  const humanInterventions = db.prepare<[], { c: number }>("SELECT COUNT(*) as c FROM conversations WHERE mode = 'HUMAN'").get()!.c;

  const totalAppts = db.prepare<[], { c: number }>("SELECT COUNT(*) as c FROM appointments").get()!.c;
  const apptByStatus = db.prepare<[], { status: string; count: number }>("SELECT status, COUNT(*) as count FROM appointments GROUP BY status").all();
  const apptStatus: Record<string, number> = Object.fromEntries(apptByStatus.map(r => [r.status, r.count]));
  const monthAppts = db.prepare<[], { c: number }>("SELECT COUNT(*) as c FROM appointments WHERE date >= date('now', 'start of month')").get()!.c;
  const apptBySource = db.prepare<[], { source: string; count: number }>("SELECT source, COUNT(*) as count FROM appointments GROUP BY source").all();
  const sourceMap: Record<string, number> = Object.fromEntries(apptBySource.map(r => [r.source, r.count]));

  const contactsWithAppts = db.prepare<[], { c: number }>("SELECT COUNT(DISTINCT conversation_id) as c FROM appointments WHERE conversation_id IS NOT NULL").get()!.c;

  const topServices = db.prepare<[], { service: string; count: number }>(
    "SELECT service, COUNT(*) as count FROM appointments WHERE service IS NOT NULL AND service != '' GROUP BY service ORDER BY count DESC LIMIT 6"
  ).all();

  const appointmentsByDay = db.prepare<[], { date: string; count: number }>(
    "SELECT date, COUNT(*) as count FROM appointments WHERE date >= date('now', '-29 days') GROUP BY date ORDER BY date"
  ).all();

  const msgsByDayRaw = db.prepare<[], { day: string; role: string; count: number }>(
    "SELECT date(created_at, 'unixepoch') as day, role, COUNT(*) as count FROM messages WHERE created_at >= unixepoch('now', '-13 days') GROUP BY day, role ORDER BY day"
  ).all();
  const msgsByDayMap: Record<string, { user: number; ai: number }> = {};
  for (const r of msgsByDayRaw) {
    if (!msgsByDayMap[r.day]) msgsByDayMap[r.day] = { user: 0, ai: 0 };
    if (r.role === "user") msgsByDayMap[r.day].user = r.count;
    if (r.role === "assistant") msgsByDayMap[r.day].ai = r.count;
  }
  const messagesByDay = Object.entries(msgsByDayMap).map(([day, v]) => ({ day, ...v }));

  return {
    contacts: { total: totalContacts, thisWeek: weekContacts, thisMonth: monthContacts },
    messages: {
      total: (msgMap.user ?? 0) + (msgMap.assistant ?? 0) + (msgMap.human ?? 0),
      ai: msgMap.assistant ?? 0,
      byUser: msgMap.user ?? 0,
      humanHandled: msgMap.human ?? 0,
      humanInterventions,
    },
    appointments: {
      total: totalAppts,
      pending: apptStatus.pending ?? 0,
      confirmed: apptStatus.confirmed ?? 0,
      cancelled: apptStatus.cancelled ?? 0,
      thisMonth: monthAppts,
      fromBot: sourceMap.bot ?? 0,
      fromManual: sourceMap.manual ?? 0,
    },
    conversion: {
      rate: totalContacts > 0 ? Math.round((contactsWithAppts / totalContacts) * 1000) / 10 : 0,
      contactsWithAppts,
    },
    topServices,
    appointmentsByDay,
    messagesByDay,
  };
}
