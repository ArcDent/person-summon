"use client";
import { useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import type { ConfigBlock } from "@/types";

interface ConfigBlockCardProps {
  block: ConfigBlock;
}

export default function ConfigBlockCard({ block }: ConfigBlockCardProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const accentColor = block.section === "personality" ? "var(--amber)" : "var(--cyan)";
  const accentClass = block.section === "personality" ? "amber" : "cyan";

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(block.toml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = block.toml;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [block.toml]);

  return (
    <div className={`config-block-card ${accentClass}`}>
      <button
        className={`copy-btn ${copied ? "copied" : ""}`}
        onClick={handleCopy}
        style={copied ? {} : { borderColor: accentColor, color: accentColor }}
      >
        {copied ? t.copied : t.copy}
      </button>
      <div className="block-title">{block.title}</div>
      <div className="block-id">{block.id}</div>
      {block.description && (
        <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: 8 }}>{block.description}</p>
      )}
      <pre>{block.toml}</pre>
    </div>
  );
}
