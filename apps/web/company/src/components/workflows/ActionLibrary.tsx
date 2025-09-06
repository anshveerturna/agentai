"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Zap, Globe, MessageSquare, Database, Table, Shuffle, GitBranch, Clock, Mail, Upload, X } from 'lucide-react';

export interface ActionItem {
  id: string;
  label: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  nodeType: string;
}

const DEFAULT_ACTIONS: ActionItem[] = [
  { id: 'http-request', label: 'HTTP Request', category: 'Web Services', description: 'Make an HTTP API call', icon: Globe, nodeType: 'http' },
  { id: 'run-prompt', label: 'Run a Prompt', category: 'AI', description: 'Execute a prompt with parameters', icon: MessageSquare, nodeType: 'run-prompt' },
  { id: 'table', label: 'Table Operation', category: 'Data', description: 'Work with tabular data', icon: Table, nodeType: 'table' },
  { id: 'transform-data', label: 'Transform Data', category: 'Data', description: 'Transform and manipulate data', icon: Shuffle, nodeType: 'action' },
  { id: 'conditional', label: 'Conditional Logic', category: 'Logic', description: 'Add if/then logic', icon: GitBranch, nodeType: 'action' },
  { id: 'delay', label: 'Delay', category: 'Utility', description: 'Wait for a specified time', icon: Clock, nodeType: 'action' },
  { id: 'webhook', label: 'Webhook', category: 'Web Services', description: 'Receive HTTP webhooks', icon: Zap, nodeType: 'http' },
  { id: 'email-send', label: 'Send Email', category: 'Communication', description: 'Send an email message', icon: Mail, nodeType: 'action' },
  { id: 'database-query', label: 'Database Query', category: 'Data', description: 'Query a database', icon: Database, nodeType: 'table' },
  { id: 'file-upload', label: 'File Upload', category: 'Files', description: 'Upload files to storage', icon: Upload, nodeType: 'action' }
];

export function ActionLibrary({ open, onClose, onSelect, initialQuery }: {
  open: boolean;
  onClose: () => void;
  onSelect: (action: ActionItem) => void;
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery ?? "");
  const [highlight, setHighlight] = useState(0);
  const items = useMemo(() => {
    if (!q.trim()) return DEFAULT_ACTIONS;
    const query = q.toLowerCase();
    return DEFAULT_ACTIONS.filter((a: ActionItem) =>
      a.label.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query)
    );
  }, [q]);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") return onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, Math.max(0, items.length - 1)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      }
      if (e.key === "Enter" && items[highlight]) {
        onSelect(items[highlight]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, highlight, onClose, onSelect]);

  return (
    <div className={`fixed inset-0 z-40 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/30 ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />

      {/* Panel */}
      <div
        className={`absolute top-0 right-0 h-full w-[420px] bg-background border-l border-border shadow-xl transform transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions…" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="overflow-y-auto max-h-[calc(100%-56px)] p-2">
          {items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No actions found.</div>
          ) : (
            <div className="space-y-6">
              {/* Group by category */}
              {Object.entries(
                items.reduce<Record<string, ActionItem[]>>((acc, it) => {
                  (acc[it.category] ||= []).push(it);
                  return acc;
                }, {})
              ).map(([category, group]) => (
                <div key={category}>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">{category}</div>
                  <div className="grid grid-cols-1 gap-2">
                    {group.map((it, idx) => {
                      const Icon = it.icon;
                      const isActive = items.indexOf(it) === highlight;
                      return (
                        <button
                          key={it.id}
                          onClick={() => onSelect(it)}
                          className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition ${isActive ? "bg-accent border-accent" : "hover:bg-accent/50 border-border"}`}
                        >
                          <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{it.label}</div>
                            <div className="text-sm text-muted-foreground truncate">{it.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActionLibrary;
