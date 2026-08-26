// ---------------------------------------------------------------------------
// Storing an API key in a browser, honestly.
//
// WHAT CANNOT BE DONE. There is no way to make a key held by a web page secret
// from the person using that browser, or from software running as them. This
// site is a static export with no backend and no session — there is nowhere to
// put a key that the page itself cannot read, and anything the page can read,
// the browser's devtools can read too. Any claim otherwise would be theatre.
//
// WHAT CAN BE DONE, and is worth doing: protect the key AT REST, so that a key
// saved on Monday is not sitting in plaintext on the disk on Friday, readable
// by anyone who opens the browser profile or another tab's devtools. That is a
// real and common threat, and passphrase encryption genuinely addresses it.
//
// So three modes, and the UI states plainly what each one buys:
//
//   session    Held in memory for this tab only. Nothing is written anywhere.
//              Safest; costs you a retype each visit.
//   local      Written to localStorage in the clear. Convenient, and readable
//              by anything with access to this browser profile.
//   encrypted  Written to localStorage as AES-GCM ciphertext under a key
//              derived from your passphrase. Unreadable without it — including
//              by this page, until you unlock. Costs a passphrase each visit.
//
// One caveat the UI repeats, because it surprises people: localStorage is
// scoped to the ORIGIN, not the path. Every page published under the same
// github.io account shares this storage.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "privacy-law-monitor.apikey.v1";

// OWASP's current floor for PBKDF2-HMAC-SHA256. High enough to make an offline
// guess expensive, low enough that unlocking feels like a click.
const PBKDF2_ITERATIONS = 310000;

export const STORAGE_MODES = {
  session: {
    id: "session",
    label: "Don't save",
    detail: "Held in this tab only, never written to disk. You retype it each visit.",
  },
  local: {
    id: "local",
    label: "Save in this browser",
    detail:
      "Written to this browser's storage in the clear. Anyone with access to this browser profile — or devtools — can read it.",
  },
  encrypted: {
    id: "encrypted",
    label: "Save encrypted",
    detail:
      "Written to this browser's storage as ciphertext under a passphrase you choose. Unreadable without it. You enter the passphrase once each visit.",
  },
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function deriveAesKey(passphrase, salt) {
  const material = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt a secret under a passphrase. Salt and IV are fresh every time. */
export async function encryptSecret(secret, passphrase) {
  if (!secret) throw new Error("nothing to encrypt");
  if (!passphrase) throw new Error("a passphrase is required");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(secret));
  return { v: 1, salt: toB64(salt), iv: toB64(iv), ct: toB64(new Uint8Array(ct)) };
}

/**
 * Decrypt. A wrong passphrase fails here rather than returning garbage —
 * AES-GCM authenticates, so tampering and bad passphrases both throw.
 */
export async function decryptSecret(blob, passphrase) {
  if (!blob?.ct) throw new Error("nothing stored");
  const key = await deriveAesKey(passphrase, fromB64(blob.salt));
  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(blob.iv) },
      key,
      fromB64(blob.ct),
    );
    return dec.decode(pt);
  } catch {
    throw new Error("wrong passphrase");
  }
}

// ---- persistence ---------------------------------------------------------
// Every accessor is guarded: storage throws outright in some privacy modes,
// and a checker that cannot run because saving a key failed would be a poor
// trade.

function readRaw() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

/** What is on disk, without decrypting: enough to render the right prompt. */
export function storedKeyInfo() {
  const raw = readRaw();
  if (!raw) return { mode: "session", provider: null, model: null, hasStored: false };
  return {
    mode: raw.mode ?? "session",
    provider: raw.provider ?? null,
    model: raw.model ?? null,
    hasStored: Boolean(raw.mode === "local" ? raw.key : raw.blob),
  };
}

/** Plaintext key, for mode "local" only. Encrypted keys need unlockStoredKey. */
export function readPlainKey() {
  const raw = readRaw();
  return raw?.mode === "local" && raw.key ? raw.key : null;
}

export async function unlockStoredKey(passphrase) {
  const raw = readRaw();
  if (raw?.mode !== "encrypted" || !raw.blob) throw new Error("no encrypted key stored");
  return decryptSecret(raw.blob, passphrase);
}

/**
 * Persist per the chosen mode. Mode "session" writes nothing and clears
 * anything previously written, so changing your mind actually removes the key
 * rather than leaving a copy behind.
 */
export async function saveKey({ mode, apiKey, passphrase, provider, model }) {
  if (mode === "session") return clearStoredKey();
  try {
    const base = { mode, provider: provider ?? null, model: model ?? null };
    const record =
      mode === "encrypted"
        ? { ...base, blob: await encryptSecret(apiKey, passphrase) }
        : { ...base, key: apiKey };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch (e) {
    throw new Error(`could not save to this browser's storage (${e.message})`);
  }
}

export function clearStoredKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing stored, or storage unavailable — either way there is nothing to clear */
  }
  return true;
}
