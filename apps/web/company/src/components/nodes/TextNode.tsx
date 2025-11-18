"use client";
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Type as TypeIcon, Pencil } from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';
import type { UUID } from '@/types/workflow';

interface TextNodeProps { id: UUID; data?: any; selected?: boolean; }

// Simple editable text node. Label stored at NodeModel.label for autosave hashing.
export const TextNode: React.FC<TextNodeProps> = ({ id, selected }) => {
  const node = useWorkflowStore((s) => s.workflow.nodes.find(n => n.id === id));
  const label = node?.label || '';
  const size = node?.size || { width: 200, height: 60 };
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const ref = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState(false);
  const draftRef = useRef(label);
  const pendingEditRef = useRef(false);
  const [localHeight, setLocalHeight] = useState<number>(size.height || 18);
  const [localWidth, setLocalWidth] = useState<number>(size.width || 200);
  // Floating header (title) state – stored in node.config.title
  const title = (node as any)?.config?.title || 'Text';
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleValue, setTitleValue] = useState<string>(title);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Place caret at end when focused.
  const placeCaretEnd = useCallback((el: HTMLElement) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
  }, []);

  // Only focus when entering editing mode via double click
  useEffect(() => {
    if (editing) {
      // Defer caret placement to next frame to ensure DOM updated
      requestAnimationFrame(() => {
        const el = ref.current;
        if (el && editing) {
          // Populate content directly to avoid React interfering with caret
          el.innerText = draftRef.current ?? '';
          el.focus();
          placeCaretEnd(el);
        }
      });
    }
  }, [editing, placeCaretEnd]);

  // focus title input when entering edit mode
  useEffect(() => {
    if (titleEditing) {
      const t = setTimeout(() => titleInputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [titleEditing]);

  const measureSize = useCallback(() => {
    const text = editing ? (draftRef.current ?? '') : (label ?? '');
    const m = measureRef.current;
    const MIN_H = 18;
    const MIN_W = Math.max(80, size.width || 200);
    const MAX_W = 520; // tighter max width for compact layout
    if (m) {
      // mirror content for accurate measurement
      m.textContent = text.length ? text : ' ';
      // ensure auto width/height for measurement
      m.style.width = 'auto';
      m.style.height = 'auto';
      const nextW = Math.min(Math.max(m.offsetWidth, MIN_W), MAX_W);
      // Constrain width to nextW to re-measure height with wrapping at that width
      m.style.width = `${nextW}px`;
      const BORDER = 2; // 1px top + 1px bottom
      const nextH = Math.max(m.scrollHeight + BORDER, MIN_H);
      setLocalWidth(nextW);
      setLocalHeight(nextH);
      return;
    }
    // Fallback to content element height only
    const el = ref.current;
    if (el) {
      const prevH = el.style.height;
      el.style.height = 'auto';
      const BORDER = 2;
      const next = Math.max(el.scrollHeight + BORDER, MIN_H);
      el.style.height = prevH;
      setLocalHeight(next);
    }
  }, [editing, label, size.width]);

  // Measure when label changes (non-editing) or initial mount
  useEffect(() => {
    if (!editing) requestAnimationFrame(() => measureSize());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, editing]);

  const commit = useCallback((text: string) => {
    // Sync text and the measured width/height to the store
    updateNode(id, { label: text, size: { width: localWidth, height: localHeight } } as any);
    draftRef.current = text;
  }, [id, updateNode, localWidth, localHeight]);
  return (
    <div style={{ position: 'relative', width: localWidth, height: localHeight }} className="select-text">
      {/* Floating title pill above text node, same design language as group */}
      <div
        className="absolute -top-7 left-0 flex items-center gap-1 px-2 h-6 rounded-md border shadow-md pointer-events-auto z-10 bg-[#1F6FEB] border-[#1F6FEB] text-white dark:bg-background dark:border-border/60 dark:text-foreground"
        onMouseDown={(e) => { e.stopPropagation(); }}
        onClick={(e) => { e.stopPropagation(); }}
        onDoubleClick={(e) => { e.stopPropagation(); setTitleValue(title); setTitleEditing(true); }}
      >
        <TypeIcon className="w-3.5 h-3.5 text-white dark:text-foreground/70" />
        {!titleEditing ? (
          <button
            type="button"
            className="text-[12px] leading-none font-medium text-white hover:text-white/90 dark:text-foreground/90 dark:hover:text-foreground truncate max-w-[160px]"
            onDoubleClick={() => { setTitleValue(title); setTitleEditing(true); }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            title="Rename text node (double-click)"
          >
            {title}
          </button>
        ) : (
          <input
            ref={titleInputRef}
            className="text-[12px] leading-none font-medium bg-transparent outline-none border-none p-0 m-0 max-w-[160px]"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={() => {
              const next = (titleValue || '').trim();
              const safe = next.length ? next : 'Text';
              updateNode(id, { config: { ...(node as any)?.config, title: safe } } as any);
              setTitleEditing(false);
            }}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') { const next = (titleValue || '').trim(); const safe = next.length ? next : 'Text'; updateNode(id, { config: { ...(node as any)?.config, title: safe } } as any); setTitleEditing(false);} if (e.key === 'Escape') { setTitleEditing(false); setTitleValue(title); } }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        )}
        {!titleEditing && (
          <button
            type="button"
            className="ml-0.5 p-0.5 rounded hover:bg-muted"
            title="Rename"
            onClick={(e) => { e.stopPropagation(); setTitleValue(title); setTitleEditing(true); }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Pencil className="w-3 h-3 text-white dark:text-foreground/60" />
          </button>
        )}
      </div>
      <div
        ref={ref}
        contentEditable={editing}
        suppressContentEditableWarning
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!editing) {
            setEditing(true);
          }
        }}
        onKeyDown={(e) => {
          if (!editing) return; // ignore key events when not editing
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit((e.target as HTMLElement).innerText);
            (e.target as HTMLElement).blur();
          } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commit((e.target as HTMLElement).innerText);
            (e.target as HTMLElement).blur();
          }
        }}
        onInput={(e) => {
          if (!editing) return;
          // Update local draft only; avoid store update to keep caret stable
          draftRef.current = (e.target as HTMLElement).innerText;
          // Auto-resize to fit content while typing
          measureSize();
        }}
        onBlur={(e) => {
          if (editing) {
            // Final measurement and commit
            measureSize();
            commit((e.target as HTMLElement).innerText);
            setEditing(false);
          }
        }}
        style={{
          outline: 'none',
            width: '100%',
            height: 'auto',
            padding: '5px 8px',
            border: '1.5px solid var(--border)',
            borderRadius: 6,
            background: 'var(--color-bg-light, #EFF6FF)', // light blue tint in light mode
            fontSize: 10,
            lineHeight: '14px',
            color: 'var(--foreground)',
            cursor: 'text',
            boxShadow: selected
              ? '0 12px 24px -8px rgba(0,0,0,0.25), 0 0 0 1px rgba(31,111,235,0.50), 0 0 0 3px rgba(31,111,235,0.22)'
              : '0 4px 12px -2px rgba(0,0,0,0.12), 0 2px 4px -1px rgba(0,0,0,0.08)',
            userSelect: 'text',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word'
        }}
        spellCheck={false}
        data-placeholder="Type…"
      >{editing ? null : (label || '')}</div>
      {/* offscreen measurement mirror for width/height */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute',
          visibility: 'hidden',
          zIndex: -1,
          padding: '5px 8px',
          border: '1.5px solid var(--border)',
          borderRadius: 6,
          background: 'var(--color-bg-light, #EFF6FF)', // light blue tint in light mode
          fontSize: 10,
          lineHeight: '14px',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          boxSizing: 'content-box',
        }}
      />
      {(!label || !label.length) && !editing && (
        <div style={{ position: 'absolute', left: 8, top: 5, pointerEvents: 'none', fontSize: 10, lineHeight: '14px', color: 'var(--muted-foreground)' }}>Type…</div>
      )}
    </div>
  );
};

export default TextNode;
