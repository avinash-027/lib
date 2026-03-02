import { dbService } from '$lib/services/db.service';

const ENABLE_KEY = 'autoBackupEnabled';
const HANDLE_KEY = 'autoBackupDirHandle';
const FOLDER_NAME_KEY = 'autoBackupFolderName';
const LAST_REMINDER_KEY = 'lastBackupReminder';

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

/** Ask user for notification permission */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') return true;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/** Show backup reminder */
export function showBackupReminder() {
  if (!('Notification' in window)) return;

  if (Notification.permission !== 'granted') return;

  new Notification('📁 Backup Reminder', {
    body: 'Open the app to run your library backup.',
    icon: '/icon-192.png' // optional (PWA icon)
  });

  localStorage.setItem(LAST_REMINDER_KEY, Date.now().toString());
}

export function checkBackupReminder() {
  if (localStorage.getItem(ENABLE_KEY) !== 'true') return;

  const lastReminder = Number(localStorage.getItem(LAST_REMINDER_KEY) || 0);
  const now = Date.now();

  if (now - lastReminder > TWELVE_HOURS) {
    showBackupReminder();
  }
}

let timeoutId: number | null = null;

/** Enable auto backup */
export async function enableAutoBackup() {
  try {
    const dirHandle = await (window as any).showDirectoryPicker();
  } catch (err) {
    console.error('Failed to open directory picker', err);
    alert('Cannot open folder in this browser. Try Edge or Chrome.');
  }
  
  // Verify permission
  const options = { mode: 'readwrite' };
  if ((await dirHandle.queryPermission(options)) !== 'granted') {
    await dirHandle.requestPermission(options);
  }

  // SAVE TO INDEXEDDB (Not localStorage!)
  const tx = (await dbService.getDB()).transaction('settings', 'readwrite');
  await tx.objectStore('settings').put(dirHandle, 'backupDirHandle');
  await tx.objectStore('settings').put(dirHandle.name, 'backupFolderName');
  await tx.done;

  localStorage.setItem('autoBackupEnabled', 'true');
  scheduleNextBackup(dirHandle);
  await runBackup(dirHandle); 
}

/** Disable auto backup */
export function disableAutoBackup() {
  localStorage.removeItem('autoBackupEnabled');
  localStorage.removeItem('autoBackupDirHandle');
  localStorage.removeItem('autoBackupFolderName');
  if (timeoutId) clearTimeout(timeoutId);
}

/** Restore on app reload */
export async function restoreAutoBackup() {
  if (localStorage.getItem('autoBackupEnabled') !== 'true') return;

  // READ FROM INDEXEDDB
  const db = await dbService.getDB();
  const dirHandle = await db.get('settings', 'backupDirHandle');

  if (dirHandle) {
    // Browsers require a "user gesture" to re-activate the handle 
    // but often it works automatically if the user previously granted it.
    scheduleNextBackup(dirHandle);
  }
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

// overwritten every time
/** Schedule next backup (runs at 12:00 AM and 12:00 PM) */
function scheduleNextBackup(dirHandle: any) {
  if (timeoutId) clearTimeout(timeoutId);

  const now = new Date();
  
  // Create 12:00 PM candidate
  const noon = new Date();
  noon.setHours(12, 0, 0, 0);

  // Create 12:00 AM (Midnight) candidate
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);

  let nextTarget: Date;

  if (now < noon) {
    // It's morning, next backup is Noon today
    nextTarget = noon;
  } else {
    // It's afternoon/night, next backup is Midnight
    nextTarget = midnight;
  }

  const delay = nextTarget.getTime() - now.getTime();

  timeoutId = window.setTimeout(async () => {
    // Re-verify permission before running
    if ((await dirHandle.queryPermission({ mode: 'readwrite' })) === 'granted') {
      await runBackup(dirHandle);
    }
    scheduleNextBackup(dirHandle); // Repeat
  }, delay);
}
