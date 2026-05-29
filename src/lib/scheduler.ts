import { runFullBackup } from "./backup";

declare global {
  // eslint-disable-next-line no-var
  var __backupSchedulerStarted: boolean | undefined;
}

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const INITIAL_DELAY_MS = 2 * 60 * 1000; // 2 minutos tras arrancar

export function startBackupScheduler(): void {
  if (global.__backupSchedulerStarted) return;
  global.__backupSchedulerStarted = true;

  const doBackup = async () => {
    console.log("[scheduler] Iniciando backup automático…");
    const result = await runFullBackup();
    if (!result.ok) {
      console.error("[scheduler] Backup falló:", result.error);
    }
  };

  // Primer backup a los 2 minutos del arranque
  setTimeout(doBackup, INITIAL_DELAY_MS);

  // Luego cada 24 horas
  setInterval(doBackup, TWENTY_FOUR_HOURS);

  console.log("[scheduler] Backup automático activo (cada 24 h)");
}
