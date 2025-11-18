"use client";
import React, { useEffect, useRef, useCallback, useState } from 'react';
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
  const [editing, setEditing] = useState(false);
  const draftRef = useRef(label);
  const pendingEditRef = useRef(false);

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
          el.focus();
          placeCaretEnd(el);
        }
      });
    }
  }, [editing, placeCaretEnd]);

  const commit = useCallback((text: string) => {
    updateNode(id, { label: text });
    draftRef.current = text;
  }, [id, updateNode]);
  return (
    <div style={{ position: 'relative', width: size.width, height: size.height }} className="select-text">
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
        }}
        onBlur={(e) => {
          if (editing) {
            commit((e.target as HTMLElement).innerText);
            setEditing(false);
          }
        }}
        style={{
          outline: 'none',
            width: '100%',
            height: '100%',
            padding: '10px 14px',
            border: '2px solid #222',
            borderRadius: 6,
            background: '#111418',
            fontSize: 14,
            lineHeight: '20px',
            color: '#e2e8f0',
            cursor: 'text',
            boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.35)' : '0 1px 3px rgba(0,0,0,0.4)',
            userSelect: 'text',
            overflow: 'auto',
            whiteSpace: 'pre-wrap'
        }}
        spellCheck={false}
        data-placeholder="Type…"
      >{editing ? draftRef.current : (label || '')}</div>
      {(!label || !label.length) && !editing && (
        <div style={{ position: 'absolute', left: 14, top: 10, pointerEvents: 'none', fontSize: 14, lineHeight: '20px', color: '#64748b' }}>Type…</div>
      )}
    </div>
  );
};

export default TextNode;
