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

  // ────────────────────────────────────────────────────────────
  // MOTOR DE RESERVAS — schema genérico multi-profesional
  // ────────────────────────────────────────────────────────────
  // Reemplaza el modelo de Bandito (resources / availability_slots /
  // appointments / blocked_slots / services / clients), pensado para un solo
  // profesional. Este soporta varias sucursales, varios profesionales, y qué
  // servicio hace cada uno.
  db.exec(`
    -- Negocio: single-tenant, siempre id = 1.
    CREATE TABLE IF NOT EXISTS negocio (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nombre TEXT NOT NULL DEFAULT 'Corte Inglés',
      rubro TEXT NOT NULL DEFAULT 'barberia',
      logo_url TEXT,
      color_primario TEXT DEFAULT '#DC2626',
      color_fondo_landing TEXT DEFAULT '#0A0A0A',
      tema_panel TEXT DEFAULT 'claro',
      whatsapp TEXT,
      direccion TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sucursales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      direccion TEXT,
      activa INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS profesionales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sucursal_id INTEGER REFERENCES sucursales(id),
      nombre TEXT NOT NULL,
      foto_url TEXT,
      telefono TEXT,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS servicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      duracion_min INTEGER NOT NULL,
      precio REAL NOT NULL,
      activo INTEGER DEFAULT 1
    );

    -- Qué servicios hace cada profesional. Es lo que filtra el paso
    -- "servicio -> profesional" del flujo de reserva.
    CREATE TABLE IF NOT EXISTS profesional_servicios (
      profesional_id INTEGER REFERENCES profesionales(id),
      servicio_id INTEGER REFERENCES servicios(id),
      PRIMARY KEY (profesional_id, servicio_id)
    );

    -- Horario base semanal. 0 = domingo ... 6 = sábado.
    CREATE TABLE IF NOT EXISTS disponibilidad (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profesional_id INTEGER REFERENCES profesionales(id),
      dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
      hora_inicio TEXT NOT NULL,
      hora_fin TEXT NOT NULL
    );

    -- Vacaciones y franjas puntuales. Las fechas pueden ser 'YYYY-MM-DD'
    -- (día completo) o 'YYYY-MM-DD HH:MM' (franja dentro del día).
    CREATE TABLE IF NOT EXISTS bloqueos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profesional_id INTEGER REFERENCES profesionales(id),
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      motivo TEXT
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT,
      email TEXT,
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Citas.
    -- conversation_id, origen y notas no están en el schema base: se suman
    -- para no perder el vínculo con el chat del bot ni el panel de turnos
    -- nuevos que ya traía Bandito.
    CREATE TABLE IF NOT EXISTS citas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sucursal_id INTEGER REFERENCES sucursales(id),
      profesional_id INTEGER REFERENCES profesionales(id),
      servicio_id INTEGER REFERENCES servicios(id),
      cliente_id INTEGER REFERENCES clientes(id),
      conversation_id INTEGER REFERENCES conversations(id),
      fecha TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fin TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'confirmada'
        CHECK (estado IN ('confirmada','atendida','cancelada','no_show')),
      origen TEXT NOT NULL DEFAULT 'manual'
        CHECK (origen IN ('manual','bot','web')),
      precio_final REAL,
      descuento_id INTEGER REFERENCES descuentos(id),
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_citas_prof_fecha ON citas(profesional_id, fecha);
    CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha);

    -- Comisiones: solo la configuración se persiste. El monto mensual se
    -- calcula en query sobre las citas 'atendida' del mes.
    CREATE TABLE IF NOT EXISTS comisiones_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profesional_id INTEGER REFERENCES profesionales(id) UNIQUE,
      tipo TEXT NOT NULL CHECK (tipo IN ('porcentaje','monto_fijo')),
      valor REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS caja_movimientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('ingreso','egreso')),
      concepto TEXT NOT NULL,
      monto REAL NOT NULL,
      origen TEXT DEFAULT 'manual' CHECK (origen IN ('manual','cita')),
      cita_id INTEGER REFERENCES citas(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_caja_fecha ON caja_movimientos(fecha);
    -- Una cita no puede generar dos ingresos de caja.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_caja_cita ON caja_movimientos(cita_id)
      WHERE cita_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS descuentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      tipo TEXT NOT NULL CHECK (tipo IN ('porcentaje','monto')),
      valor REAL NOT NULL,
      vigencia_desde TEXT,
      vigencia_hasta TEXT,
      usos_max INTEGER,
      usos_actuales INTEGER DEFAULT 0,
      activo INTEGER DEFAULT 1
    );
  `);

  // Tablas de configuración y promos (se mantienen de Bandito)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      discount TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Techo horario del negocio: hasta donde se puede cargar disponibilidad.
    --
    -- OJO, no es una copia de disponibilidad ni una segunda fuente de
    -- horarios (ver CLAUDE.md, el bug de settings.hours en Bandito). Es una
    -- restriccion: NUNCA se usa para calcular turnos, solo para validar lo que
    -- se escribe en disponibilidad. Si esta tabla desapareciera, la agenda
    -- seguiria funcionando igual.
    --
    -- Siempre 7 filas, una por dia. hora_apertura NULL = el negocio no abre.
    CREATE TABLE IF NOT EXISTS horario_negocio (
      dia_semana INTEGER PRIMARY KEY CHECK (dia_semana BETWEEN 0 AND 6),
      hora_apertura TEXT,
      hora_cierre TEXT
    );
  `);

  // Migraciones incrementales del lado del bot (idempotentes)
  try { db.exec("ALTER TABLE conversations ADD COLUMN has_lead INTEGER NOT NULL DEFAULT 0"); } catch { /* ya existe */ }
  try { db.exec("ALTER TABLE conversations ADD COLUMN jid TEXT"); } catch { /* ya existe */ }
  try { db.exec("ALTER TABLE leads ADD COLUMN summary TEXT"); } catch { /* ya existe */ }

  seedDemo(db);
  sembrarHorarioNegocio(db);
}

/**
 * Siembra las 7 filas de `horario_negocio` la primera vez.
 *
 * El valor inicial es la envolvente de lo que YA hay cargado en
 * `disponibilidad` (mínima apertura, máximo cierre por día de semana). Es
 * deliberado: así el techo arranca conteniendo exactamente la agenda actual y
 * ninguna disponibilidad existente queda en conflicto el día que se activa la
 * validación. Nadie tiene que revisar nada después de deployar.
 *
 * Si un día no tiene disponibilidad cargada, queda NULL = cerrado. Si no hay
 * ningún profesional todavía (base recién creada), se usa un rango amplio para
 * no dejar el negocio cerrado toda la semana por defecto.
 *
 * Idempotente: si ya hay filas, no toca nada.
 */
function sembrarHorarioNegocio(db: Database.Database) {
  const { c } = db
    .prepare<[], { c: number }>("SELECT COUNT(*) as c FROM horario_negocio")
    .get()!;
  if (c > 0) return;

  const envolvente = db
    .prepare<[], { dia_semana: number; apertura: string; cierre: string }>(
      `SELECT d.dia_semana, MIN(d.hora_inicio) AS apertura, MAX(d.hora_fin) AS cierre
         FROM disponibilidad d
         JOIN profesionales p ON p.id = d.profesional_id
        WHERE p.activo = 1
        GROUP BY d.dia_semana`
    )
    .all();

  const hayProfesionales = db
    .prepare<[], { c: number }>("SELECT COUNT(*) as c FROM profesionales WHERE activo = 1")
    .get()!.c > 0;

  const porDia = new Map(envolvente.map((f) => [f.dia_semana, f]));
  const ins = db.prepare(
    "INSERT INTO horario_negocio (dia_semana, hora_apertura, hora_cierre) VALUES (?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (let dow = 0; dow <= 6; dow++) {
      const f = porDia.get(dow);
      if (f) ins.run(dow, f.apertura, f.cierre);
      else if (!hayProfesionales && dow >= 1 && dow <= 6) ins.run(dow, "09:00", "21:00");
      else ins.run(dow, null, null);
    }
  });
  tx();
}

/**
 * Datos de demo de Corte Inglés (seed.sql). Solo corre sobre una base vacía:
 * si ya hay profesionales cargados no toca nada, así un deploy existente
 * nunca pierde ni duplica datos.
 */
function seedDemo(db: Database.Database) {
  const { count } = db
    .prepare<[], { count: number }>("SELECT COUNT(*) as count FROM profesionales")
    .get()!;
  if (count > 0) return;

  const seed = db.transaction(() => {
    db.prepare(
      `INSERT OR IGNORE INTO negocio (id, nombre, rubro, color_primario, color_fondo_landing, tema_panel, whatsapp, direccion)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      clientConfig.nombre,
      clientConfig.rubro,
      clientConfig.landing.colores.acento,
      clientConfig.landing.colores.fondo,
      clientConfig.panel.temaDefault,
      clientConfig.whatsapp,
      clientConfig.direccion
    );

    db.prepare("INSERT INTO sucursales (id, nombre, direccion) VALUES (1, ?, ?)").run(
      "Corte Inglés Centro",
      "Av. San Martín 1234, San Juan"
    );

    const insProf = db.prepare(
      "INSERT INTO profesionales (id, sucursal_id, nombre, foto_url) VALUES (?, 1, ?, NULL)"
    );
    insProf.run(1, "Marco Alessi");
    insProf.run(2, "Ruso Fernández");
    insProf.run(3, "Toti Bravo");

    const insSvc = db.prepare(
      "INSERT INTO servicios (id, nombre, duracion_min, precio) VALUES (?, ?, ?, ?)"
    );
    insSvc.run(1, "Corte clásico", 30, 6000);
    insSvc.run(2, "Corte + barba", 45, 9000);
    insSvc.run(3, "Afeitado a navaja", 30, 5500);
    insSvc.run(4, "Color / platinado", 90, 18000);
    insSvc.run(5, "Corte niño", 25, 4500);

    // Marco: clásico, corte+barba, afeitado · Ruso: clásico, corte+barba, color
    // Toti: todo excepto color
    const insPS = db.prepare(
      "INSERT INTO profesional_servicios (profesional_id, servicio_id) VALUES (?, ?)"
    );
    const pares: Array<[number, number]> = [
      [1, 1], [1, 2], [1, 3],
      [2, 1], [2, 2], [2, 4],
      [3, 1], [3, 2], [3, 3], [3, 5],
    ];
    for (const [p, s] of pares) insPS.run(p, s);

    const insDisp = db.prepare(
      "INSERT INTO disponibilidad (profesional_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)"
    );
    // Marco: mar-sáb 10-19 (sábado hasta 17)
    for (const d of [2, 3, 4, 5]) insDisp.run(1, d, "10:00", "19:00");
    insDisp.run(1, 6, "10:00", "17:00");
    // Ruso: lun-vie 09-18
    for (const d of [1, 2, 3, 4, 5]) insDisp.run(2, d, "09:00", "18:00");
    // Toti: mié-sáb 12-20
    for (const d of [3, 4, 5, 6]) insDisp.run(3, d, "12:00", "20:00");

    db.prepare(
      "INSERT INTO bloqueos (profesional_id, fecha_inicio, fecha_fin, motivo) VALUES (?, ?, ?, ?)"
    ).run(2, "2026-09-01", "2026-09-10", "Vacaciones");

    const insCli = db.prepare("INSERT INTO clientes (id, nombre, telefono) VALUES (?, ?, ?)");
    insCli.run(1, "Federico Roldán", "+5492645559001");
    insCli.run(2, "Nahuel Ibarra", "+5492645559002");
    insCli.run(3, "Bruno Tello", "+5492645559003");

    const insCita = db.prepare(
      `INSERT INTO citas (sucursal_id, profesional_id, servicio_id, cliente_id, fecha, hora_inicio, hora_fin, estado, precio_final)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insCita.run(1, 2, 1, "2026-08-27", "11:00", "11:45", "confirmada", 9000);
    insCita.run(2, 1, 2, "2026-08-27", "15:00", "15:30", "confirmada", 6000);
    insCita.run(3, 3, 3, "2026-08-28", "13:00", "13:30", "atendida", 5500);
    insCita.run(1, 1, 3, "2026-08-20", "12:00", "12:30", "atendida", 6000);
    insCita.run(2, 4, 1, "2026-08-19", "10:00", "11:30", "atendida", 18000);

    const insCom = db.prepare(
      "INSERT INTO comisiones_config (profesional_id, tipo, valor) VALUES (?, ?, ?)"
    );
    insCom.run(1, "porcentaje", 35);
    insCom.run(2, "porcentaje", 40);
    insCom.run(3, "monto_fijo", 2000);

    const insCaja = db.prepare(
      "INSERT INTO caja_movimientos (fecha, tipo, concepto, monto, origen) VALUES (?, ?, ?, ?, 'manual')"
    );
    insCaja.run("2026-08-27", "ingreso", "Venta cera para cabello", 3500);
    insCaja.run("2026-08-27", "egreso", "Compra insumos (shampoo, toallas)", 8200);
    insCaja.run("2026-08-26", "egreso", "Pago servicio de luz", 12500);

    db.prepare(
      `INSERT INTO descuentos (codigo, tipo, valor, vigencia_desde, vigencia_hasta, usos_max)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run("BIENVENIDO15", "porcentaje", 15, "2026-08-01", "2026-12-31", 100);
  });

  seed();

}

