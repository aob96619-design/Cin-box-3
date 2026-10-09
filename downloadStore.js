const DB_NAME = "cinebox-offline-v1";
const STORE = "videos";
function openDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("Le stockage hors ligne n'est pas pris en charge par ce navigateur."));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Impossible d'ouvrir la bibliothèque de téléchargements."));
  });
}
export async function listDownloads() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => { db.close(); resolve(request.result.sort((a,b) => b.savedAt-a.savedAt)); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}
export async function saveDownload(item, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ id: String(item.id), title: item.title, type: item.type, year: item.year, poster: item.poster || "", mime: blob.type || "video/mp4", size: blob.size, savedAt: Date.now(), blob });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error("Le stockage est plein ou le téléchargement a échoué.")); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("Téléchargement annulé.")); };
  });
}
export async function getDownload(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => { const req = db.transaction(STORE, "readonly").objectStore(STORE).get(String(id)); req.onsuccess = () => { db.close(); resolve(req.result || null); }; req.onerror = () => { db.close(); reject(req.error); }; });
}
export async function removeDownload(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).delete(String(id)); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); }; });
}
export function formatSize(bytes=0) { if (bytes < 1024*1024) return `${Math.max(1,Math.round(bytes/1024))} Ko`; return `${(bytes/(1024*1024)).toFixed(1)} Mo`; }
