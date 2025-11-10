"use client";
import React, { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { Group } from 'lucide-react';

interface GroupNodeData {
  label?: string;
  childCount?: number;
  collapsed?: boolean;
  config?: Record<string, any>;
}

function GroupNodeComponent({ data, selected }: NodeProps) {
  const groupData = (data as GroupNodeData) || {};
  return (
    <div className={`relative w-full h-full rounded-lg border ${selected ? 'border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.25)]' : 'border-border/50'}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 rounded-t-lg bg-muted/30">
        <div className="flex items-center justify-center w-5 h-5 rounded bg-muted">
          <Group className="w-3.5 h-3.5 text-foreground/70" />
        </div>
        <span className="text-[13px] font-medium truncate">{groupData.label || 'Group'}</span>
        {groupData.childCount ? (
          <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground/60">{groupData.childCount}</span>
        ) : null}
      </div>
      <div className="p-3 text-[11px] text-foreground/60">
        Group of nodes
      </div>
    </div>
  );
}

export const GroupNode = memo(GroupNodeComponent);