// ── Tipos ──────────────────────────────────────────────────

export interface Conversation {
  id: number;
  phone: string;
  jid: string | null;
  name: string | null;
  mode: "AI" | "HUMAN";
  has_lead: number;
  last_message_at: number | null;
  created_at: number;
  last_message_content?: string | null;
  last_message_role?: "user" | "assistant" | "human" | null;
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
  name?: string | null,
  jid?: string | null
): Conversation {
  const db = getDb();
  db.prepare(
    `INSERT INTO conversations (phone, name, jid) VALUES (?, ?, ?)
     ON CONFLICT(phone) DO UPDATE SET
       name = COALESCE(excluded.name, conversations.name),
       jid  = COALESCE(excluded.jid,  conversations.jid)`
  ).run(phone, name ?? null, jid ?? null);
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
      `SELECT 
         c.*,
         m.content AS last_message_content,
         m.role AS last_message_role
       FROM conversations c
       LEFT JOIN messages m ON m.id = (
         SELECT id FROM messages 
         WHERE conversation_id = c.id 
         ORDER BY created_at DESC, id DESC 
         LIMIT 1
       )
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`
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
    db.prepare("UPDATE appointments SET conversation_id = NULL WHERE conversation_id = ?").run(id);
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
  const db = getDb();
  const update = db.transaction(() => {
    db.prepare(`UPDATE leads SET ${sets}, updated_at = unixepoch() WHERE id = ?`).run(...values, id);
    if (fields.name) {
      const lead = db.prepare<number, Lead>("SELECT conversation_id FROM leads WHERE id = ?").get(id);
      if (lead) {
        db.prepare(
          "UPDATE appointments SET contact_name = ? WHERE conversation_id = ? AND status = 'pending'"
        ).run(fields.name, lead.conversation_id);
      }
    }
  });
  update();
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

// ── Motor de reservas ───────────────────────────────────────
//
// El flujo del cliente final es: servicio → profesional → sucursal → día/hora.
// Cada paso se filtra con el anterior, así que nunca se ofrece una combinación
// que el negocio no pueda cumplir.
//
// Un slot está libre si entra en el horario base del profesional para ese día
// de la semana (tabla `disponibilidad`), no cae dentro de un bloqueo vigente y
// no se solapa con una cita no cancelada. Ese cálculo vive acá y en ningún otro
// lado: el panel, la landing y el bot llaman a las mismas funciones.

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string | null;
  activa: number;
}

export interface Profesional {
  id: number;
  sucursal_id: number | null;
  nombre: string;
  foto_url: string | null;
  telefono: string | null;
  activo: number;
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  duracion_min: number;
  precio: number;
  activo: number;
}

export interface Bloqueo {
  id: number;
  profesional_id: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
}

export interface Cita {
  id: number;
  sucursal_id: number | null;
  profesional_id: number;
  servicio_id: number | null;
  cliente_id: number | null;
  conversation_id: number | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: EstadoCita;
  origen: "manual" | "bot" | "web";
  precio_final: number | null;
  descuento_id: number | null;
  notas: string | null;
  created_at: string;
}

// OJO: esta definición existe DUPLICADA acá y en components/panel/types.ts —
// no una importa de la otra, ya venían así separadas en el código heredado de
// Corte. Cualquier cambio al set de estados (como este) tiene que aplicarse
// en las dos, o TypeScript no lo va a avisar en runtime, solo en build.
// 'pendiente' es la extensión propia de Bandito — ver la nota completa en
// components/panel/types.ts.
export type EstadoCita = "pendiente" | "confirmada" | "atendida" | "cancelada" | "no_show";

/** Cita con los nombres ya resueltos, que es lo que muestran las pantallas. */
export interface CitaDetalle extends Cita {
  profesional_nombre: string;
  servicio_nombre: string | null;
  servicio_duracion: number | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  sucursal_nombre: string | null;
}

export interface SlotDisponible {
  profesional_id: number;
  profesional_nombre: string;
  sucursal_id: number | null;
  hora_inicio: string;
  hora_fin: string;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

/** Suma minutos a 'HH:MM'. Se usa para derivar hora_fin desde la duración. */
export function sumarMinutos(hora: string, minutos: number): string {
  return minutesToTime(timeToMinutes(hora) + minutos);
}

function generarSlots(
  ventanaInicio: string,
  ventanaFin: string,
  duracionMin: number
): Array<{ hora_inicio: string; hora_fin: string }> {
  const inicio = timeToMinutes(ventanaInicio);
  const fin = timeToMinutes(ventanaFin);
  const slots = [];
  for (let t = inicio; t + duracionMin <= fin; t += duracionMin) {
    slots.push({ hora_inicio: minutesToTime(t), hora_fin: minutesToTime(t + duracionMin) });
  }
  return slots;
}

interface Franja {
  hora_inicio: string;
  hora_fin: string;
}

function seSolapa(inicio: string, fin: string, ocupadas: Franja[]): boolean {
  const s = timeToMinutes(inicio);
  const e = timeToMinutes(fin);
  return ocupadas.some((o) => s < timeToMinutes(o.hora_fin) && e > timeToMinutes(o.hora_inicio));
}

/** Fecha de hoy (YYYY-MM-DD) y minutos transcurridos, en hora de Argentina. */
function nowInArgentina(): { date: string; minutes: number } {
  const now = new Date();
  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = parseInt(timeParts.find((p) => p.type === "hour")!.value);
  const minute = parseInt(timeParts.find((p) => p.type === "minute")!.value);

  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => dateParts.find((p) => p.type === t)!.value;

  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: hour * 60 + minute };
}

export function hoyEnArgentina(): string {
  return nowInArgentina().date;
}

// ── Catálogo: sucursales, profesionales, servicios ──────────

export function listSucursales(incluirInactivas = false): Sucursal[] {
  return getDb()
    .prepare<[], Sucursal>(
      `SELECT * FROM sucursales ${incluirInactivas ? "" : "WHERE activa = 1"} ORDER BY nombre`
    )
    .all();
}

export function listProfesionales(incluirInactivos = false): Profesional[] {
  return getDb()
    .prepare<[], Profesional>(
      `SELECT * FROM profesionales ${incluirInactivos ? "" : "WHERE activo = 1"} ORDER BY id`
    )
    .all();
}

export function listServicios(incluirInactivos = false): Servicio[] {
  return getDb()
    .prepare<[], Servicio>(
      `SELECT * FROM servicios ${incluirInactivos ? "" : "WHERE activo = 1"} ORDER BY id`
    )
    .all();
}

/**
 * Profesionales que hacen un servicio dado. Es el segundo paso del flujo de
 * reserva: si nadie hace ese servicio la lista vuelve vacía y la landing no
 * ofrece continuar.
 */
export function listProfesionalesPorServicio(servicioId: number): Profesional[] {
  return getDb()
    .prepare<number, Profesional>(
      `SELECT p.* FROM profesionales p
         JOIN profesional_servicios ps ON ps.profesional_id = p.id
        WHERE ps.servicio_id = ? AND p.activo = 1
        ORDER BY p.nombre`
    )
    .all(servicioId);
}

export function getServicioById(id: number): Servicio | null {
  return getDb().prepare<number, Servicio>("SELECT * FROM servicios WHERE id = ?").get(id) ?? null;
}

export function getServiciosDeProfesional(profesionalId: number): number[] {
  return getDb()
    .prepare<number, { servicio_id: number }>(
      "SELECT servicio_id FROM profesional_servicios WHERE profesional_id = ?"
    )
    .all(profesionalId)
    .map((r) => r.servicio_id);
}

export function setServiciosDeProfesional(profesionalId: number, servicioIds: number[]): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM profesional_servicios WHERE profesional_id = ?").run(profesionalId);
    const ins = db.prepare(
      "INSERT OR IGNORE INTO profesional_servicios (profesional_id, servicio_id) VALUES (?, ?)"
    );
    for (const sid of servicioIds) ins.run(profesionalId, sid);
  });
  tx();
}

export function createProfesional(data: {
  nombre: string;
  sucursal_id?: number | null;
  telefono?: string | null;
  foto_url?: string | null;
}): number {
  const res = getDb()
    .prepare(
      "INSERT INTO profesionales (nombre, sucursal_id, telefono, foto_url) VALUES (?, ?, ?, ?)"
    )
    .run(data.nombre, data.sucursal_id ?? null, data.telefono ?? null, data.foto_url ?? null);
  return res.lastInsertRowid as number;
}

export function updateProfesional(
  id: number,
  data: { nombre?: string; sucursal_id?: number | null; telefono?: string | null; activo?: number }
): void {
  const campos: string[] = [];
  const valores: unknown[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    campos.push(`${k} = ?`);
    valores.push(v);
  }
  if (!campos.length) return;
  valores.push(id);
  getDb().prepare(`UPDATE profesionales SET ${campos.join(", ")} WHERE id = ?`).run(...valores);
}

/**
 * No se borra un profesional con citas: se desactiva. Borrarlo dejaría las
 * citas históricas apuntando a un id inexistente y rompería comisiones y caja.
 */
export function deleteProfesional(id: number): { ok: boolean; error?: string } {
  const db = getDb();
  const { c } = db
    .prepare<number, { c: number }>("SELECT COUNT(*) as c FROM citas WHERE profesional_id = ?")
    .get(id)!;
  if (c > 0) {
    db.prepare("UPDATE profesionales SET activo = 0 WHERE id = ?").run(id);
    return { ok: true, error: `Tiene ${c} cita(s) cargadas: se desactivó en lugar de borrarse.` };
  }
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM profesional_servicios WHERE profesional_id = ?").run(id);
    db.prepare("DELETE FROM disponibilidad WHERE profesional_id = ?").run(id);
    db.prepare("DELETE FROM bloqueos WHERE profesional_id = ?").run(id);
    db.prepare("DELETE FROM comisiones_config WHERE profesional_id = ?").run(id);
    db.prepare("DELETE FROM profesionales WHERE id = ?").run(id);
  });
  tx();
  return { ok: true };
}

export function createServicio(data: {
  nombre: string;
  descripcion?: string | null;
  duracion_min: number;
  precio: number;
}): number {
  const res = getDb()
    .prepare(
      "INSERT INTO servicios (nombre, descripcion, duracion_min, precio) VALUES (?, ?, ?, ?)"
    )
    .run(data.nombre, data.descripcion ?? null, data.duracion_min, data.precio);
  return res.lastInsertRowid as number;
}

export function updateServicio(
  id: number,
  data: Partial<Pick<Servicio, "nombre" | "descripcion" | "duracion_min" | "precio" | "activo">>
): void {
  const campos: string[] = [];
  const valores: unknown[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    campos.push(`${k} = ?`);
    valores.push(v);
  }
  if (!campos.length) return;
  valores.push(id);
  getDb().prepare(`UPDATE servicios SET ${campos.join(", ")} WHERE id = ?`).run(...valores);
}

export function deleteServicio(id: number): { ok: boolean; error?: string } {
  const db = getDb();
  const { c } = db
    .prepare<number, { c: number }>("SELECT COUNT(*) as c FROM citas WHERE servicio_id = ?")
    .get(id)!;
  if (c > 0) {
    db.prepare("UPDATE servicios SET activo = 0 WHERE id = ?").run(id);
    return { ok: true, error: `Tiene ${c} cita(s) asociadas: se desactivó en lugar de borrarse.` };
  }
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM profesional_servicios WHERE servicio_id = ?").run(id);
    db.prepare("DELETE FROM servicios WHERE id = ?").run(id);
  });
  tx();
  return { ok: true };
}

