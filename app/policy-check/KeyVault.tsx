"use client";

import { useEffect, useState } from "react";
import { PROVIDERS, DEFAULT_PROVIDER } from "@/lib/policy-interpret.mjs";
import {
  STORAGE_MODES,
  saveKey,
  clearStoredKey,
  storedKeyInfo,
  readPlainKey,
  unlockStoredKey,
} from "@/lib/key-store.mjs";

type Provider = { id: string; label: string; note: string; defaultModel: string; keyPlaceholder: string };
type Mode = { id: string; label: string; detail: string };

const PROVS = PROVIDERS as Record<string, Provider>;
const MODES = STORAGE_MODES as Record<string, Mode>;

export type VaultState = { provider: string; model: string; apiKey: string };

/**
 * Key entry and storage.
 *
 * The honesty problem here is that "securely saved" is not something a static
 * web page can offer without qualification, and pretending otherwise would be
 * the worst outcome. So the three modes are presented with what each actually
 * buys, and the encrypted option is the default when saving — it is the only
 * one that protects the key at rest.
 */
export default function KeyVault({
  value,
  onChange,
}: {
  value: VaultState;
  onChange: (v: VaultState) => void;
}) {
  const [mode, setMode] = useState<string>("session");
  const [passphrase, setPassphrase] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [busy, setBusy] = useState(false);

  // What is already on disk decides what this panel should ask for: a
  // passphrase to unlock, or nothing at all.
  useEffect(() => {
    const info = storedKeyInfo();
    if (!info.hasStored) return;
    setMode(info.mode);
    if (info.provider) {
      onChange({
        provider: info.provider,
        model: info.model || PROVS[info.provider]?.defaultModel || "",
        apiKey: "",
      });
    }
    if (info.mode === "local") {
      const k = readPlainKey();
      if (k) {
        setStatus("Key loaded from this browser's storage.");
        onChange({
          provider: info.provider || DEFAULT_PROVIDER,
          model: info.model || PROVS[info.provider || DEFAULT_PROVIDER]?.defaultModel || "",
          apiKey: k,
        });
      }
    } else if (info.mode === "encrypted") {
      setNeedsUnlock(true);
    }
    // Runs once on mount; onChange identity is not part of the decision.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const provider = PROVS[value.provider] ?? PROVS[DEFAULT_PROVIDER];

  async function handleUnlock() {
    setBusy(true);
    setError(null);
    try {
      const key = await unlockStoredKey(passphrase);
      onChange({ ...value, apiKey: key });
      setNeedsUnlock(false);
      setPassphrase("");
      setStatus("Key unlocked for this visit.");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await saveKey({
        mode,
        apiKey: value.apiKey,
        passphrase,
        provider: value.provider,
        model: value.model,
      });
      setStatus(
        mode === "session"
          ? "Nothing saved — the key stays in this tab and is gone when you close it."
          : mode === "encrypted"
            ? "Saved, encrypted. You will need the passphrase next visit; there is no recovery if you lose it."
            : "Saved in this browser in the clear.",
      );
      if (mode === "encrypted") setPassphrase("");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  function handleForget() {
    clearStoredKey();
    onChange({ ...value, apiKey: "" });
    setMode("session");
    setPassphrase("");
    setNeedsUnlock(false);
    setStatus("Removed from this browser.");
  }

  if (needsUnlock) {
    return (
      <div className="vault">
        <div className="vault-row">
          <label htmlFor="passphrase">An encrypted key is saved in this browser</label>
          <div className="vault-inline">
            <input
              id="passphrase"
              type="password"
              className="text-input"
              placeholder="Passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              autoComplete="off"
            />
            <button className="bar-btn primary" onClick={handleUnlock} disabled={busy || !passphrase}>
              {busy ? "Unlocking…" : "Unlock"}
            </button>
            <button className="bar-btn" onClick={handleForget}>
              Forget it
            </button>
          </div>
        </div>
        {error && <div className="checker-error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="vault">
      <div className="vault-grid">
        <div className="vault-row">
          <label htmlFor="provider">Provider</label>
          <select
            id="provider"
            value={value.provider}
            onChange={(e) =>
              onChange({
                ...value,
                provider: e.target.value,
                model: PROVS[e.target.value]?.defaultModel ?? "",
              })
            }
          >
            {Object.values(PROVS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="vault-row">
          <label htmlFor="model">Model</label>
          <input
            id="model"
            className="text-input"
            value={value.model}
            onChange={(e) => onChange({ ...value, model: e.target.value })}
            spellCheck={false}
          />
        </div>

        <div className="vault-row vault-grow">
          <label htmlFor="apikey">API key</label>
          <input
            id="apikey"
            type="password"
            className="text-input"
            placeholder={provider.keyPlaceholder}
            value={value.apiKey}
            onChange={(e) => onChange({ ...value, apiKey: e.target.value })}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      <p className="vault-note">{provider.note}</p>

      <div className="vault-row">
        <label>Keep this key?</label>
        <div className="vault-modes">
          {Object.values(MODES).map((m) => (
            <label key={m.id} className={`vault-mode ${mode === m.id ? "on" : ""}`}>
              <input
                type="radio"
                name="storage-mode"
                value={m.id}
                checked={mode === m.id}
                onChange={() => setMode(m.id)}
              />
              <span>
                <strong>{m.label}</strong>
                <span className="vault-mode-detail">{m.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {mode === "encrypted" && (
        <div className="vault-row">
          <label htmlFor="newpass">Passphrase to encrypt it with</label>
          <input
            id="newpass"
            type="password"
            className="text-input"
            placeholder="Choose a passphrase — there is no recovery"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoComplete="new-password"
          />
        </div>
      )}

      <div className="vault-actions">
        <button
          className="bar-btn"
          onClick={handleSave}
          disabled={busy || !value.apiKey.trim() || (mode === "encrypted" && !passphrase)}
        >
          {busy ? "Working…" : mode === "session" ? "Don't save" : "Save key"}
        </button>
        {storedKeyInfo().hasStored && (
          <button className="bar-btn" onClick={handleForget}>
            Forget saved key
          </button>
        )}
        {status && <span className="vault-status">{status}</span>}
      </div>

      {error && <div className="checker-error">{error}</div>}

      <p className="vault-warning">
        <strong>What saving can and cannot protect.</strong> No web page can keep a key secret from
        its own browser — anything this page can read, devtools can read. Encrypting it with a
        passphrase does protect it <em>at rest</em>, so a key saved today is not sitting in
        plaintext on disk tomorrow. Note that browser storage is shared across every page on this
        domain, and revoking the key at the provider is always the real undo.
      </p>
    </div>
  );
}
