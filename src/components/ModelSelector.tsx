"use client";
import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import type { ProviderConfigPublic, ApiResponse } from "@/types";
import ProviderManager from "./ProviderManager";

interface ModelSelectorProps {
  onChange: (sel: { providerId: string; modelId: string }) => void;
}

export default function ModelSelector({ onChange }: ModelSelectorProps) {
  const { t } = useI18n();
  const [providers, setProviders] = useState<ProviderConfigPublic[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [managerOpen, setManagerOpen] = useState(false);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      const json = (await res.json()) as ApiResponse<ProviderConfigPublic[]>;
      if (json.success) {
        setProviders(json.data);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    if (managerOpen === false) {
      fetchProviders();
    }
  }, [managerOpen, fetchProviders]);

  const currentProvider = providers.find((p) => p.id === selectedProviderId);

  const handleProviderChange = (providerId: string) => {
    setSelectedProviderId(providerId);
    setSelectedModelId("");
    const provider = providers.find((p) => p.id === providerId);
    if (provider && provider.models.length > 0 && provider.models[0]) {
      setSelectedModelId(provider.models[0].id);
      onChange({ providerId, modelId: provider.models[0].id });
    } else {
      onChange({ providerId, modelId: "" });
    }
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    onChange({ providerId: selectedProviderId, modelId });
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <select
        className="form-select"
        value={selectedProviderId}
        onChange={(e) => handleProviderChange(e.target.value)}
        style={{ flex: 1 }}
      >
        <option value="">-- {t.provider} --</option>
        {providers.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <select
        className="form-select"
        value={selectedModelId}
        onChange={(e) => handleModelChange(e.target.value)}
        disabled={!selectedProviderId}
        style={{ flex: 1 }}
      >
        <option value="">-- {t.model} --</option>
        {(currentProvider?.models || []).map((m) => (
          <option key={m.id} value={m.id}>{m.displayName}</option>
        ))}
      </select>
      <ProviderManager isOpen={managerOpen} onClose={() => setManagerOpen(false)} />
    </div>
  );
}
