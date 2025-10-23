"use client";
import React from "react";
import { Handle, Position } from '@xyflow/react';

export type ActionNodeData = {
  label: string;
  nodeType?: string; // http, run-prompt, table, etc.
  onPlusClick?: (side: "left" | "right" | "top" | "bottom") => void;
  onAction?: (action: "edit" | "change" | "run" | "duplicate" | "delete") => void;
};

export function ActionNode(props: any) {
  const { data = {}, selected = false } = props as { data: Partial<ActionNodeData> & { ports?: Array<{ id: string; direction: 'in'|'out' }> }; selected?: boolean };
  const onClick = (side: "left" | "right" | "top" | "bottom") => {
    (data as any)?.onPlusClick?.(side);
  };

  // Get type-specific styling
  const nodeType = (data as any)?.nodeType as string | undefined;
  const getTypeStyle = (type?: string) => {
    switch (type) {
      case 'http':
        return {
          borderColor: 'border-l-green-500',
          iconBg: 'bg-green-500',
          icon: (
            <svg className="w-3 h-3 block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/>
            </svg>
          )
        };
      case 'run-prompt':
        return {
          borderColor: 'border-l-blue-500',
          iconBg: 'bg-blue-500',
          icon: (
            <svg className="w-3 h-3 block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          )
        };
      case 'table':
        return {
          borderColor: 'border-l-purple-500',
          iconBg: 'bg-purple-500',
          icon: (
            <svg className="w-3 h-3 block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
            </svg>
          )
        };
      default:
        return {
          borderColor: 'border-l-gray-400',
          iconBg: 'bg-gray-500',
          icon: (
            <svg className="w-3 h-3 block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          )
        };
    }
  };

  const typeStyle = getTypeStyle(nodeType);

  return (
    <div
      className={
        "group relative border shadow-sm transition-all bg-white border-gray-200 dark:bg-neutral-900 dark:border-neutral-700 " +
        `border-l-2 ${typeStyle.borderColor} ` +
        (selected ? "ring-1 ring-blue-400/50 dark:ring-blue-500/30" : "")
      }
      style={{ borderRadius: '8px' }}
    >
      {/* Connection handles (use port ids as handle ids) */}
      {(data as any)?.ports?.filter((p: any) => p.direction === 'in').map((p: any) => (
        <Handle key={`in-${p.id}`} id={p.id} type="target" position={Position.Left} className="!w-2 !h-2 !bg-blue-500" />
      ))}
      {(data as any)?.ports?.filter((p: any) => p.direction === 'out').map((p: any) => (
        <Handle key={`out-${p.id}`} id={p.id} type="source" position={Position.Right} className="!w-2 !h-2 !bg-blue-500" />
      ))}
      {/* Mini toolbar when selected */}
      {selected && (
  <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-white border border-gray-200 dark:bg-neutral-900 dark:border-neutral-700 shadow-md rounded-sm px-0 py-0 z-10">
          <button className="p-0.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-sm" title="Edit"
            onClick={(e) => { e.stopPropagation(); (data as any)?.onAction?.("edit"); }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button className="p-0.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-sm" title="Change"
            onClick={(e) => { e.stopPropagation(); (data as any)?.onAction?.("change"); }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 6.73 5.64L1 10m22 4-5.73 4.36A9 9 0 0 1 3.51 15"/></svg>
          </button>
          <button className="p-0.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-sm" title="Run"
            onClick={(e) => { e.stopPropagation(); (data as any)?.onAction?.("run"); }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
          <button className="p-0.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-sm" title="Duplicate"
            onClick={(e) => { e.stopPropagation(); (data as any)?.onAction?.("duplicate"); }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button className="p-0.5 hover:bg-gray-100 rounded-sm text-red-500" title="Delete"
            onClick={(e) => { e.stopPropagation(); (data as any)?.onAction?.("delete"); }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      )}

      {/* Node body */}
      <div className="px-1.5 py-0.5 min-w-[120px] max-w-[160px] flex items-center gap-1">
        <div className={`w-4 h-4 rounded ${typeStyle.iconBg} text-white grid place-items-center`}>
          {typeStyle.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 dark:text-gray-100 truncate text-[11px] leading-tight">{(data as any)?.label ?? "Action"}</div>
        </div>
      </div>


      {/* Hover plus buttons - circular style like in image */}
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity absolute -left-4 top-1/2 -translate-y-1/2 size-3 rounded-full bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-600 flex items-center justify-center shadow-sm hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
        onClick={(e) => {
          e.stopPropagation();
          onClick("left");
        }}
        aria-label="Add left"
        type="button"
      >
        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-4 top-1/2 -translate-y-1/2 size-3 rounded-full bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-600 flex items-center justify-center shadow-sm hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
        onClick={(e) => {
          e.stopPropagation();
          onClick("right");
        }}
        aria-label="Add right"
        type="button"
      >
        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 -bottom-4 size-3 rounded-full bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-600 flex items-center justify-center shadow-sm hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
        onClick={(e) => {
          e.stopPropagation();
          onClick("bottom");
        }}
        aria-label="Add bottom"
        type="button"
      >
        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  );
}

export default ActionNode;
