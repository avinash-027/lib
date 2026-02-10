import { dbService } from '$lib/services/db.service';

const ENABLE_KEY = 'autoBackupEnabled';
const HANDLE_KEY = 'autoBackupDirHandle';
const FOLDER_NAME_KEY = 'autoBackupFolderName';

let timeoutId: number | null = null;

/** Enable auto backup */
  export async function enableAutoBackup() {
  const dirHandle = await (window as any).showDirectoryPicker();
  await dirHandle.requestPermission({ mode: 'readwrite' });

  localStorage.setItem('autoBackupEnabled', 'true');
  localStorage.setItem('autoBackupFolderName', dirHandle.name);
  localStorage.setItem('autoBackupDirHandle', JSON.stringify(dirHandle));

  scheduleNextBackup(dirHandle);
  await runBackup(dirHandle); // immediate first backup
}

/** Disable auto backup */
export function disableAutoBackup() {
  localStorage.removeItem('autoBackupEnabled');
  localStorage.removeItem('autoBackupDirHandle');
  localStorage.removeItem('autoBackupFolderName');
  if (timeoutId) clearTimeout(timeoutId);
}

/** Restore on app reload */
export function restoreAutoBackup() {
  if (localStorage.getItem(ENABLE_KEY) !== 'true') return;
  const raw = localStorage.getItem(HANDLE_KEY);
  if (!raw) return;

  const dirHandle = JSON.parse(raw);
  scheduleNextBackup(dirHandle);
}

/** Run backup now */
async function runBackup(dirHandle: any) {
  const data = await dbService.exportToJSON();

  const fileHandle = await dirHandle.getFileHandle(
    'lib-autobackup.json',
    { create: true }
  );

  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();

  console.log('✅ Auto backup saved at', new Date().toLocaleString());
}

// overwritten every night at 12:00
/** Schedule next 12:00 AM backup */
function scheduleNextBackup(dirHandle: any) {
  if (timeoutId) clearTimeout(timeoutId);

  const now = new Date();
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 0, 0, 0); // tonight 12:00

  const delay = nextMidnight.getTime() - now.getTime();

  timeoutId = window.setTimeout(async () => {
    await runBackup(dirHandle);
    scheduleNextBackup(dirHandle); // repeat every 24h
  }, delay);
}
