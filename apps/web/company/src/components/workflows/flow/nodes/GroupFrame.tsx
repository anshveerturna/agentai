"use client";
import React, { memo, useMemo, useRef, useState } from 'react';
import { NodeProps } from '@xyflow/react';
import { Group as GroupIcon, Pencil } from 'lucide-react';
import { useWorkflowStore } from '../../../../store/workflowStore';
import type { WorkflowStore } from '../../../../store/workflowStore';

interface GroupNodeData {
  label?: string;
  childCount?: number;
  collapsed?: boolean;
  config?: Record<string, any>;
}

function GroupFrameComponent(props: NodeProps) {
  const { id, data, selected } = props as any;
  const groupData = (data as GroupNodeData) || {};
  const label = groupData.label || 'Group';
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(label);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const updateNode = useWorkflowStore((s: WorkflowStore) => s.updateNode);

  const commit = useMemo(() => (
    () => {
      const next = (value || '').trim();
      const safe = next.length ? next : 'Group';
      updateNode(id as any, { label: safe } as any);
      setEditing(false);
    }
  ), [id, value, updateNode]);

  React.useEffect(() => {
    if (editing) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [editing]);

  return (
    <>
      {/* Floating header pill above the group */}
      <div
        className="absolute -top-8 left-0 flex items-center gap-1 px-2 h-6 rounded-md border border-border/60 bg-background shadow-md pointer-events-auto z-10"
        onMouseDown={(e) => { e.stopPropagation(); }}
        onClick={(e) => { e.stopPropagation(); }}
        onDoubleClick={(e) => { e.stopPropagation(); setValue(label); setEditing(true); }}
      >
        <GroupIcon className="w-3.5 h-3.5 text-foreground/70" />
        {!editing ? (
          <button
            type="button"
            className="text-[12px] leading-none font-medium text-foreground/90 hover:text-foreground truncate max-w-[160px]"
            onDoubleClick={() => { setValue(label); setEditing(true); }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            title="Rename group (double-click)"
          >
            {label}
          </button>
        ) : (
          <input
            ref={inputRef}
            className="text-[12px] leading-none font-medium bg-transparent outline-none border-none p-0 m-0 max-w-[160px]"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setValue(label); } }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        )}
        {typeof groupData.childCount === 'number' && (
          <span className="ml-1 text-[10px] px-1.5 py-[2px] rounded bg-muted text-foreground/70">
            {groupData.childCount}
          </span>
        )}
        {!editing && (
          <button
            type="button"
            className="ml-0.5 p-0.5 rounded hover:bg-muted"
            title="Rename"
            onClick={(e) => { e.stopPropagation(); setValue(label); setEditing(true); }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Pencil className="w-3 h-3 text-foreground/60" />
          </button>
        )}
      </div>

      {/* Group frame (border-only, no fill) */}
      <div
        className={[
          'relative w-full h-full rounded-xl border transition-colors',
          selected ? 'border-blue-500 shadow-[0_0_0_2px_rgba(37,99,235,0.18)]' : 'border-border/50',
          'bg-transparent',
        ].join(' ')}
      />
    </>
  );
}

export const GroupNode = memo(GroupFrameComponent);
