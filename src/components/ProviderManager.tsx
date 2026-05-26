"use client";
import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import type { ProviderConfigPublic, ModelInfo, ApiResponse } from "@/types";

interface ProviderManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProviderFormData {
  id: string;
  name: string;
  type: "openai" | "anthropic";
  endpoint: string;
  apiKey: string;
  models: ModelInfo[];
}

const emptyForm: ProviderFormData = {
  id: "",
  name: "",
  type: "openai",
  endpoint: "",
  apiKey: "",
  models: [{ id: "", displayName: "" }],
};

async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new Error(json.error || "Request failed");
  }
  return json.data;
}

export default function ProviderManager({ isOpen, onClose }: ProviderManagerProps) {
  const { t } = useI18n();
  const [providers, setProviders] = useState<ProviderConfigPublic[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProviderFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      const data = await apiCall<ProviderConfigPublic[]>("/api/providers");
      setProviders(data);
    } catch {
      setErrorMsg("Failed to load providers");
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProviders();
      setShowForm(false);
      setErrorMsg("");
    }
  }, [isOpen, fetchProviders]);

  if (!isOpen) return null;

  const handleEdit = (p: ProviderConfigPublic) => {
    setForm({
      id: p.id,
      name: p.name,
      type: p.type,
      endpoint: p.endpoint,
      apiKey: "",
      models: p.models.length > 0 ? p.models : [{ id: "", displayName: "" }],
    });
    setShowForm(true);
    setErrorMsg("");
  };

  const handleAdd = () => {
    setForm({ ...emptyForm, models: [{ id: "", displayName: "" }] });
    setShowForm(true);
    setErrorMsg("");
  };

  const handleDelete = async (id: string) => {
    try {
      await apiCall(`/api/providers/${id}`, { method: "DELETE" });
      setProviders((prev) => prev.filter((p) => p.id !== id));
      setConfirmDelete(null);
    } catch {
      setErrorMsg("Failed to delete provider");
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.endpoint) {
      setErrorMsg("Name and endpoint are required");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        endpoint: form.endpoint,
        apiKey: form.apiKey,
        models: form.models.filter((m) => m.id && m.displayName),
      };
      if (form.id) body.id = form.id;
      await apiCall("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await fetchProviders();
      setShowForm(false);
      setForm(emptyForm);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const updateModel = (idx: number, field: keyof ModelInfo, value: string) => {
    setForm((prev) => {
      const models = [...prev.models];
      models[idx] = { ...models[idx]!, [field]: value };
      return { ...prev, models };
    });
  };

  const addModelRow = () => {
    setForm((prev) => ({ ...prev, models: [...prev.models, { id: "", displayName: "" }] }));
  };

  const removeModelRow = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      models: prev.models.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-box">
            <p>{t.deleteConfirm}</p>
            <div className="confirm-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(confirmDelete)}>
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <h2 className="modal-title">{showForm ? (form.id ? t.editProvider : t.addProvider) : t.provider}</h2>

        {errorMsg && <div className="error-card mb-3" style={{ padding: "10px 14px" }}><span className="error-title">{errorMsg}</span></div>}

        {!showForm ? (
          <>
            <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {providers.map((p) => (
                <div key={p.id} className="provider-list-item">
                  <div className="provider-list-info">
                    <div className="provider-list-name">
                      {p.name}{" "}
                      <span className={`badge ${p.type === "openai" ? "badge-amber" : "badge-cyan"}`}>{p.type}</span>
                    </div>
                    <div className="provider-list-endpoint">{p.endpoint}</div>
                    <div className="text-muted" style={{ fontSize: "0.7rem", marginTop: 2 }}>
                      {p.models.length} models
                    </div>
                  </div>
                  <div className="provider-list-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(p)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => setConfirmDelete(p.id)}>
                      {t.delete}
                    </button>
                  </div>
                </div>
              ))}
              {providers.length === 0 && (
                <p className="text-muted text-center" style={{ padding: "30px 0" }}>No providers configured</p>
              )}
            </div>
            <div className="mt-3">
              <button className="btn btn-primary btn-full" onClick={handleAdd}>
                + {t.addProvider}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">{t.providerName}</label>
              <input
                className="form-input"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. My OpenAI"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t.providerType}</label>
              <select
                className="form-select"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "openai" | "anthropic" })}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t.endpoint}</label>
              <input
                className="form-input"
                type="text"
                value={form.endpoint}
                onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t.apiKey}</label>
              <input
                className="form-input"
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder={form.id ? "•••••• (leave empty to keep existing)" : "sk-..."}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t.model}</label>
              {form.models.map((m, idx) => (
                <div key={idx} className="form-row mb-2" style={{ marginBottom: 8 }}>
                  <input
                    className="form-input"
                    type="text"
                    value={m.id}
                    onChange={(e) => updateModel(idx, "id", e.target.value)}
                    placeholder={t.modelId}
                  />
                  <input
                    className="form-input"
                    type="text"
                    value={m.displayName}
                    onChange={(e) => updateModel(idx, "displayName", e.target.value)}
                    placeholder={t.modelDisplayName}
                  />
                  {form.models.length > 1 && (
                    <button className="btn btn-ghost" style={{ color: "var(--red)", flex: "none" }} onClick={() => removeModelRow(idx)}>
                      &times;
                    </button>
                  )}
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={addModelRow}>
                + {t.addModel}
              </button>
            </div>
            <div className="flex-between mt-3">
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setErrorMsg(""); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving...</> : t.save}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