// ── Disponibilidad semanal ──────────────────────────────────

export interface FranjaDisponibilidad {
  id: number;
  profesional_id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

export function getDisponibilidad(profesionalId: number): FranjaDisponibilidad[] {
  return getDb()
    .prepare<number, FranjaDisponibilidad>(
      "SELECT * FROM disponibilidad WHERE profesional_id = ? ORDER BY dia_semana, hora_inicio"
    )
    .all(profesionalId);
}

/** Franja rechazada por no entrar en el techo del negocio. */
export interface FranjaRechazada {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  motivo: "dia_cerrado" | "fuera_de_rango" | "horario_invalido";
  /** El techo de ese dia, para poder explicar el rechazo. */
  techo: RangoDia;
}

export type SetDisponibilidadResult =
  | { ok: true }
  | { ok: false; status: 400; error: string; rechazadas: FranjaRechazada[] };

/**
 * Guarda el horario semanal de un profesional, validado contra el techo del
 * negocio.
 *
 * Se valida TODO antes de escribir nada: o entra el horario completo o no entra
 * ninguno. Guardar la mitad dejaria al profesional con una agenda a medias sin
 * que nadie se entere.
 */
export function setDisponibilidad(
  profesionalId: number,
  franjas: Array<{ dia_semana: number; hora_inicio: string; hora_fin: string }>
): SetDisponibilidadResult {
  const db = getDb();
  const techo = getHorarioNegocio();

  const rechazadas: FranjaRechazada[] = [];
  for (const f of franjas) {
    const t = techo[f.dia_semana] ?? { apertura: null, cierre: null };
    const base = { dia_semana: f.dia_semana, hora_inicio: f.hora_inicio, hora_fin: f.hora_fin, techo: t };
    if (!isValidTime(f.hora_inicio) || !isValidTime(f.hora_fin) || f.hora_fin <= f.hora_inicio) {
      rechazadas.push({ ...base, motivo: "horario_invalido" });
    } else if (!t.apertura || !t.cierre) {
      rechazadas.push({ ...base, motivo: "dia_cerrado" });
    } else if (f.hora_inicio < t.apertura || f.hora_fin > t.cierre) {
      rechazadas.push({ ...base, motivo: "fuera_de_rango" });
    }
  }

  if (rechazadas.length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Hay franjas fuera del horario del negocio.",
      rechazadas,
    };
  }

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM disponibilidad WHERE profesional_id = ?").run(profesionalId);
    const ins = db.prepare(
      "INSERT INTO disponibilidad (profesional_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)"
    );
    for (const f of franjas) ins.run(profesionalId, f.dia_semana, f.hora_inicio, f.hora_fin);
  });
  tx();
  return { ok: true };
}

// ── Bloqueos ────────────────────────────────────────────────
//
// `profesional_id = NULL` significa que el bloqueo aplica a todo el negocio
// (feriado, día cerrado). Es lo que usa la pantalla de días cerrados.

export function listBloqueos(profesionalId?: number): Bloqueo[] {
  const db = getDb();
  if (profesionalId === undefined) {
    return db
      .prepare<[], Bloqueo>("SELECT * FROM bloqueos ORDER BY fecha_inicio DESC")
      .all();
  }
  return db
    .prepare<number, Bloqueo>(
      "SELECT * FROM bloqueos WHERE profesional_id = ? OR profesional_id IS NULL ORDER BY fecha_inicio DESC"
    )
    .all(profesionalId);
}

export function createBloqueo(data: {
  profesional_id?: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  motivo?: string | null;
}): number {
  const res = getDb()
    .prepare(
      "INSERT INTO bloqueos (profesional_id, fecha_inicio, fecha_fin, motivo) VALUES (?, ?, ?, ?)"
    )
    .run(data.profesional_id ?? null, data.fecha_inicio, data.fecha_fin, data.motivo ?? null);
  return res.lastInsertRowid as number;
}

export function deleteBloqueo(id: number): void {
  getDb().prepare("DELETE FROM bloqueos WHERE id = ?").run(id);
}

/**
 * Franjas que un bloqueo ocupa DENTRO de una fecha puntual.
 *
 * `fecha_inicio` / `fecha_fin` pueden venir como 'YYYY-MM-DD' (día completo) o
 * 'YYYY-MM-DD HH:MM' (franja). Un bloqueo de varios días recorta solo en sus
 * extremos: los días del medio quedan cerrados enteros.
 */
function bloqueosDelDia(profesionalId: number, fecha: string): Franja[] {
  const filas = getDb()
    .prepare<{ pid: number; fecha: string }, Bloqueo>(
      `SELECT * FROM bloqueos
        WHERE (profesional_id = @pid OR profesional_id IS NULL)
          AND date(fecha_inicio) <= @fecha
          AND date(fecha_fin) >= @fecha`
    )
    .all({ pid: profesionalId, fecha });

  return filas.map((b) => {
    const horaDe = (valor: string): string | null => {
      const partes = valor.trim().split(/[ T]/);
      return partes.length > 1 && /^\d{2}:\d{2}/.test(partes[1]) ? partes[1].slice(0, 5) : null;
    };
    const inicio = b.fecha_inicio.slice(0, 10) === fecha ? horaDe(b.fecha_inicio) ?? "00:00" : "00:00";
    const fin = b.fecha_fin.slice(0, 10) === fecha ? horaDe(b.fecha_fin) ?? "23:59" : "23:59";
    return { hora_inicio: inicio, hora_fin: fin };
  });
}

// ── Cálculo de slots libres ─────────────────────────────────

export interface FiltroDisponibilidad {
  servicioId?: number;
  profesionalId?: number;
  sucursalId?: number;
  /** Duración a usar si no se pasa servicioId. */
  duracionMin?: number;
  /** Ignora esta cita al calcular (para reprogramar sin chocar consigo misma). */
  excluirCitaId?: number;
}

/**
 * Slots libres de una fecha. Implementa las queries 1a/1b/1c de queries.sql:
 * horario base del día de semana, menos bloqueos vigentes, menos citas no
 * canceladas.
 *
 * Acá `estado != 'cancelada'` es a propósito y NO usa `esCancelado()`: la
 * pregunta del motor de reservas no es "¿esta cita cuenta como cancelada?"
 * sino "¿este hueco está ocupado?". Un 'no_show' ocupó el hueco de verdad —el
 * profesional esperó al cliente—, así que sigue bloqueando. Liberarlo sería
 * cambiar el motor de reservas, que valida solapamientos dentro de la misma
 * transacción del INSERT; no es parte de unificar estados.
 */
export function getSlotsDisponibles(fecha: string, filtro: FiltroDisponibilidad = {}): SlotDisponible[] {
  const db = getDb();

  let duracion = filtro.duracionMin ?? 30;
  if (filtro.servicioId !== undefined) {
    const svc = getServicioById(filtro.servicioId);
    if (!svc || !svc.activo) return [];
    duracion = svc.duracion_min;
  }
  if (duracion <= 0) return [];

  // Mediodía UTC para que parsear 'YYYY-MM-DD' no se corra de día por DST.
  const diaSemana = new Date(fecha + "T12:00:00Z").getUTCDay();

  const condiciones = ["p.activo = 1"];
  const params: Record<string, unknown> = {};
  if (filtro.servicioId !== undefined) {
    condiciones.push(
      "EXISTS (SELECT 1 FROM profesional_servicios ps WHERE ps.profesional_id = p.id AND ps.servicio_id = @servicioId)"
    );
    params.servicioId = filtro.servicioId;
  }
  if (filtro.profesionalId !== undefined) {
    condiciones.push("p.id = @profesionalId");
    params.profesionalId = filtro.profesionalId;
  }
  if (filtro.sucursalId !== undefined) {
    condiciones.push("p.sucursal_id = @sucursalId");
    params.sucursalId = filtro.sucursalId;
  }

  const profesionales = db
    .prepare<Record<string, unknown>, Profesional>(
      `SELECT p.* FROM profesionales p WHERE ${condiciones.join(" AND ")} ORDER BY p.id`
    )
    .all(params);

  const resultado: SlotDisponible[] = [];

  for (const prof of profesionales) {
    const ventanas = db
      .prepare<[number, number], FranjaDisponibilidad>(
        "SELECT * FROM disponibilidad WHERE profesional_id = ? AND dia_semana = ?"
      )
      .all(prof.id, diaSemana);
    if (!ventanas.length) continue;

    const ocupadas: Franja[] = [
      ...db
        .prepare<{ pid: number; fecha: string; excluir: number }, Franja>(
          `SELECT hora_inicio, hora_fin FROM citas
            WHERE profesional_id = @pid AND fecha = @fecha
              AND estado != 'cancelada' AND id != @excluir`
        )
        .all({ pid: prof.id, fecha, excluir: filtro.excluirCitaId ?? -1 }),
      ...bloqueosDelDia(prof.id, fecha),
    ];

    for (const ventana of ventanas) {
      for (const slot of generarSlots(ventana.hora_inicio, ventana.hora_fin, duracion)) {
        if (!seSolapa(slot.hora_inicio, slot.hora_fin, ocupadas)) {
          resultado.push({
            profesional_id: prof.id,
            profesional_nombre: prof.nombre,
            sucursal_id: prof.sucursal_id,
            ...slot,
          });
        }
      }
    }
  }

  return resultado.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
}

/**
 * Query 1d de queries.sql: ¿la franja pedida choca con una cita existente del
 * mismo profesional? Se llama SIEMPRE antes de insertar o mover una cita, en
 * la misma transacción, así dos reservas simultáneas no pueden colarse las dos.
 */
export function hayConflicto(
  profesionalId: number,
  fecha: string,
  horaInicio: string,
  horaFin: string,
  excluirCitaId?: number
): boolean {
  const { conflictos } = getDb()
    .prepare<
      { pid: number; fecha: string; inicio: string; fin: string; excluir: number },
      { conflictos: number }
    >(
      // 'no_show' sigue ocupando el hueco: ver el comentario de
      // getSlotsDisponibles sobre por qué esto no usa esCancelado().
      `SELECT COUNT(*) as conflictos FROM citas
        WHERE profesional_id = @pid
          AND fecha = @fecha
          AND estado != 'cancelada'
          AND id != @excluir
          AND (@inicio < hora_fin AND @fin > hora_inicio)`
    )
    .get({
      pid: profesionalId,
      fecha,
      inicio: horaInicio,
      fin: horaFin,
      excluir: excluirCitaId ?? -1,
    })!;
  return conflictos > 0;
}

/** ¿El profesional trabaja esa franja según su horario base, sin bloqueos? */
function dentroDelHorario(profesionalId: number, fecha: string, horaInicio: string, horaFin: string): boolean {
  const diaSemana = new Date(fecha + "T12:00:00Z").getUTCDay();
  const ventanas = getDb()
    .prepare<[number, number], FranjaDisponibilidad>(
      "SELECT * FROM disponibilidad WHERE profesional_id = ? AND dia_semana = ?"
    )
    .all(profesionalId, diaSemana);

  const entra = ventanas.some(
    (v) =>
      timeToMinutes(horaInicio) >= timeToMinutes(v.hora_inicio) &&
      timeToMinutes(horaFin) <= timeToMinutes(v.hora_fin)
  );
  if (!entra) return false;
  return !seSolapa(horaInicio, horaFin, bloqueosDelDia(profesionalId, fecha));
}

/**
 * Turnos libres por fecha en un rango, para que la landing pueda deshabilitar
 * en el calendario los días sin disponibilidad ANTES de que el visitante los
 * clickee. Para hoy solo cuenta los horarios que todavía no pasaron.
 */
export function getResumenDisponibilidad(
  desde: string,
  hasta: string,
  filtro: FiltroDisponibilidad = {}
): Record<string, number> {
  const resultado: Record<string, number> = {};
  const ahora = nowInArgentina();

  const inicio = new Date(desde + "T12:00:00Z");
  const fin = new Date(hasta + "T12:00:00Z");
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin < inicio) return resultado;

  for (const cursor = new Date(inicio); cursor <= fin; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const fecha = cursor.toISOString().slice(0, 10);
    let slots = getSlotsDisponibles(fecha, filtro);
    if (fecha === ahora.date) {
      slots = slots.filter((s) => timeToMinutes(s.hora_inicio) > ahora.minutes + 30);
    }
    resultado[fecha] = slots.length;
  }

  return resultado;
}

