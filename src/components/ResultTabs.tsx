"use client";
import { useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import type { GenerateResponse } from "@/types";
import ConfigBlockCard from "./ConfigBlockCard";

interface ResultTabsProps {
  result: GenerateResponse | null;
  error: string | null;
  errorCode: string | null;
  streamingText: string;
  onRetry: () => void;
  activeTab: string;
  showBlocks: boolean;
  outerOnly?: boolean;
}

export default function ResultTabs({ result, error, errorCode, streamingText, onRetry, activeTab, showBlocks, outerOnly }: ResultTabsProps) {
  const { t } = useI18n();
  const [copiedToml, setCopiedToml] = useState(false);

  const handleCopyToml = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToml(true);
      setTimeout(() => setCopiedToml(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedToml(true);
      setTimeout(() => setCopiedToml(false), 2000);
    }
  }, []);

  // Outer-only mode: just render config blocks
  if (outerOnly) {
    if (!result) return null;
    return (
      <div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 14 }}>{t.configNote}</p>
        {result.blocks.map((block) => (
          <ConfigBlockCard key={block.id} block={block} />
        ))}
      </div>
    );
  }

  // Error state
  if (error && !result) {
    return (
      <div className="error-card">
        <div className="error-title">Error</div>
        {errorCode && <div className="error-code">Code: {errorCode}</div>}
        <div className="error-message">{error}</div>
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>{t.retry}</button>
      </div>
    );
  }

  // Streaming state
  if (streamingText && !result) {
    return (
      <div className="streaming-output">
        <pre className="pulsing-cursor">{streamingText}</pre>
      </div>
    );
  }

  // No result
  if (!result) return null;

  // Tab content
  return (
    <div style={{ flex: 1 }}>
      {activeTab === "blocks" && showBlocks && (
        <div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 14 }}>{t.configNote}</p>
          {result.blocks.map((block) => (
            <ConfigBlockCard key={block.id} block={block} />
          ))}
        </div>
      )}

      {activeTab === "blocks" && !showBlocks && (
        <div className="empty-state" style={{ minHeight: "auto", padding: "10px 0" }}>
          <div className="empty-desc" style={{ color: "var(--text-muted)" }}>
            {t.configNote}
          </div>
        </div>
      )}

      {activeTab === "toml" && (
        <div className="toml-pre">
          <button className={`copy-btn-toml ${copiedToml ? "copied" : ""}`} onClick={() => handleCopyToml(result.toml)}>
            {copiedToml ? t.copied : t.copy}
          </button>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{result.toml}</pre>
        </div>
      )}

      {activeTab === "raw" && (
        <pre style={{
          whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.8rem",
          lineHeight: 1.7, color: "var(--text-secondary)", fontFamily: "var(--font-mono)",
          padding: "14px 0",
        }}>
          {result.rawResponse}
        </pre>
      )}
    </div>
  );
}
