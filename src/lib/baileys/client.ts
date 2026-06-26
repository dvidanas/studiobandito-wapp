import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "node:path";
import fs from "node:fs";
import pino from "pino";

export type BaileysStatus = "starting" | "connecting" | "qr_pending" | "open" | "closed";

interface BaileysState {
  status: BaileysStatus;
  qr: string | null;
  phone: string | null;
  socket: WASocket | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __baileysState: BaileysState | undefined;
  // eslint-disable-next-line no-var
  var __baileysStarted: boolean | undefined;
}

function getState(): BaileysState {
  if (!global.__baileysState) {
    global.__baileysState = { status: "starting", qr: null, phone: null, socket: null };
  }
  return global.__baileysState;
}

export function getBaileysStatus(): { status: BaileysStatus; qr: string | null; phone: string | null } {
  const s = getState();
  return { status: s.status, qr: s.qr, phone: s.phone };
}

export async function sendTextMessage(
  phone: string,
  text: string
): Promise<{ wa_message_id: string }> {
  const state = getState();
  if (!state.socket || state.status !== "open") {
    throw new Error(`WhatsApp no está conectado (estado: ${state.status})`);
  }
  const jid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
  const result = await state.socket.sendMessage(jid, { text });
  return { wa_message_id: result?.key?.id ?? "" };
}

export async function markMessageRead(phone: string, waId: string): Promise<void> {
  const state = getState();
  if (!state.socket || state.status !== "open") return;
  const jid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
  try {
    await state.socket.readMessages([{ remoteJid: jid, id: waId, fromMe: false }]);
  } catch {
    // ignorar errores de read receipt
  }
}

export async function startBaileys(): Promise<void> {
  if (global.__baileysStarted) return;
  global.__baileysStarted = true;

  const sessionDir =
    process.env.BAILEYS_SESSION_PATH ??
    path.join(process.cwd(), "data", "baileys_session");
  fs.mkdirSync(sessionDir, { recursive: true });

  const logger = pino({ level: "silent" });

  async function connect() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: ["Studio Bandito", "Chrome", "1.0"],
      syncFullHistory: false,
    });

    getState().socket = socket;
    getState().status = "connecting";

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("[baileys] QR disponible — escaneá con WhatsApp");
        getState().qr = qr;
        getState().status = "qr_pending";
      }

      if (connection === "open") {
        getState().status = "open";
        getState().qr = null;
        const userId = socket.user?.id ?? null;
        getState().phone = userId ? userId.split(":")[0].split("@")[0] : null;
        console.log(`[baileys] ✅ conectado como +${getState().phone}`);
      }

      if (connection === "close") {
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        console.log(`[baileys] conexión cerrada (code ${code}) — loggedOut=${loggedOut}`);
        getState().status = "closed";
        getState().socket = null;
        if (!loggedOut) {
          global.__baileysStarted = false;
          setTimeout(() => startBaileys().catch(console.error), 5000);
        } else {
          try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch {}
          fs.mkdirSync(sessionDir, { recursive: true });
          global.__baileysStarted = false;
          setTimeout(() => startBaileys().catch(console.error), 3000);
        }
      }
    });

    socket.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      const { handleBaileysMessage } = await import("./handler");
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        if (!msg.message) continue;
        await handleBaileysMessage(msg).catch((err) =>
          console.error("[baileys] error procesando mensaje:", err)
        );
      }
    });
  }

  connect().catch((err) => {
    console.error("[baileys] error al iniciar:", err);
    global.__baileysStarted = false;
  });
}