/** Próximos slots libres, agrupados por fecha. Lo usa el bot para sugerir. */
export function getProximosSlots(
  dias: number,
  filtro: FiltroDisponibilidad = {}
): Array<SlotDisponible & { fecha: string }> {
  const resultado: Array<SlotDisponible & { fecha: string }> = [];
  const ahora = nowInArgentina();
  const cursor = new Date(ahora.date + "T12:00:00Z");

  for (let i = 0; i < dias; i++) {
    const fecha = cursor.toISOString().slice(0, 10);
    let slots = getSlotsDisponibles(fecha, filtro);
    if (fecha === ahora.date) {
      slots = slots.filter((s) => timeToMinutes(s.hora_inicio) > ahora.minutes + 30);
    }
    resultado.push(...slots.map((s) => ({ ...s, fecha })));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return resultado;
}

// ── Descuentos ──────────────────────────────────────────────

export interface Descuento {
  id: number;
  codigo: string;
  tipo: "porcentaje" | "monto";
  valor: number;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  usos_max: number | null;
  usos_actuales: number;
  activo: number;
}

export function listDescuentos(incluirInactivos = true): Descuento[] {
  return getDb()
    .prepare<[], Descuento>(
      `SELECT * FROM descuentos ${incluirInactivos ? "" : "WHERE activo = 1"} ORDER BY id DESC`
    )
    .all();
}

export function createDescuento(data: {
  codigo: string;
  tipo: "porcentaje" | "monto";
  valor: number;
  vigencia_desde?: string | null;
  vigencia_hasta?: string | null;
  usos_max?: number | null;
}): number {
  const res = getDb()
    .prepare(
      `INSERT INTO descuentos (codigo, tipo, valor, vigencia_desde, vigencia_hasta, usos_max)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.codigo.trim().toUpperCase(),
      data.tipo,
      data.valor,
      data.vigencia_desde ?? null,
      data.vigencia_hasta ?? null,
      data.usos_max ?? null
    );
  return res.lastInsertRowid as number;
}

export function updateDescuento(
  id: number,
  data: Partial<Omit<Descuento, "id" | "usos_actuales">>
): void {
  const campos: string[] = [];
  const valores: unknown[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    campos.push(`${k} = ?`);
    valores.push(k === "codigo" ? String(v).trim().toUpperCase() : v);
  }
  if (!campos.length) return;
  valores.push(id);
  getDb().prepare(`UPDATE descuentos SET ${campos.join(", ")} WHERE id = ?`).run(...valores);
}

export function deleteDescuento(id: number): { ok: boolean; error?: string } {
  const db = getDb();
  const { c } = db
    .prepare<number, { c: number }>("SELECT COUNT(*) as c FROM citas WHERE descuento_id = ?")
    .get(id)!;
  if (c > 0) {
    db.prepare("UPDATE descuentos SET activo = 0 WHERE id = ?").run(id);
    return { ok: true, error: `Ya se usó en ${c} cita(s): se desactivó en lugar de borrarse.` };
  }
  db.prepare("DELETE FROM descuentos WHERE id = ?").run(id);
  return { ok: true };
}

export type ValidacionDescuento =
  | { ok: true; descuento: Descuento; precioFinal: number; ahorro: number }
  | { ok: false; error: string };

/**
 * Valida un código contra la fecha de la cita, no contra hoy: reservar el 20
 * para el 30 tiene que respetar la vigencia del día en que se presta el
 * servicio. El precio nunca baja de 0.
 */
export function validarDescuento(codigo: string, precioBase: number, fecha: string): ValidacionDescuento {
  const desc = getDb()
    .prepare<string, Descuento>("SELECT * FROM descuentos WHERE codigo = ?")
    .get(codigo.trim().toUpperCase());

  if (!desc) return { ok: false, error: "El código no existe." };
  if (!desc.activo) return { ok: false, error: "El código está desactivado." };
  if (desc.vigencia_desde && fecha < desc.vigencia_desde) {
    return { ok: false, error: `El código recién es válido desde el ${desc.vigencia_desde}.` };
  }
  if (desc.vigencia_hasta && fecha > desc.vigencia_hasta) {
    return { ok: false, error: `El código venció el ${desc.vigencia_hasta}.` };
  }
  if (desc.usos_max !== null && desc.usos_actuales >= desc.usos_max) {
    return { ok: false, error: "El código llegó a su tope de usos." };
  }

  const bruto =
    desc.tipo === "porcentaje" ? precioBase * (1 - desc.valor / 100) : precioBase - desc.valor;
  const precioFinal = Math.max(0, Math.round(bruto * 100) / 100);
  return { ok: true, descuento: desc, precioFinal, ahorro: Math.round((precioBase - precioFinal) * 100) / 100 };
}

// ── Citas ───────────────────────────────────────────────────

const SELECT_CITA_DETALLE = `
  SELECT c.*,
         p.nombre  AS profesional_nombre,
         s.nombre  AS servicio_nombre,
         s.duracion_min AS servicio_duracion,
         cl.nombre AS cliente_nombre,
         cl.telefono AS cliente_telefono,
         su.nombre AS sucursal_nombre
    FROM citas c
    JOIN profesionales p ON p.id = c.profesional_id
    LEFT JOIN servicios s   ON s.id = c.servicio_id
    LEFT JOIN clientes cl   ON cl.id = c.cliente_id
    LEFT JOIN sucursales su ON su.id = c.sucursal_id
`;

export function listCitas(desde: string, hasta: string): CitaDetalle[] {
  return getDb()
    .prepare<[string, string], CitaDetalle>(
      `${SELECT_CITA_DETALLE} WHERE c.fecha >= ? AND c.fecha <= ?
        ORDER BY c.fecha ASC, c.hora_inicio ASC`
    )
    .all(desde, hasta);
}

export function getCitaById(id: number): CitaDetalle | null {
  return (
    getDb().prepare<number, CitaDetalle>(`${SELECT_CITA_DETALLE} WHERE c.id = ?`).get(id) ?? null
  );
}

/** Citas creadas después de un timestamp, para el aviso de "turnos nuevos". */
export function listCitasNuevas(desde: number): CitaDetalle[] {
  return getDb()
    .prepare<number, CitaDetalle>(
      `${SELECT_CITA_DETALLE} WHERE unixepoch(c.created_at) > ? ORDER BY c.created_at DESC`
    )
    .all(desde);
}

export type ResultadoCita =
  | { ok: true; id: number; precioFinal: number | null }
  | { ok: false; error: string };

export interface DatosCita {
  profesional_id: number;
  servicio_id: number;
  fecha: string;
  hora_inicio: string;
  sucursal_id?: number | null;
  cliente_id?: number | null;
  cliente_nombre?: string | null;
  cliente_telefono?: string | null;
  conversation_id?: number | null;
  origen?: "manual" | "bot" | "web";
  notas?: string | null;
  codigo_descuento?: string | null;
}

/**
 * Crea una cita. La validación de solapamiento y el INSERT van en la misma
 * transacción a propósito: si se chequeara afuera, dos reservas simultáneas
 * para el mismo hueco podrían pasar las dos.
 *
 * `hora_fin` sale de la duración del servicio, nunca la manda el cliente.
 */
export function createCita(datos: DatosCita): ResultadoCita {
  const db = getDb();
  const servicio = getServicioById(datos.servicio_id);
  if (!servicio) return { ok: false, error: "El servicio no existe." };

  const horaFin = sumarMinutos(datos.hora_inicio, servicio.duracion_min);

  const hace = db.transaction((): ResultadoCita => {
    const habilitado = db
      .prepare<[number, number], { c: number }>(
        "SELECT COUNT(*) as c FROM profesional_servicios WHERE profesional_id = ? AND servicio_id = ?"
      )
      .get(datos.profesional_id, datos.servicio_id)!;
    if (habilitado.c === 0) {
      return { ok: false, error: "Ese profesional no realiza el servicio elegido." };
    }

    if (!dentroDelHorario(datos.profesional_id, datos.fecha, datos.hora_inicio, horaFin)) {
      return { ok: false, error: "El horario elegido está fuera de la agenda del profesional." };
    }

    if (hayConflicto(datos.profesional_id, datos.fecha, datos.hora_inicio, horaFin)) {
      return { ok: false, error: "Ese horario se acaba de ocupar. Elegí otro." };
    }

    let clienteId = datos.cliente_id ?? null;
    if (!clienteId && datos.cliente_nombre) {
      clienteId = findOrCreateCliente(datos.cliente_nombre, datos.cliente_telefono ?? null);
    }

    let precioFinal = servicio.precio;
    let descuentoId: number | null = null;
    if (datos.codigo_descuento) {
      const val = validarDescuento(datos.codigo_descuento, servicio.precio, datos.fecha);
      if (!val.ok) return { ok: false, error: val.error };
      precioFinal = val.precioFinal;
      descuentoId = val.descuento.id;
      db.prepare("UPDATE descuentos SET usos_actuales = usos_actuales + 1 WHERE id = ?").run(
        descuentoId
      );
    }

    const sucursalId =
      datos.sucursal_id ??
      db
        .prepare<number, { sucursal_id: number | null }>(
          "SELECT sucursal_id FROM profesionales WHERE id = ?"
        )
        .get(datos.profesional_id)?.sucursal_id ??
      null;

    const res = db
      .prepare(
        `INSERT INTO citas
           (sucursal_id, profesional_id, servicio_id, cliente_id, conversation_id,
            fecha, hora_inicio, hora_fin, estado, origen, precio_final, descuento_id, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmada', ?, ?, ?, ?)`
      )
      .run(
        sucursalId,
        datos.profesional_id,
        datos.servicio_id,
        clienteId,
        datos.conversation_id ?? null,
        datos.fecha,
        datos.hora_inicio,
        horaFin,
        datos.origen ?? "manual",
        precioFinal,
        descuentoId,
        datos.notas ?? null
      );

    return { ok: true, id: res.lastInsertRowid as number, precioFinal };
  });

  return hace();
}

export function updateCitaEstado(id: number, estado: EstadoCita): void {
  getDb().prepare("UPDATE citas SET estado = ? WHERE id = ?").run(estado, id);
}

/**
 * Mueve una cita (día, hora o profesional). Revalida solapamiento excluyéndose
 * a sí misma, si no una cita nunca podría reprogramarse sobre su propio hueco.
 */
export function updateCita(
  id: number,
  datos: {
    profesional_id?: number;
    servicio_id?: number;
    fecha?: string;
    hora_inicio?: string;
    notas?: string | null;
    estado?: EstadoCita;
  }
): ResultadoCita {
  const db = getDb();
  const actual = db.prepare<number, Cita>("SELECT * FROM citas WHERE id = ?").get(id);
  if (!actual) return { ok: false, error: "La cita no existe." };

  const profesionalId = datos.profesional_id ?? actual.profesional_id;
  const servicioId = datos.servicio_id ?? actual.servicio_id;
  const fecha = datos.fecha ?? actual.fecha;
  const horaInicio = datos.hora_inicio ?? actual.hora_inicio;

  const servicio = servicioId ? getServicioById(servicioId) : null;
  const horaFin = servicio ? sumarMinutos(horaInicio, servicio.duracion_min) : actual.hora_fin;

  const hace = db.transaction((): ResultadoCita => {
    if (servicioId) {
      const habilitado = db
        .prepare<[number, number], { c: number }>(
          "SELECT COUNT(*) as c FROM profesional_servicios WHERE profesional_id = ? AND servicio_id = ?"
        )
        .get(profesionalId, servicioId)!;
      if (habilitado.c === 0) {
        return { ok: false, error: "Ese profesional no realiza el servicio elegido." };
      }
    }
    if (!dentroDelHorario(profesionalId, fecha, horaInicio, horaFin)) {
      return { ok: false, error: "El horario elegido está fuera de la agenda del profesional." };
    }
    if (hayConflicto(profesionalId, fecha, horaInicio, horaFin, id)) {
      return { ok: false, error: "Se solapa con otra cita de ese profesional." };
    }

    db.prepare(
      `UPDATE citas
          SET profesional_id = ?, servicio_id = ?, fecha = ?, hora_inicio = ?, hora_fin = ?,
              notas = ?, estado = ?, precio_final = ?
        WHERE id = ?`
    ).run(
      profesionalId,
      servicioId,
      fecha,
      horaInicio,
      horaFin,
      datos.notas !== undefined ? datos.notas : actual.notas,
      datos.estado ?? actual.estado,
      // Si cambió el servicio, el precio se recalcula; el descuento aplicado se
      // pierde a propósito: era para el servicio anterior.
      servicio && servicioId !== actual.servicio_id ? servicio.precio : actual.precio_final,
      id
    );
    return { ok: true, id, precioFinal: actual.precio_final };
  });

  return hace();
}

