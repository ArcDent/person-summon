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
      {/* Model Card */}
      <div className="form-card">
        <label className="form-label">{t.model}</label>
        <div className="model-row">
          <div className="model-select-group">
            <ModelSelector
              onChange={(sel) => {
                setProviderId(sel.providerId);
                setModelId(sel.modelId);
              }}
            />
          </div>
          <div className="btn-row">
            <button className="gear-btn" onClick={(e) => { e.preventDefault(); }} title={t.editProvider}>&#9881;</button>
            <button className="btn-generate" onClick={handleSubmit} disabled={!canSubmit}>
              {disabled ? <><span className="spinner" /> {t.generating}</> : <>&#9679; {t.generate}</>}
            </button>
          </div>
        </div>
        <div className="form-hint">{t.modelHint}</div>
      </div>

      {/* Source Text Card */}
      <div className="form-card">
        <label className="form-label">{t.sourceText}</label>
        <textarea
          className="form-textarea"
          rows={6}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          maxLength={20000}
          placeholder={t.sourceTextPlaceholder}
          style={{ minHeight: 150 }}
        />
        <div className={`char-counter ${sourceText.length > 18000 ? "warn" : ""}`}>
          {sourceText.length} / 20000
        </div>
      </div>

      {/* Scene + Language Card */}
      <div className="form-card">
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
            <input
              className="form-input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Extra Requirements Card */}
      <div className="form-card">
        <label className="form-label">{t.extraRequirements}</label>
        <textarea
          className="form-textarea"
          rows={3}
          value={extraRequirements}
          onChange={(e) => setExtraRequirements(e.target.value)}
          maxLength={4000}
          placeholder={t.extraRequirementsPlaceholder}
          style={{ minHeight: 60 }}
        />
        <div className={`char-counter ${extraRequirements.length > 3500 ? "warn" : ""}`}>
          {extraRequirements.length} / 4000
        </div>
      </div>

      {/* Temp + Token Card */}
      <div className="form-card">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t.temperature}</label>
            <div className="temp-slider-group">
              <input
                type="range"
                min={0} max={2} step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
              <span className="temp-value">{temperature.toFixed(1)}</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t.maxTokens}</label>
            <input
              className="form-input token-input"
              type="number"
              min={256} max={8192} step={256}
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 256)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
