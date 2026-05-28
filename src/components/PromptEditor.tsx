"use client";
import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import type { PromptTemplate, ApiResponse } from "@/types";

export default function PromptEditor() {
  const { t, locale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [activeLang, setActiveLang] = useState<"zh" | "en">("zh");
  const [template, setTemplate] = useState("");
  const [originalTemplate, setOriginalTemplate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const fetchTemplate = useCallback(async (lang: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prompt-template?lang=${lang}`);
      const json = (await res.json()) as ApiResponse<PromptTemplate>;
      if (json.success) {
        setTemplate(json.data.template);
        setOriginalTemplate(json.data.template);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveLang(locale === "en" ? "en" : "zh");
      fetchTemplate(locale === "en" ? "en" : "zh");
    }
  }, [isOpen, locale, fetchTemplate]);

  const handleLangChange = (lang: "zh" | "en") => {
    setActiveLang(lang);
    fetchTemplate(lang);
    setMessage("");
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/prompt-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: activeLang, template }),
      });
      const json = (await res.json()) as ApiResponse<{ updated: boolean }>;
      if (json.success) {
        setMessage("Saved successfully");
        setOriginalTemplate(template);
      } else {
        setMessage("Save failed");
      }
    } catch {
      setMessage("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setConfirmReset(false);
    try {
      const res = await fetch("/api/prompt-template/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: activeLang }),
      });
      const json = (await res.json()) as ApiResponse<PromptTemplate>;
      if (json.success) {
        setTemplate(json.data.template);
        setOriginalTemplate(json.data.template);
        setMessage("Reset to default");
      }
    } catch {
      setMessage("Reset failed");
    }
  };

  return (
    <div className="prompt-editor">
      <div className="prompt-editor-header" onClick={() => setIsOpen(!isOpen)}>
        <span className={`expand-arrow ${isOpen ? "open" : ""}`}>&#9660;</span>
        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{t.advancedSettings}</span>
        {isOpen && (
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "auto" }}>
            {t.editPrompt}
          </span>
        )}
      </div>

      {isOpen && (
        <div className="prompt-editor-body">
          <div className="lang-pills">
            {(["zh", "en"] as const).map((lang) => (
              <button
                key={lang}
                className={`lang-pill ${activeLang === lang ? "active" : ""}`}
                onClick={(e) => { e.stopPropagation(); handleLangChange(lang); }}
              >
                {lang === "zh" ? "简体中文" : "English"}
              </button>
            ))}
          </div>

          {activeLang === "en" && (
            <div className="warning-box">{t.noteEnJa}</div>
          )}

          {loading ? (
            <div className="text-center" style={{ padding: "40px 0", color: "var(--text-muted)" }}>
              Loading...
            </div>
          ) : (
            <>
              <textarea
                className="form-textarea"
                rows={20}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", lineHeight: 1.65 }}
              />
              <div className="prompt-editor-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setConfirmReset(true)}>
                  {t.resetDefault}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={saving || template === originalTemplate}
                >
                  {saving ? "Saving..." : t.save}
                </button>
              </div>
              {message && (
                <div style={{ fontSize: "0.78rem", color: "var(--green)", marginTop: 8, textAlign: "right" }}>
                  {message}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {confirmReset && (
        <div className="confirm-overlay" onClick={() => setConfirmReset(false)}>
          <div className="confirm-box">
            <p>{t.promptResetConfirm}</p>
            <div className="confirm-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleReset}>
                {t.resetDefault}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