export function deleteCita(id: number): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM caja_movimientos WHERE cita_id = ?").run(id);
    db.prepare("DELETE FROM citas WHERE id = ?").run(id);
  });
  tx();
}

/**
 * ¿Esta conversación ya tiene una cita para ese hueco? Evita que el bot cree
 * dos turnos si el cliente confirma dos veces seguidas.
 */
export function existeCitaParaConversacion(
  conversationId: number,
  fecha: string,
  horaInicio: string
): boolean {
  const { c } = getDb()
    .prepare<[number, string, string], { c: number }>(
      `SELECT COUNT(*) as c FROM citas
        WHERE conversation_id = ? AND fecha = ? AND hora_inicio = ? AND estado != 'cancelada'`
    )
    .get(conversationId, fecha, horaInicio)!;
  return c > 0;
}

export function getEstadisticasCitas(): Record<EstadoCita, number> {
  const filas = getDb()
    .prepare<[], { estado: EstadoCita; c: number }>(
      "SELECT estado, COUNT(*) as c FROM citas GROUP BY estado"
    )
    .all();
  const base: Record<EstadoCita, number> = { pendiente: 0, confirmada: 0, atendida: 0, cancelada: 0, no_show: 0 };
  for (const f of filas) base[f.estado] = f.c;
  return base;
}

// ── Comisiones ──────────────────────────────────────────────

export interface ComisionConfig {
  profesional_id: number;
  tipo: "porcentaje" | "monto_fijo";
  valor: number;
}

export interface ComisionMensual extends ComisionConfig {
  nombre: string;
  citas_atendidas: number;
  facturacion_total: number;
  comision_a_pagar: number;
}

export function listComisionesConfig(): Array<ComisionConfig & { nombre: string }> {
  return getDb()
    .prepare<[], ComisionConfig & { nombre: string }>(
      `SELECT p.id AS profesional_id, p.nombre, cc.tipo, cc.valor
         FROM profesionales p
         LEFT JOIN comisiones_config cc ON cc.profesional_id = p.id
        WHERE p.activo = 1
        ORDER BY p.nombre`
    )
    .all();
}

export function setComisionConfig(
  profesionalId: number,
  tipo: "porcentaje" | "monto_fijo",
  valor: number
): void {
  getDb()
    .prepare(
      `INSERT INTO comisiones_config (profesional_id, tipo, valor) VALUES (?, ?, ?)
       ON CONFLICT(profesional_id) DO UPDATE SET tipo = excluded.tipo, valor = excluded.valor`
    )
    .run(profesionalId, tipo, valor);
}

/**
 * Resumen de comisiones de un rango de fechas (query 2 de queries.sql).
 *
 * Solo cuentan las citas 'atendida': una confirmada todavía puede cancelarse y
 * pagarla por adelantado sería regalar plata.
 *
 * Antes esto era por mes (`strftime('%Y-%m', fecha)`). Pasó a rango para que
 * alguien que cobra por semana pueda ver su avance sin esperar al cierre.
 */
export function getComisionesRango(desde: string, hasta: string): ComisionMensual[] {
  return getDb()
    .prepare<[string, string], ComisionMensual>(
      `SELECT p.id AS profesional_id,
              p.nombre,
              COALESCE(cc.tipo, 'porcentaje') AS tipo,
              COALESCE(cc.valor, 0)           AS valor,
              COUNT(c.id)                     AS citas_atendidas,
              COALESCE(SUM(c.precio_final), 0) AS facturacion_total,
              CASE
                WHEN cc.tipo = 'porcentaje' THEN ROUND(COALESCE(SUM(c.precio_final), 0) * cc.valor / 100.0, 2)
                WHEN cc.tipo = 'monto_fijo' THEN COUNT(c.id) * cc.valor
                ELSE 0
              END AS comision_a_pagar
         FROM profesionales p
         LEFT JOIN comisiones_config cc ON cc.profesional_id = p.id
         LEFT JOIN citas c
                ON c.profesional_id = p.id
               AND c.estado = 'atendida'
               AND c.fecha BETWEEN ? AND ?
        WHERE p.activo = 1
        GROUP BY p.id, p.nombre, cc.tipo, cc.valor
        ORDER BY comision_a_pagar DESC`
    )
    .all(desde, hasta);
}

// ── Caja diaria ─────────────────────────────────────────────

export interface MovimientoCaja {
  id: number;
  fecha: string;
  tipo: "ingreso" | "egreso";
  concepto: string;
  monto: number;
  origen: "manual" | "cita";
  cita_id: number | null;
  created_at: string;
}

export interface PorCobrar {
  id: number;
  hora_inicio: string;
  precio_final: number | null;
  cliente: string | null;
  profesional: string;
  servicio: string | null;
}

export interface ResumenCaja {
  fecha: string;
  movimientos: MovimientoCaja[];
  total_ingresos: number;
  total_egresos: number;
  resultado_neto: number;
  por_cobrar: PorCobrar[];
  total_por_cobrar: number;
}

/**
 * Carga en caja las citas ya atendidas del día que todavía no generaron
 * ingreso (query 3a). Es idempotente por el índice único sobre `cita_id`:
 * llamarla dos veces no duplica nada.
 */
export function autocargarIngresosDelDia(fecha: string): number {
  const db = getDb();
  const pendientes = db
    .prepare<string, { id: number; precio_final: number | null; servicio: string | null; profesional: string }>(
      `SELECT c.id, c.precio_final, s.nombre AS servicio, p.nombre AS profesional
         FROM citas c
         JOIN profesionales p ON p.id = c.profesional_id
         LEFT JOIN servicios s ON s.id = c.servicio_id
        WHERE c.fecha = ?
          AND c.estado = 'atendida'
          AND c.precio_final IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM caja_movimientos cm WHERE cm.cita_id = c.id)`
    )
    .all(fecha);

  if (!pendientes.length) return 0;

  const ins = db.prepare(
    `INSERT INTO caja_movimientos (fecha, tipo, concepto, monto, origen, cita_id)
     VALUES (?, 'ingreso', ?, ?, 'cita', ?)`
  );
  const tx = db.transaction(() => {
    for (const c of pendientes) {
      ins.run(fecha, `${c.servicio ?? "Servicio"} — ${c.profesional}`, c.precio_final, c.id);
    }
  });
  tx();
  return pendientes.length;
}

export function getCajaDia(fecha: string): ResumenCaja {
  const db = getDb();
  autocargarIngresosDelDia(fecha);

  const movimientos = db
    .prepare<string, MovimientoCaja>(
      "SELECT * FROM caja_movimientos WHERE fecha = ? ORDER BY created_at DESC, id DESC"
    )
    .all(fecha);

  const resumen = db
    .prepare<string, { ingresos: number | null; egresos: number | null }>(
      `SELECT SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) AS ingresos,
              SUM(CASE WHEN tipo = 'egreso'  THEN monto ELSE 0 END) AS egresos
         FROM caja_movimientos WHERE fecha = ?`
    )
    .get(fecha)!;

  // Query 3c: confirmadas de hoy que todavía no pasaron por caja.
  const porCobrar = db
    .prepare<string, PorCobrar>(
      `SELECT c.id, c.hora_inicio, c.precio_final,
              cl.nombre AS cliente, p.nombre AS profesional, s.nombre AS servicio
         FROM citas c
         JOIN profesionales p ON p.id = c.profesional_id
         LEFT JOIN clientes cl ON cl.id = c.cliente_id
         LEFT JOIN servicios s ON s.id = c.servicio_id
        WHERE c.fecha = ?
          AND c.estado = 'confirmada'
        ORDER BY c.hora_inicio`
    )
    .all(fecha);

  const ingresos = resumen.ingresos ?? 0;
  const egresos = resumen.egresos ?? 0;

  return {
    fecha,
    movimientos,
    total_ingresos: ingresos,
    total_egresos: egresos,
    resultado_neto: ingresos - egresos,
    por_cobrar: porCobrar,
    total_por_cobrar: porCobrar.reduce((acc, c) => acc + (c.precio_final ?? 0), 0),
  };
}

export function createMovimientoCaja(data: {
  fecha: string;
  tipo: "ingreso" | "egreso";
  concepto: string;
  monto: number;
}): number {
  const res = getDb()
    .prepare(
      "INSERT INTO caja_movimientos (fecha, tipo, concepto, monto, origen) VALUES (?, ?, ?, ?, 'manual')"
    )
    .run(data.fecha, data.tipo, data.concepto, data.monto);
  return res.lastInsertRowid as number;
}

export function deleteMovimientoCaja(id: number): { ok: boolean; error?: string } {
  const db = getDb();
  const mov = db
    .prepare<number, { origen: string }>("SELECT origen FROM caja_movimientos WHERE id = ?")
    .get(id);
  if (!mov) return { ok: false, error: "El movimiento no existe." };
  if (mov.origen === "cita") {
    // Borrarlo lo haría reaparecer en el próximo autocargado. Para sacarlo hay
    // que cambiar el estado de la cita.
    return { ok: false, error: "Viene de una cita atendida: cambiá el estado de la cita." };
  }
  db.prepare("DELETE FROM caja_movimientos WHERE id = ?").run(id);
  return { ok: true };
}

/** Marca la cita como atendida y la deja cargada en la caja del día. */
export function cobrarCita(citaId: number): { ok: boolean; error?: string } {
  const db = getDb();
  const cita = db.prepare<number, Cita>("SELECT * FROM citas WHERE id = ?").get(citaId);
  if (!cita) return { ok: false, error: "La cita no existe." };
  db.prepare("UPDATE citas SET estado = 'atendida' WHERE id = ?").run(citaId);
  autocargarIngresosDelDia(cita.fecha);
  return { ok: true };
}

// ── Settings ────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const row = getDb().prepare<string, { value: string }>("SELECT value FROM settings WHERE key = ?").get(key);
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb().prepare<[], { key: string; value: string }>("SELECT key, value FROM settings").all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ── Negocio ─────────────────────────────────────────────────

export interface Negocio {
  id: number;
  nombre: string;
  rubro: string;
  logo_url: string | null;
  color_primario: string | null;
  color_fondo_landing: string | null;
  tema_panel: string | null;
  whatsapp: string | null;
  direccion: string | null;
}

export function getNegocio(): Negocio | null {
  return getDb().prepare<[], Negocio>("SELECT * FROM negocio WHERE id = 1").get() ?? null;
}

export function updateNegocio(data: Partial<Omit<Negocio, "id">>): void {
  const campos: string[] = [];
  const valores: unknown[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    campos.push(`${k} = ?`);
    valores.push(v);
  }
  if (!campos.length) return;
  getDb().prepare(`UPDATE negocio SET ${campos.join(", ")} WHERE id = 1`).run(...valores);
}

// ── Promociones ─────────────────────────────────────────────

export interface Promotion {
  id: number;
  title: string;
  description: string | null;
  discount: string | null;
  active: number;
  created_at: number;
}

export function listPromotions(includeInactive = false): Promotion[] {
  return getDb()
    .prepare<[], Promotion>(
      `SELECT * FROM promotions ${includeInactive ? "" : "WHERE active = 1"} ORDER BY id DESC`
    )
    .all();
}

export function createPromotion(data: { title: string; description?: string | null; discount?: string | null }): number {
  const res = getDb()
    .prepare("INSERT INTO promotions (title, description, discount) VALUES (?, ?, ?)")
    .run(data.title, data.description ?? null, data.discount ?? null);
  return res.lastInsertRowid as number;
}

