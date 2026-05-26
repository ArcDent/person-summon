"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { GenerateRequest } from "@/types";
import ModelSelector from "./ModelSelector";

interface GeneratorFormProps {
  onGenerate: (data: GenerateRequest) => void;
  disabled: boolean;
}

export default function GeneratorForm({ onGenerate, disabled }: GeneratorFormProps) {
  const { t } = useI18n();

  const [providerId, setProviderId] = useState("");
  const [modelId, setModelId] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [targetScene, setTargetScene] = useState<"both" | "group" | "private">("both");
  const [language, setLanguage] = useState("简体中文");
  const [extraRequirements, setExtraRequirements] = useState("");
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(1800);

  const handleSubmit = () => {
    if (!sourceText.trim() || !providerId || !modelId) return;
    onGenerate({
      providerId,
      modelId,
      sourceText: sourceText.trim(),
      targetScene,
      language,
      extraRequirements: extraRequirements.trim(),
      temperature,
      maxTokens,
      stream: true,
    });
  };

  const canSubmit = sourceText.trim().length > 0 && providerId && modelId && !disabled;

  return (
    <div>
      <ModelSelector
        onChange={(sel) => {
          setProviderId(sel.providerId);
          setModelId(sel.modelId);
        }}
      />

      <div className="card">
        <div className="form-group">
          <label className="form-label">{t.sourceText}</label>
          <textarea
            className="form-textarea"
            rows={6}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            maxLength={20000}
            placeholder="输入角色描述文本，支持 markdown……"
          />
          <div className={`char-counter ${sourceText.length > 18000 ? "warn" : ""}`}>
            {sourceText.length} / 20000
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t.targetScene}</label>
            <select
              className="form-select"
              value={targetScene}
              onChange={(e) => setTargetScene(e.target.value as "both" | "group" | "private")}
            >
              <option value="both">{t.both}</option>
              <option value="group">{t.group}</option>
              <option value="private">{t.private}</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t.language}</label>
            <select
              className="form-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="简体中文">简体中文</option>
              <option value="English">English</option>
              <option value="日本語">日本語</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t.extraRequirements}</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={extraRequirements}
            onChange={(e) => setExtraRequirements(e.target.value)}
            maxLength={4000}
            placeholder="额外生成要求（可选）"
          />
          <div className={`char-counter ${extraRequirements.length > 3500 ? "warn" : ""}`}>
            {extraRequirements.length} / 4000
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t.temperature}</label>
            <div className="temp-slider-group">
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
              <span className="temp-value">{temperature.toFixed(1)}</span>
            </div>
          </div>
          <div className="form-group" style={{ flex: "0 0 auto" }}>
            <label className="form-label">{t.maxTokens}</label>
            <input
              className="form-input token-input"
              type="number"
              min={256}
              max={8192}
              step={256}
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 256)}
            />
          </div>
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={!canSubmit}>
          {disabled ? (
            <>
              <span className="spinner" /> {t.generating}
            </>
          ) : (
            t.generate
          )}
        </button>
      </div>
    </div>
  );
}
