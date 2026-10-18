import React, { useEffect, useState } from "react";
import { useIpc } from "../hooks/useIpc";
import styles from "./SettingsPage.module.css";

interface Settings {
  llmProvider: "openai" | "gemini" | "cursor";
  openaiKey: string;
  geminiKey: string;
  cursorKey: string;
  jevKey: string;
  jevBaseUrl: string;
  feynmanPassThreshold: number;
  mergeRelatenessThreshold: number;
  conceptRetentionThreshold: number;
}

const PROVIDERS = [
  { id: "openai", label: "OpenAI (GPT-4o)" },
  { id: "gemini", label: "Google Gemini" },
  { id: "cursor", label: "Cursor API" },
] as const;

export function SettingsPage() {
  const { invoke } = useIpc();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    invoke<Settings>("get-settings").then((s) => s && setSettings(s));
  }, [invoke]);

  const save = async () => {
    if (!settings) return;
    await invoke("set-settings", settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!settings) return <div className={styles.loading}>Loading…</div>;

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s));

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>LLM Provider</h2>
        <div className={styles.radioGroup}>
          {PROVIDERS.map((p) => (
            <label key={p.id} className={styles.radioLabel}>
              <input
                type="radio"
                name="provider"
                value={p.id}
                checked={settings.llmProvider === p.id}
                onChange={() => update("llmProvider", p.id)}
              />
              {p.label}
            </label>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>API Keys</h2>

        <label className={styles.field}>
          <span>OpenAI API Key</span>
          <input
            type="password"
            value={settings.openaiKey}
            onChange={(e) => update("openaiKey", e.target.value)}
            placeholder="sk-…"
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span>Gemini API Key</span>
          <input
            type="password"
            value={settings.geminiKey}
            onChange={(e) => update("geminiKey", e.target.value)}
            placeholder="AIza…"
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span>Cursor API Key</span>
          <input
            type="password"
            value={settings.cursorKey}
            onChange={(e) => update("cursorKey", e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span>TypeSafe AI (Jev) Key</span>
          <input
            type="password"
            value={settings.jevKey}
            onChange={(e) => update("jevKey", e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span>Jev Base URL</span>
          <input
            type="text"
            value={settings.jevBaseUrl}
            onChange={(e) => update("jevBaseUrl", e.target.value)}
            className={styles.input}
          />
        </label>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Thresholds</h2>

        <label className={styles.field}>
          <span>
            Feynman Pass Threshold{" "}
            <span className={styles.hint}>({settings.feynmanPassThreshold})</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.feynmanPassThreshold}
            onChange={(e) =>
              update("feynmanPassThreshold", parseFloat(e.target.value))
            }
          />
        </label>

        <label className={styles.field}>
          <span>
            Merge Relatedness Threshold{" "}
            <span className={styles.hint}>({settings.mergeRelatenessThreshold})</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.mergeRelatenessThreshold}
            onChange={(e) =>
              update("mergeRelatenessThreshold", parseFloat(e.target.value))
            }
          />
        </label>

        <label className={styles.field}>
          <span>
            Concept Retention Threshold{" "}
            <span className={styles.hint}>({settings.conceptRetentionThreshold})</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.conceptRetentionThreshold}
            onChange={(e) =>
              update("conceptRetentionThreshold", parseFloat(e.target.value))
            }
          />
        </label>
      </section>

      <div className={styles.actions}>
        <button className={styles.saveBtn} onClick={save}>
          {saved ? "✓ Saved" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