export function updatePromotion(
  id: number,
  data: Partial<Pick<Promotion, "title" | "description" | "discount" | "active">>
): void {
  const campos: string[] = [];
  const valores: unknown[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    campos.push(`${k} = ?`);
    valores.push(v);
  }
  if (!campos.length) return;
  valores.push(id);
  getDb().prepare(`UPDATE promotions SET ${campos.join(", ")} WHERE id = ?`).run(...valores);
}

export function deletePromotion(id: number): void {
  getDb().prepare("DELETE FROM promotions WHERE id = ?").run(id);
}

// ── Horario del negocio (vista sobre `disponibilidad`) ───────
//
// Con un solo profesional activo, el horario del negocio ES su disponibilidad
// y se puede editar desde acá. Con dos o más, esta vista pasa a SOLO LECTURA y
// muestra la envolvente (apertura más temprana / cierre más tardío): aplicar un
// horario general sobre varios profesionales borraría en silencio la agenda
// individual de cada uno. Es el mismo criterio que quedó documentado en
// Bandito después del lío de las dos fuentes de verdad.

export const DIAS = [
  { key: "domingo", dow: 0, label: "Domingo" },
  { key: "lunes", dow: 1, label: "Lunes" },
  { key: "martes", dow: 2, label: "Martes" },
  { key: "miercoles", dow: 3, label: "Miércoles" },
  { key: "jueves", dow: 4, label: "Jueves" },
  { key: "viernes", dow: 5, label: "Viernes" },
  { key: "sabado", dow: 6, label: "Sábado" },
] as const;

export type DayKey = (typeof DIAS)[number]["key"];
export type BusinessHours = Record<DayKey, { open: string; close: string } | null>;

export interface BusinessHoursView {
  hours: BusinessHours;
  editable: boolean;
  profesionalesActivos: number;
}

function emptyHours(): BusinessHours {
  return Object.fromEntries(DIAS.map((d) => [d.key, null])) as BusinessHours;
}

// ── Horario del negocio: el techo ───────────────────────────
//
// Dos conceptos parecidos que NO son lo mismo. Mezclarlos es exactamente el
// bug que documenta CLAUDE.md:
//
//   getBusinessHours()    envolvente de `disponibilidad`. "Cuando hay alguien
//                         atendiendo". Es lo que ve el cliente: lo usa el
//                         prompt del bot para contestar por WhatsApp.
//
//   getHorarioNegocio()   el techo editable. "Hasta donde se PUEDE cargar
//                         disponibilidad". No calcula turnos ni se le muestra
//                         a ningun cliente: solo valida escrituras.
//
// Pueden diferir a proposito: el techo puede ser 09:00-21:00 y que nadie
// trabaje despues de las 19. El bot tiene que decir 19, no 21.

export interface RangoDia {
  /** null = el negocio no abre ese dia. */
  apertura: string | null;
  cierre: string | null;
}

export type HorarioNegocio = Record<number, RangoDia>;

export function getHorarioNegocio(): HorarioNegocio {
  const filas = getDb()
    .prepare<[], { dia_semana: number; hora_apertura: string | null; hora_cierre: string | null }>(
      "SELECT dia_semana, hora_apertura, hora_cierre FROM horario_negocio ORDER BY dia_semana"
    )
    .all();
  const out: HorarioNegocio = {};
  for (let dow = 0; dow <= 6; dow++) out[dow] = { apertura: null, cierre: null };
  for (const f of filas) out[f.dia_semana] = { apertura: f.hora_apertura, cierre: f.hora_cierre };
  return out;
}

/** Franja de disponibilidad que no entra en el techo. */
export interface ConflictoTecho {
  profesional_id: number;
  profesional_nombre: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  motivo: "dia_cerrado" | "fuera_de_rango";
}

/**
 * Disponibilidad ya cargada que quedaria fuera de un techo dado.
 *
 * Se usa antes de guardar el techo: si achicarlo dejaria gente afuera, no se
 * recorta en silencio —se devuelve la lista y decide una persona—. Recortar la
 * agenda de alguien sin avisar es como se pierden turnos sin que nadie entienda
 * por que.
 */
export function conflictosConTecho(horario: HorarioNegocio): ConflictoTecho[] {
  const filas = getDb()
    .prepare<[], { profesional_id: number; nombre: string; dia_semana: number; hora_inicio: string; hora_fin: string }>(
      `SELECT d.profesional_id, p.nombre, d.dia_semana, d.hora_inicio, d.hora_fin
         FROM disponibilidad d
         JOIN profesionales p ON p.id = d.profesional_id
        WHERE p.activo = 1
        ORDER BY p.nombre, d.dia_semana, d.hora_inicio`
    )
    .all();

  const out: ConflictoTecho[] = [];
  for (const f of filas) {
    const techo = horario[f.dia_semana];
    const base = {
      profesional_id: f.profesional_id,
      profesional_nombre: f.nombre,
      dia_semana: f.dia_semana,
      hora_inicio: f.hora_inicio,
      hora_fin: f.hora_fin,
    };
    if (!techo || !techo.apertura || !techo.cierre) {
      out.push({ ...base, motivo: "dia_cerrado" });
    } else if (f.hora_inicio < techo.apertura || f.hora_fin > techo.cierre) {
      out.push({ ...base, motivo: "fuera_de_rango" });
    }
  }
  return out;
}

export type SetHorarioNegocioResult =
  | { ok: true }
  | { ok: false; status: 400; error: string; dias: number[] }
  | { ok: false; status: 409; error: string; conflictos: ConflictoTecho[] };

/**
 * Guarda el techo. `recortar: true` ajusta la disponibilidad que quede afuera
 * en vez de rechazar; es una accion explicita del usuario, nunca el default.
 */
export function setHorarioNegocio(
  horario: HorarioNegocio,
  opciones: { recortar?: boolean } = {}
): SetHorarioNegocioResult {
  const db = getDb();

  const invalidos: number[] = [];
  for (let dow = 0; dow <= 6; dow++) {
    const r = horario[dow];
    if (!r || (r.apertura === null && r.cierre === null)) continue;
    if (!isValidTime(r.apertura) || !isValidTime(r.cierre) || r.cierre! <= r.apertura!) {
      invalidos.push(dow);
    }
  }
  if (invalidos.length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Hay días con horario inválido (el cierre tiene que ser posterior a la apertura).",
      dias: invalidos,
    };
  }

  const conflictos = conflictosConTecho(horario);
  if (conflictos.length > 0 && !opciones.recortar) {
    return {
      ok: false,
      status: 409,
      error: "Hay disponibilidad cargada fuera de este horario.",
      conflictos,
    };
  }

  const tx = db.transaction(() => {
    const up = db.prepare(
      `INSERT INTO horario_negocio (dia_semana, hora_apertura, hora_cierre) VALUES (?, ?, ?)
         ON CONFLICT(dia_semana) DO UPDATE SET hora_apertura = excluded.hora_apertura,
                                               hora_cierre = excluded.hora_cierre`
    );
    for (let dow = 0; dow <= 6; dow++) {
      const r = horario[dow] ?? { apertura: null, cierre: null };
      up.run(dow, r.apertura, r.cierre);
    }

    if (opciones.recortar) {
      // Recorte explicito: el dia cerrado borra la franja; el fuera de rango se
      // ajusta a los bordes. Si al ajustar la franja queda vacia o invertida,
      // se borra: no tiene sentido dejar 19:00-19:00.
      for (const c of conflictos) {
        const techo = horario[c.dia_semana];
        if (!techo?.apertura || !techo?.cierre) {
          db.prepare(
            "DELETE FROM disponibilidad WHERE profesional_id = ? AND dia_semana = ? AND hora_inicio = ? AND hora_fin = ?"
          ).run(c.profesional_id, c.dia_semana, c.hora_inicio, c.hora_fin);
          continue;
        }
        const inicio = c.hora_inicio < techo.apertura ? techo.apertura : c.hora_inicio;
        const fin = c.hora_fin > techo.cierre ? techo.cierre : c.hora_fin;
        if (fin <= inicio) {
          db.prepare(
            "DELETE FROM disponibilidad WHERE profesional_id = ? AND dia_semana = ? AND hora_inicio = ? AND hora_fin = ?"
          ).run(c.profesional_id, c.dia_semana, c.hora_inicio, c.hora_fin);
        } else {
          db.prepare(
            "UPDATE disponibilidad SET hora_inicio = ?, hora_fin = ? WHERE profesional_id = ? AND dia_semana = ? AND hora_inicio = ? AND hora_fin = ?"
          ).run(inicio, fin, c.profesional_id, c.dia_semana, c.hora_inicio, c.hora_fin);
        }
      }
    }
  });
  tx();
  return { ok: true };
}

export function getBusinessHours(): BusinessHoursView {
  const db = getDb();
  const activos = db
    .prepare<[], { c: number }>("SELECT COUNT(*) as c FROM profesionales WHERE activo = 1")
    .get()!.c;

  const filas = db
    .prepare<[], { dia_semana: number; apertura: string; cierre: string }>(
      `SELECT d.dia_semana, MIN(d.hora_inicio) AS apertura, MAX(d.hora_fin) AS cierre
         FROM disponibilidad d
         JOIN profesionales p ON p.id = d.profesional_id
        WHERE p.activo = 1
        GROUP BY d.dia_semana`
    )
    .all();

  const hours = emptyHours();
  for (const f of filas) {
    const dia = DIAS.find((d) => d.dow === f.dia_semana);
    if (dia) hours[dia.key] = { open: f.apertura, close: f.cierre };
  }

  return { hours, editable: activos === 1, profesionalesActivos: activos };
}

export type SetBusinessHoursResult =
  | { ok: true }
  | { ok: false; status: 409 | 400; error: string; dias?: string[] };

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function setBusinessHours(hours: Partial<BusinessHours>): SetBusinessHoursResult {
  const db = getDb();
  const activos = db
    .prepare<[], { id: number }>("SELECT id FROM profesionales WHERE activo = 1")
    .all();

  if (activos.length !== 1) {
    return {
      ok: false,
      status: 409,
      error:
        activos.length === 0
          ? "No hay ningún profesional activo al que aplicarle el horario."
          : "Hay más de un profesional activo: editá la disponibilidad de cada uno en Personal.",
    };
  }

  const invalidos: string[] = [];
  const franjas: Array<{ dia_semana: number; hora_inicio: string; hora_fin: string }> = [];

  for (const dia of DIAS) {
    if (!(dia.key in hours)) continue;
    const v = hours[dia.key];
    if (v === null) continue;
    if (!v || !isValidTime(v.open) || !isValidTime(v.close) || v.close <= v.open) {
      invalidos.push(dia.label);
      continue;
    }
    franjas.push({ dia_semana: dia.dow, hora_inicio: v.open, hora_fin: v.close });
  }

  if (invalidos.length) {
    return {
      ok: false,
      status: 400,
      error: "Hay días con un horario inválido (el cierre tiene que ser posterior a la apertura).",
      dias: invalidos,
    };
  }

  setDisponibilidad(activos[0].id, franjas);
  return { ok: true };
}

/** Duración del servicio más corto: define la grilla mínima de la agenda. */
export function duracionServicioMasCorto(): number | null {
  const row = getDb()
    .prepare<[], { d: number | null }>("SELECT MIN(duracion_min) as d FROM servicios WHERE activo = 1")
    .get()!;
  return row.d ?? null;
}

// ── Días cerrados (bloqueo de negocio completo) ─────────────
//
// Un día cerrado es un `bloqueo` con profesional_id NULL: aplica a todos.
//
// Antes esta capa solo sabía de días sueltos: listDiasCerrados filtraba
// `date(fecha_inicio) = date(fecha_fin)`, así que un cierre de varios días no
// se podía cargar y —peor— si existía, no se listaba y no había forma de
// borrarlo desde el panel. Ahora se manejan rangos y medio día, que es lo que
// la tabla ya soportaba.

export interface DiaCerrado {
  id: number;
  /** 'YYYY-MM-DD' */
  desde: string;
  hasta: string;
  /** 'HH:MM' o null si es día completo. */
  hora_desde: string | null;
  hora_hasta: string | null;
  motivo: string | null;
}

function partirFecha(valor: string): { fecha: string; hora: string | null } {
  const partes = valor.trim().split(/[ T]/);
  return {
    fecha: partes[0],
    hora: partes.length > 1 && /^\d{2}:\d{2}/.test(partes[1]) ? partes[1].slice(0, 5) : null,
  };
}

