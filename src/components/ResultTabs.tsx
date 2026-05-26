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
}

type TabKey = "blocks" | "toml" | "raw";

export default function ResultTabs({ result, error, errorCode, streamingText, onRetry }: ResultTabsProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>("blocks");
  const [copiedToml, setCopiedToml] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "blocks", label: t.configBlocks },
    { key: "toml", label: t.fullToml },
    { key: "raw", label: t.rawOutput },
  ];

  const handleCopyToml = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToml(true);
      setTimeout(() => setCopiedToml(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedToml(true);
      setTimeout(() => setCopiedToml(false), 2000);
    }
  }, []);

  const handleCopyAll = useCallback(async () => {
    if (!result) return;
    const allText = result.blocks.map((b) => b.toml).join("\n\n");
    try {
      await navigator.clipboard.writeText(allText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = allText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  }, [result]);

  // Error state
  if (error && !result) {
    return (
      <div className="error-card">
        <div className="error-title">Error</div>
        {errorCode && <div className="error-code">Code: {errorCode}</div>}
        <div className="error-message">{error}</div>
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          {t.retry}
        </button>
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

  // No result yet
  if (!result) return null;

  return (
    <div>
      <div className="tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content" key={activeTab}>
        {activeTab === "blocks" && (
          <div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 16 }}>
              {t.configNote}
            </p>
            {result.blocks.map((block) => (
              <ConfigBlockCard key={block.id} block={block} />
            ))}
          </div>
        )}

        {activeTab === "toml" && (
          <div className="toml-pre">
            <button
              className={`copy-btn-toml ${copiedToml ? "copied" : ""}`}
              onClick={() => handleCopyToml(result.toml)}
            >
              {copiedToml ? t.copied : t.copy}
            </button>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{result.toml}</pre>
          </div>
        )}

        {activeTab === "raw" && (
          <div className="card">
            <pre style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "0.8rem",
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
            }}>
              {result.rawResponse}
            </pre>
          </div>
        )}
      </div>

      <div className="result-bottom-bar">
        <button className="btn btn-secondary btn-sm" onClick={handleCopyAll}>
          {copiedAll ? t.copied : t.copyAll}
        </button>
        <a
          className="btn btn-secondary btn-sm"
          href={`/api/export/toml?historyId=${result.id}`}
          download
          style={{ textDecoration: "none" }}
        >
          {t.exportToml}
        </a>
        {error && result && (
          <span style={{ fontSize: "0.78rem", color: "var(--red)", marginLeft: "auto" }}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
