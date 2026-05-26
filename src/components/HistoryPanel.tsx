"use client";
import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import type { HistoryItem, ApiResponse, PaginatedResponse } from "@/types";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
}

export default function HistoryPanel({ isOpen, onClose, onSelect }: HistoryPanelProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchHistory = useCallback(async (cursorVal?: string | null) => {
    const isMore = !!cursorVal;
    if (isMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const url = cursorVal
        ? `/api/history?cursor=${cursorVal}&limit=20`
        : "/api/history?limit=20";
      const res = await fetch(url);
      const json = (await res.json()) as ApiResponse<PaginatedResponse<HistoryItem>>;
      if (json.success) {
        if (isMore) {
          setItems((prev) => [...prev, ...json.data.items]);
        } else {
          setItems(json.data.items);
        }
        setCursor(json.data.nextCursor);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setCursor(null);
      fetchHistory();
    }
  }, [isOpen, fetchHistory]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/history/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.id !== id));
      setDeleteTarget(null);
    } catch {
      // silently fail
    }
  };

  const handleLoadMore = () => {
    if (cursor && !loadingMore) fetchHistory(cursor);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="slide-overlay" onClick={onClose} />

      {deleteTarget && (
        <div className="confirm-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="confirm-box">
            <p>{t.deleteConfirm}</p>
            <div className="confirm-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(deleteTarget)}>
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="slide-panel">
        <div className="slide-header">
          <h3>{t.history}</h3>
          <button className="modal-close" onClick={onClose} style={{ position: "static" }}>
            &times;
          </button>
        </div>

        <div className="slide-body">
          {loading && items.length === 0 && (
            <div className="slide-empty">Loading...</div>
          )}

          {!loading && items.length === 0 && (
            <div className="slide-empty">{t.noResults}</div>
          )}

          {items.map((item) => {
            const sourceText = item.requestJson?.sourceText || "";
            const preview = sourceText.length > 50 ? sourceText.slice(0, 50) + "..." : sourceText;
            const time = new Date(item.createdAt).toLocaleString();

            return (
              <div key={item.id} className="slide-item" onClick={() => onSelect(item)}>
                <div className="item-preview">{preview || "(empty)"}</div>
                <div className="item-meta">
                  <span>
                    {item.providerId || "?"} / {item.modelId || "?"} &middot; {time}
                  </span>
                  <button
                    className="item-delete"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(item.id); }}
                    title={t.delete}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/>
                      <path d="M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {cursor && (
          <div className="slide-footer">
            <button
              className="btn btn-secondary btn-sm btn-full"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