export function listDiasCerrados(): DiaCerrado[] {
  return getDb()
    .prepare<[], { id: number; fecha_inicio: string; fecha_fin: string; motivo: string | null }>(
      `SELECT id, fecha_inicio, fecha_fin, motivo FROM bloqueos
        WHERE profesional_id IS NULL
        ORDER BY fecha_inicio`
    )
    .all()
    .map((r) => {
      const i = partirFecha(r.fecha_inicio);
      const f = partirFecha(r.fecha_fin);
      return {
        id: r.id,
        desde: i.fecha,
        hasta: f.fecha,
        hora_desde: i.hora,
        hora_hasta: f.hora,
        motivo: r.motivo,
      };
    });
}

export type AddDiaCerradoResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

/**
 * Cierra un día o un rango. Con `horaDesde`/`horaHasta` cierra media jornada.
 *
 * No valida contra turnos ya reservados a propósito: eso se consulta aparte
 * (`citasEnCierre`) y lo decide una persona. Cancelar turnos como efecto
 * lateral de cerrar un día sería exactamente lo que no queremos.
 */
export function addDiaCerrado(
  desde: string,
  hasta?: string,
  motivo = "Cerrado",
  horaDesde?: string | null,
  horaHasta?: string | null
): AddDiaCerradoResult {
  const fin = hasta && hasta.trim() ? hasta : desde;
  if (fin < desde) return { ok: false, error: "La fecha final es anterior a la inicial." };
  if (horaDesde && !isValidTime(horaDesde)) return { ok: false, error: "Hora de inicio inválida." };
  if (horaHasta && !isValidTime(horaHasta)) return { ok: false, error: "Hora de fin inválida." };
  if (desde === fin && horaDesde && horaHasta && horaHasta <= horaDesde) {
    return { ok: false, error: "La hora de fin tiene que ser posterior a la de inicio." };
  }

  const inicio = horaDesde ? `${desde} ${horaDesde}` : desde;
  const final = horaHasta ? `${fin} ${horaHasta}` : fin;

  const info = getDb()
    .prepare(
      "INSERT INTO bloqueos (profesional_id, fecha_inicio, fecha_fin, motivo) VALUES (NULL, ?, ?, ?)"
    )
    .run(inicio, final, motivo);
  return { ok: true, id: Number(info.lastInsertRowid) };
}

/** Se borra por id: con rangos y medio día, la fecha ya no identifica una fila. */
export function removeDiaCerrado(id: number): void {
  getDb().prepare("DELETE FROM bloqueos WHERE id = ? AND profesional_id IS NULL").run(id);
}

/**
 * Turnos confirmados que caen dentro de un cierre.
 *
 * Cerrar un día NO los toca: el bloqueo solo frena reservas nuevas. Los que ya
 * estaban siguen en pie y el cliente se presenta igual. Por eso hay que
 * mostrarlos y decidir, que es el agujero que tenía la pantalla anterior.
 */
export interface CitaEnCierre {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  servicio_nombre: string | null;
  profesional_nombre: string | null;
}

export function citasEnCierre(
  desde: string,
  hasta?: string,
  horaDesde?: string | null,
  horaHasta?: string | null
): CitaEnCierre[] {
  const fin = hasta && hasta.trim() ? hasta : desde;
  const filas = getDb()
    .prepare<{ desde: string; hasta: string }, CitaEnCierre>(
      `SELECT c.id, c.fecha, c.hora_inicio, c.hora_fin, c.estado,
              cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono,
              s.nombre AS servicio_nombre, p.nombre AS profesional_nombre
         FROM citas c
         LEFT JOIN clientes cl ON cl.id = c.cliente_id
         LEFT JOIN servicios s ON s.id = c.servicio_id
         LEFT JOIN profesionales p ON p.id = c.profesional_id
        WHERE c.estado = 'confirmada'
          AND c.fecha >= @desde AND c.fecha <= @hasta
        ORDER BY c.fecha, c.hora_inicio`
    )
    .all({ desde, hasta: fin });

  // Con medio día, solo cuentan los turnos que caen dentro de la franja.
  return filas.filter((c) => {
    if (c.fecha === desde && horaDesde && c.hora_fin <= horaDesde) return false;
    if (c.fecha === fin && horaHasta && c.hora_inicio >= horaHasta) return false;
    return true;
  });
}

// ── Clientes ────────────────────────────────────────────────

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  created_at: string;
}

export interface ClienteConVisitas extends Cliente {
  /** Citas ni canceladas ni ausentes cuya fecha ya pasó. */
  visitas: number;
  /** Fecha de la última visita cumplida, o null si nunca vino. */
  ultima_visita: string | null;
  /** Suma de lo facturado en citas atendidas. */
  total_gastado: number;
  /** Veces que reservó y no se presentó (`estado = 'no_show'`). */
  no_vino: number;
}

export function findOrCreateCliente(nombre: string, telefono: string | null): number {
  const db = getDb();
  if (telefono) {
    const existe = db
      .prepare<string, { id: number }>("SELECT id FROM clientes WHERE telefono = ?")
      .get(telefono);
    if (existe) return existe.id;
  }
  const res = db.prepare("INSERT INTO clientes (nombre, telefono) VALUES (?, ?)").run(nombre, telefono);
  return res.lastInsertRowid as number;
}

export function getClienteById(id: number): Cliente | null {
  return getDb().prepare<number, Cliente>("SELECT * FROM clientes WHERE id = ?").get(id) ?? null;
}

/**
 * Visitas, última visita y total gastado se calculan al vuelo desde `citas`;
 * no hay contadores guardados en `clientes`. Duplicar el dato sería repetir el
 * error de las dos fuentes de verdad que documenta el CLAUDE.md de Bandito.
 *
 * Una cita cuenta como visita si no está cancelada y su fecha ya pasó: una
 * reserva para mañana todavía no es una visita.
 *
 * 'no_show' NO cuenta como visita. Antes acá decía `estado != 'cancelada'`, que
 * dejaba entrar las ausencias: el cliente que reservó y no apareció figuraba
 * como que había venido. Es la misma regla que `esCancelado()` en el panel.
 *
 * Las ausencias se cuentan aparte, en `no_vino`. El dato ya estaba en `citas`;
 * no hace falta ninguna columna nueva para tenerlo.
 */
function sqlClientesConVisitas(conFiltro: boolean): string {
  return `
    SELECT cl.*,
           COUNT(c.id) AS visitas,
           MAX(c.fecha) AS ultima_visita,
           COALESCE(SUM(CASE WHEN c.estado = 'atendida' THEN c.precio_final ELSE 0 END), 0) AS total_gastado,
           (SELECT COUNT(*) FROM citas n
             WHERE n.cliente_id = cl.id AND n.estado = 'no_show') AS no_vino
      FROM clientes cl
      LEFT JOIN citas c
             ON c.cliente_id = cl.id
            AND c.estado NOT IN ('cancelada', 'no_show')
            AND c.fecha <= @hoy
     ${conFiltro ? "WHERE cl.nombre LIKE @like OR cl.telefono LIKE @like" : ""}
     GROUP BY cl.id
     ORDER BY cl.nombre ASC
  `;
}

export function getClientes(): ClienteConVisitas[] {
  return getDb()
    .prepare<{ hoy: string }, ClienteConVisitas>(sqlClientesConVisitas(false))
    .all({ hoy: hoyEnArgentina() });
}

export function searchClientes(query: string): ClienteConVisitas[] {
  return getDb()
    .prepare<{ hoy: string; like: string }, ClienteConVisitas>(sqlClientesConVisitas(true))
    .all({ hoy: hoyEnArgentina(), like: `%${query}%` });
}

export function getHistorialCliente(clienteId: number): CitaDetalle[] {
  return getDb()
    .prepare<number, CitaDetalle>(
      `${SELECT_CITA_DETALLE} WHERE c.cliente_id = ? ORDER BY c.fecha DESC, c.hora_inicio DESC`
    )
    .all(clienteId);
}

export function updateCliente(
  id: number,
  data: Partial<Pick<Cliente, "nombre" | "telefono" | "email" | "notas">>
): void {
  const campos: string[] = [];
  const valores: unknown[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    campos.push(`${k} = ?`);
    valores.push(v);
  }
  if (!campos.length) return;
  valores.push(id);
  getDb().prepare(`UPDATE clientes SET ${campos.join(", ")} WHERE id = ?`).run(...valores);
}

export type ResultadoBorrarCliente =
  | { ok: true }
  | { ok: false; error: string; turnos: number };

/**
 * Un cliente con turnos cargados (de cualquier estado, cancelados incluidos)
 * no se borra: perdería ese historial en silencio. No hay `force`/override
 * acá a propósito — si hace falta borrar uno igual, es una decisión puntual
 * que se toma caso por caso directo en la base, no un botón del panel.
 */
export function deleteCliente(id: number): ResultadoBorrarCliente {
  const db = getDb();
  const { n } = db
    .prepare<number, { n: number }>("SELECT COUNT(*) as n FROM citas WHERE cliente_id = ?")
    .get(id)!;
  if (n > 0) {
    return {
      ok: false,
      error: `Este cliente tiene ${n} turno${n === 1 ? "" : "s"} cargado${n === 1 ? "" : "s"}. Borrarlo perdería ese historial.`,
      turnos: n,
    };
  }
  db.prepare("DELETE FROM clientes WHERE id = ?").run(id);
  return { ok: true };
}

export interface ResultadoFusionDuplicados {
  gruposFusionados: number;
  clientesEliminados: number;
  detalle: Array<{
    nombre: string;
    principalId: number;
    fusionadosIds: number[];
    turnosReasignados: number;
  }>;
}

/**
 * Uso único post-migración (septiembre 2026): la migración desde el schema
 * viejo creó un cliente nuevo por cada turno histórico sin teléfono en vez
 * de reutilizar uno ya existente con el mismo nombre — de ahí decenas de
 * "duplicados" con 1 turno cada uno. Fusiona clientes que comparten nombre
 * EXACTO y donde NINGUNO tiene teléfono cargado; los que coinciden por
 * teléfono no se tocan. Se queda el id más bajo del grupo, reasigna los
 * turnos de los demás antes de borrarlos (no se pierde historial, igual que
 * deleteCliente()). Recalcula los grupos contra la base viva en el momento
 * de correr, no una lista fija — así no importa qué se haya cargado desde
 * el día de la migración.
 */
export function mergeClientesDuplicadosSinTelefono(): ResultadoFusionDuplicados {
  const db = getDb();
  const clientes = db
    .prepare<[], { id: number; nombre: string; telefono: string | null }>(
      "SELECT id, nombre, telefono FROM clientes ORDER BY nombre, id"
    )
    .all();

  const grupos = new Map<string, typeof clientes>();
  for (const c of clientes) {
    const lista = grupos.get(c.nombre) ?? [];
    lista.push(c);
    grupos.set(c.nombre, lista);
  }

  const detalle: ResultadoFusionDuplicados["detalle"] = [];

  const ejecutar = db.transaction(() => {
    for (const [nombre, miembros] of grupos) {
      if (miembros.length < 2) continue;
      const sinTelefono = miembros.every((m) => !m.telefono || !m.telefono.trim());
      if (!sinTelefono) continue;

      const [principal, ...resto] = [...miembros].sort((a, b) => a.id - b.id);
      let turnosReasignados = 0;
      for (const perdedor of resto) {
        const r = db
          .prepare("UPDATE citas SET cliente_id = ? WHERE cliente_id = ?")
          .run(principal.id, perdedor.id);
        turnosReasignados += r.changes;
        db.prepare("DELETE FROM clientes WHERE id = ?").run(perdedor.id);
      }
      detalle.push({
        nombre,
        principalId: principal.id,
        fusionadosIds: resto.map((m) => m.id),
        turnosReasignados,
      });
    }
  });
  ejecutar();

  return {
    gruposFusionados: detalle.length,
    clientesEliminados: detalle.reduce((acc, d) => acc + d.fusionadosIds.length, 0),
    detalle,
  };
}

// ── Caja por rango ──────────────────────────────────────────

export interface DiaDeCaja {
  fecha: string;
  movimientos: number;
  ingresos: number;
  egresos: number;
  neto: number;
}

export interface DiaSinCargar {
  fecha: string;
  turnos: number;
  monto: number;
}

