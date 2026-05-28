"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import type { GenerateRequest, GenerateResponse, HistoryItem } from "@/types";
import GeneratorForm from "@/components/GeneratorForm";
import ResultTabs from "@/components/ResultTabs";
import PromptEditor from "@/components/PromptEditor";
import HistoryPanel from "@/components/HistoryPanel";

type LayoutMode = "dual" | "single";

export default function HomePage() {
  const { t, locale, setLocale, theme, toggleTheme } = useI18n();

  const [layout, setLayout] = useState<LayoutMode>("dual");
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("blocks");
  const lastFormData = useRef<GenerateRequest | null>(null);

  const applyLayout = useCallback((mode: LayoutMode) => {
    if (mode === "dual") {
      document.body.classList.add("layout-dual");
      document.body.classList.remove("layout-single");
    } else {
      document.body.classList.add("layout-single");
      document.body.classList.remove("layout-dual");
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("layout") as LayoutMode;
    if (saved === "single") {
      setLayout("single");
      document.body.classList.add("layout-single");
    } else {
      document.body.classList.add("layout-dual");
    }
  }, []);

  const toggleLayout = () => {
    setLayout((prev) => {
      const next: LayoutMode = prev === "dual" ? "single" : "dual";
      localStorage.setItem("layout", next);
      applyLayout(next);
      return next;
    });
  };

  const handleRetry = useCallback(() => {
    setResult(null);
    setError(null);
    setErrorCode(null);
    setStreamingText("");
    setActiveTab("blocks");
    if (lastFormData.current) handleGenerate(lastFormData.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(async (formData: GenerateRequest) => {
    lastFormData.current = formData;
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setStreamingText("");
    setResult(null);
    setActiveTab("blocks");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        setError(errorJson?.error || `HTTP ${response.status}`);
        setErrorCode(errorJson?.code || "HTTP_ERROR");
        setLoading(false);
        return;
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ") && currentEvent) {
              const raw = line.slice(6);
              try {
                const json = JSON.parse(raw);
                if (currentEvent === "token") {
                  const token = typeof json?.text === "string" ? json.text : "";
                  setStreamingText((prev) => prev + token);
                } else if (currentEvent === "done") {
                  setResult(json as GenerateResponse);
                  setStreamingText("");
                  setLoading(false);
                } else if (currentEvent === "error") {
                  setError(typeof json?.error === "string" ? json.error : "Unknown error");
                  setErrorCode(typeof json?.code === "string" ? json.code : "STREAM_ERROR");
                  setLoading(false);
                }
              } catch {
                // skip
              }
              currentEvent = "";
            }
          }
        }
        if (loading) setLoading(false);
      } else {
        const json = await response.json();
        if (json.success && json.data) {
          setResult(json.data as GenerateResponse);
        } else {
          setError(json.error || "Unknown error");
          setErrorCode(json.code || "UNKNOWN");
        }
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setErrorCode("NETWORK_ERROR");
      setLoading(false);
    }
  }, []);

  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setResult(item.resultJson);
    setError(null);
    setErrorCode(null);
    setStreamingText("");
    setActiveTab("blocks");
    setHistoryOpen(false);
  }, []);

  const hasContent = !!(result || error || loading);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1>MaiPSummon</h1>
        <div className="header-actions">
          <div className="lang-switcher">
            {(["zh", "en", "ja"] as const).map((lang) => (
              <button
                key={lang}
                className={`lang-btn ${locale === lang ? "active" : ""}`}
                onClick={() => setLocale(lang)}
              >
                {lang === "zh" ? "中" : lang === "en" ? "EN" : "日"}
              </button>
            ))}
          </div>
          <button className="history-btn" onClick={() => setHistoryOpen(true)}>
            &#9776; {t.history}
          </button>
          <button className="layout-toggle-btn" onClick={toggleLayout} title={layout === "dual" ? t.layoutDual : t.layoutSingle}>
            {layout === "dual" ? "⊟" : "⊞"}
          </button>
          <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === "light" ? "切换暗色模式" : "切换亮色模式"}>
            {theme === "light" ? "☀" : "☾"}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Left Column: Input */}
        <div className="col-left">
          <div className="section-label">{t.sectionInput}</div>
          <div className="section-hint">{t.inputDesc}</div>

          <GeneratorForm onGenerate={handleGenerate} disabled={loading} />

          <div className="form-card">
            <PromptEditor />
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="col-right">
          <div className="result-card">
            <div className="result-header">
              <div>
                <h2>生成结果</h2>
                <div className="form-hint" style={{ marginBottom: 0 }}>{t.resultDesc}</div>
              </div>
              {hasContent && (
                <div className="result-actions">
                  <button className="btn-sm" onClick={() => navigator.clipboard.writeText(result?.toml || "")}>
                    {t.copyAll}
                  </button>
                  {result && (
                    <a className="btn-sm" href={`/api/export/toml?historyId=${result.id}`} download style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                      &#10515; {t.exportToml}
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="tabs-header">
              {(["blocks", "toml", "raw"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "blocks" ? t.configBlocks : tab === "toml" ? t.fullToml : t.rawOutput}
                </button>
              ))}
            </div>

            <div className="tab-content">
              {!hasContent && !loading ? (
                <div className="empty-state">
                  <div className="empty-icon">&#128220;</div>
                  <div className="empty-title">{t.waitingTitle}</div>
                  <div className="empty-desc">{t.waitingDesc}</div>
                </div>
              ) : (
                <ResultTabs
                  result={result}
                  error={error}
                  errorCode={errorCode}
                  streamingText={streamingText}
                  onRetry={handleRetry}
                  activeTab={activeTab}
                  showBlocks={layout === "single"}
                />
              )}
            </div>
          </div>

          {/* Config blocks OUTSIDE the card in dual mode */}
          {hasContent && layout === "dual" && activeTab === "blocks" && (
            <div className="results-outer">
              <ResultTabs
                result={result}
                error={error}
                errorCode={errorCode}
                streamingText={streamingText}
                onRetry={handleRetry}
                activeTab="blocks"
                showBlocks={true}
                outerOnly={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* History Panel */}
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={handleHistorySelect}
      />
    </div>
  );
}