export interface ResumenCajaRango {
  desde: string;
  hasta: string;
  total_ingresos: number;
  total_egresos: number;
  neto: number;
  dias: DiaDeCaja[];
  /**
   * Días con citas atendidas que todavía no pasaron por caja. Ver el comentario
   * de `getCajaRango`.
   */
  sin_cargar: DiaSinCargar[];
}

/**
 * Caja de un rango de fechas. **No escribe.**
 *
 * `getCajaDia` autocarga: al abrir un día, mete en caja las citas atendidas que
 * todavía no tienen movimiento. Eso está bien para un día —es el momento en que
 * cerrás la caja— pero llamarlo en loop sobre un mes escribiría 30 días de
 * movimientos de golpe, disparado por el solo hecho de mirar una pantalla.
 *
 * Entonces acá se lee y nada más. La contra es que un día que nunca se abrió
 * tiene citas atendidas fuera de caja y su total sale por debajo de lo real;
 * por eso se devuelve `sin_cargar`, para poder decirlo en pantalla en vez de
 * mostrar un número corto sin avisar.
 */
export function getCajaRango(desde: string, hasta: string): ResumenCajaRango {
  const db = getDb();

  const dias = db
    .prepare<[string, string], DiaDeCaja>(
      `SELECT fecha,
              COUNT(*) AS movimientos,
              COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresos,
              COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN monto ELSE 0 END), 0) AS egresos,
              COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0) AS neto
         FROM caja_movimientos
        WHERE fecha BETWEEN ? AND ?
        GROUP BY fecha
        ORDER BY fecha`
    )
    .all(desde, hasta);

  const sinCargar = db
    .prepare<[string, string], DiaSinCargar>(
      `SELECT c.fecha, COUNT(*) AS turnos, COALESCE(SUM(c.precio_final), 0) AS monto
         FROM citas c
        WHERE c.fecha BETWEEN ? AND ?
          AND c.estado = 'atendida'
          AND c.precio_final IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM caja_movimientos cm WHERE cm.cita_id = c.id)
        GROUP BY c.fecha
        ORDER BY c.fecha`
    )
    .all(desde, hasta);

  return {
    desde,
    hasta,
    total_ingresos: dias.reduce((a, d) => a + d.ingresos, 0),
    total_egresos: dias.reduce((a, d) => a + d.egresos, 0),
    neto: dias.reduce((a, d) => a + d.neto, 0),
    dias,
    sin_cargar: sinCargar,
  };
}

// ── Comisiones ──────────────────────────────────────────────

export interface CitaDeComision {
  cita_id: number;
  fecha: string;
  hora_inicio: string;
  servicio: string | null;
  cliente: string | null;
  precio_final: number;
  comision: number;
}

/**
 * Las citas que componen la comisión de una persona en un rango.
 *
 * La comisión de cada cita se calcula con la MISMA regla que el resumen, y el
 * total se arma igual que allá: en porcentaje se suma primero y se redondea al
 * final. Si se redondeara cita por cita y después se sumara, los centavos no
 * cerrarían y el detalle mostraría un número distinto al que se paga.
 */
export function getDetalleComision(
  profesionalId: number,
  desde: string,
  hasta: string
): { citas: CitaDeComision[]; total_facturado: number; total_comision: number } {
  const db = getDb();

  const cfg = db
    .prepare<number, { tipo: string; valor: number }>(
      "SELECT tipo, valor FROM comisiones_config WHERE profesional_id = ?"
    )
    .get(profesionalId);
  const tipo = cfg?.tipo ?? "porcentaje";
  const valor = cfg?.valor ?? 0;

  const filas = db
    .prepare<[number, string, string], Omit<CitaDeComision, "comision">>(
      `SELECT c.id AS cita_id, c.fecha, c.hora_inicio,
              s.nombre AS servicio, cl.nombre AS cliente,
              COALESCE(c.precio_final, 0) AS precio_final
         FROM citas c
         LEFT JOIN servicios s  ON s.id  = c.servicio_id
         LEFT JOIN clientes  cl ON cl.id = c.cliente_id
        WHERE c.profesional_id = ?
          AND c.estado = 'atendida'
          AND c.fecha BETWEEN ? AND ?
        ORDER BY c.fecha, c.hora_inicio`
    )
    .all(profesionalId, desde, hasta);

  const citas: CitaDeComision[] = filas.map((f) => ({
    ...f,
    comision: tipo === "monto_fijo" ? valor : (f.precio_final * valor) / 100,
  }));

  const totalFacturado = citas.reduce((a, c) => a + c.precio_final, 0);
  const totalComision =
    tipo === "monto_fijo"
      ? citas.length * valor
      : Math.round(((totalFacturado * valor) / 100) * 100) / 100;

  return { citas, total_facturado: totalFacturado, total_comision: totalComision };
}

// ── Métricas ─────────────────────────────────────────────────

export interface Comparado {
  valor: number;
  /** Mismo cálculo sobre la ventana inmediatamente anterior, del mismo largo. */
  anterior: number;
}

export interface MetricsResult {
  /** Rango efectivamente usado, ya resuelto a fechas. */
  rango: { desde: string; hasta: string; dias: number };
  /** Ventana anterior del mismo largo, contra la que se compara. */
  rangoAnterior: { desde: string; hasta: string };

  turnos: Comparado;
  facturacion: Comparado;
  ticketPromedio: Comparado;
  /** Cancelados + no-show. Un no-show cuesta lo mismo que una cancelación tardía. */
  perdidos: Comparado;
  clientesNuevos: Comparado;
  /** Stock, no flujo: confirmados de hoy en adelante. NO depende del rango. */
  proximos: number;

  estados: { confirmada: number; atendida: number; cancelada: number; no_show: number };
  origen: { web: number; manual: number; bot: number };
  topServicios: Array<{ servicio: string; count: number }>;
  porProfesional: Array<{ profesional: string; turnos: number; facturacion: number }>;
  porFranja: Array<{ hora: number; count: number }>;
  citasPorDia: Array<{ fecha: string; count: number }>;
}

/** Suma n días a una fecha "YYYY-MM-DD" sin pasar por el reloj local. */
function sumarDias(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T12:00:00Z`);
  const b = Date.parse(`${hasta}T12:00:00Z`);
  return Math.round((b - a) / 86400000) + 1;
}

/**
 * Métricas del negocio para un rango de fechas.
 *
 * Las de bot (contactos, mensajes, conversión, atención manual) se fueron: la
 * estructura del bot está heredada de Bandito y apagada, así que esas cuatro
 * tarjetas mostraban cero y el gráfico de mensajes salía vacío. El código del
 * bot sigue entero en `lib/baileys` y `buildSystemPrompt()` — lo único que se
 * sacó es el cálculo de métricas que acá no aplican.
 *
 * Casi todo se mide dos veces: una sobre el rango pedido y otra sobre la
 * ventana inmediatamente anterior del mismo largo. "12 turnos" no dice nada;
 * "12 turnos contra 9" sí.
 *
 * `proximos` es la excepción a propósito: es un stock ("cuántos turnos tengo
 * de acá en adelante"), no un flujo, así que no se filtra por rango.
 */
export function getMetrics(desdeArg?: string, hastaArg?: string): MetricsResult {
  const db = getDb();
  const hoy = hoyEnArgentina();

  const hasta = hastaArg ?? hoy;
  const desde = desdeArg ?? sumarDias(hasta, -29);
  const dias = Math.max(1, diasEntre(desde, hasta));
  const antHasta = sumarDias(desde, -1);
  const antDesde = sumarDias(antHasta, -(dias - 1));

  /** Corre una query contra el rango y contra el anterior. */
  const comparar = (sql: string): Comparado => {
    const st = db.prepare<[string, string], { v: number | null }>(sql);
    return {
      valor: st.get(desde, hasta)!.v ?? 0,
      anterior: st.get(antDesde, antHasta)!.v ?? 0,
    };
  };

  const turnos = comparar(
    "SELECT COUNT(*) as v FROM citas WHERE fecha BETWEEN ? AND ?"
  );
  const facturacion = comparar(
    "SELECT SUM(precio_final) as v FROM citas WHERE estado = 'atendida' AND fecha BETWEEN ? AND ?"
  );
  const ticketPromedio = comparar(
    "SELECT AVG(precio_final) as v FROM citas WHERE estado = 'atendida' AND precio_final IS NOT NULL AND fecha BETWEEN ? AND ?"
  );
  const perdidos = comparar(
    "SELECT COUNT(*) as v FROM citas WHERE estado IN ('cancelada','no_show') AND fecha BETWEEN ? AND ?"
  );
  // Cliente nuevo = su primera cita cae dentro del rango. Se mira la primera
  // cita y no clientes.created_at porque un cliente se puede cargar a mano
  // mucho antes de que venga por primera vez.
  const clientesNuevos = comparar(
    `SELECT COUNT(*) as v FROM (
       SELECT cliente_id, MIN(fecha) AS primera
         FROM citas WHERE cliente_id IS NOT NULL
        GROUP BY cliente_id
     ) WHERE primera BETWEEN ? AND ?`
  );

  const proximos = db.prepare<string, { c: number }>(
    "SELECT COUNT(*) as c FROM citas WHERE estado = 'confirmada' AND fecha >= ?"
  ).get(hoy)!.c;

  const estadoRows = db.prepare<[string, string], { estado: string; count: number }>(
    "SELECT estado, COUNT(*) as count FROM citas WHERE fecha BETWEEN ? AND ? GROUP BY estado"
  ).all(desde, hasta);
  const estadoMap: Record<string, number> = Object.fromEntries(estadoRows.map((r) => [r.estado, r.count]));

  const origenRows = db.prepare<[string, string], { origen: string; count: number }>(
    "SELECT origen, COUNT(*) as count FROM citas WHERE fecha BETWEEN ? AND ? GROUP BY origen"
  ).all(desde, hasta);
  const origenMap: Record<string, number> = Object.fromEntries(origenRows.map((r) => [r.origen, r.count]));

  const topServicios = db.prepare<[string, string], { servicio: string; count: number }>(
    `SELECT s.nombre AS servicio, COUNT(*) as count
       FROM citas c JOIN servicios s ON s.id = c.servicio_id
      WHERE c.fecha BETWEEN ? AND ?
      GROUP BY s.id ORDER BY count DESC LIMIT 6`
  ).all(desde, hasta);

  const porProfesional = db.prepare<[string, string], { profesional: string; turnos: number; facturacion: number | null }>(
    `SELECT p.nombre AS profesional,
            COUNT(*) AS turnos,
            SUM(CASE WHEN c.estado = 'atendida' THEN c.precio_final ELSE 0 END) AS facturacion
       FROM citas c JOIN profesionales p ON p.id = c.profesional_id
      WHERE c.fecha BETWEEN ? AND ?
      GROUP BY p.id ORDER BY turnos DESC`
  ).all(desde, hasta).map((r) => ({ ...r, facturacion: r.facturacion ?? 0 }));

  // Por hora de arranque. Se agrupa por la hora entera: media hora es demasiado
  // fino para decidir a quien poner a atender.
  const porFranja = db.prepare<[string, string], { hora: number; count: number }>(
    `SELECT CAST(substr(hora_inicio, 1, 2) AS INTEGER) AS hora, COUNT(*) AS count
       FROM citas WHERE fecha BETWEEN ? AND ?
      GROUP BY hora ORDER BY hora`
  ).all(desde, hasta);

  const citasPorDia = db.prepare<[string, string], { fecha: string; count: number }>(
    "SELECT fecha, COUNT(*) as count FROM citas WHERE fecha BETWEEN ? AND ? GROUP BY fecha ORDER BY fecha"
  ).all(desde, hasta);

  return {
    rango: { desde, hasta, dias },
    rangoAnterior: { desde: antDesde, hasta: antHasta },
    turnos,
    facturacion,
    ticketPromedio,
    perdidos,
    clientesNuevos,
    proximos,
    estados: {
      confirmada: estadoMap.confirmada ?? 0,
      atendida: estadoMap.atendida ?? 0,
      cancelada: estadoMap.cancelada ?? 0,
      no_show: estadoMap.no_show ?? 0,
    },
    origen: {
      web: origenMap.web ?? 0,
      manual: origenMap.manual ?? 0,
      bot: origenMap.bot ?? 0,
    },
    topServicios,
    porProfesional,
    porFranja,
    citasPorDia,
  };
}
