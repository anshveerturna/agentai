"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import type { NodeModel, Port } from "@/types/workflow";

type Props = {
  node: NodeModel;
};

const PORT_SIZE = 10;
const PORT_MARGIN = 8;

function groupPorts(ports: Port[]) {
  const inputs = ports.filter((p) => p.direction === "in");
  const outputs = ports.filter((p) => p.direction === "out");
  return { inputs, outputs };
}

export function NodeView({ node }: Props) {
  const selectNodes = useWorkflowStore((s) => s.selectNodes);
  const moveNodes = useWorkflowStore((s) => s.moveNodes);
  const pushHistory = useWorkflowStore((s) => s.pushHistory);
  const beginConnect = useWorkflowStore((s) => s.beginConnect);
  const completeConnect = useWorkflowStore((s) => s.completeConnect);
  const selection = useWorkflowStore((s) => s.selection);

  const isSelected = selection.nodes.has(node.id);
  const viewport = useWorkflowStore((s) => s.viewport);
  const { inputs, outputs } = useMemo(() => groupPorts(node.ports), [node.ports]);

  // Drag state
  const dragging = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const [localMouseDown, setLocalMouseDown] = useState(false);

  const onMouseDownNode = useCallback((e: React.MouseEvent) => {
    // Avoid starting drag from clicking ports
    const target = e.target as HTMLElement;
    if (target.dataset.portId) return;

    if (!e.shiftKey && !isSelected) {
      selectNodes([node.id], false);
    } else if (e.shiftKey) {
      selectNodes([node.id], true);
    }
    dragging.current = true;
    startPoint.current = { x: e.clientX, y: e.clientY };
    pushHistory("Move nodes");
    setLocalMouseDown(true);
  }, [isSelected, node.id, pushHistory, selectNodes]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || !startPoint.current) return;
    const dx = e.movementX / viewport.zoom; // convert to canvas space
    const dy = e.movementY / viewport.zoom;
    const ids = Array.from(selection.nodes);
    if (ids.length === 0) ids.push(node.id);
    moveNodes(ids, dx, dy, 8);
  }, [moveNodes, node.id, selection.nodes, viewport.zoom]);

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    startPoint.current = null;
    setLocalMouseDown(false);
  }, []);

  const onPortClick = useCallback((port: Port) => {
    if (port.direction === "out") {
      beginConnect({ nodeId: node.id, portId: port.id, kind: port.kind });
      return;
    }
    // If clicking an input, try to complete if draft exists
    completeConnect({ nodeId: node.id, portId: port.id, kind: port.kind });
  }, [beginConnect, completeConnect, node.id]);

  // Render helpers for port vertical placement
  const portY = useCallback((index: number, count: number) => {
    const { height } = node.size;
    const top = PORT_MARGIN;
    const bottom = height - PORT_MARGIN - PORT_SIZE;
    if (count <= 1) return Math.round((top + bottom) / 2);
    const gap = (bottom - top) / (count - 1);
    return Math.round(top + index * gap);
  }, [node.size]);

  return (
    <div
      className={`absolute select-none rounded border shadow-sm bg-white ${isSelected ? "ring-2 ring-blue-500" : ""}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.size.width,
        height: node.size.height,
      }}
      onMouseDown={onMouseDownNode}
      onMouseMove={localMouseDown ? onMouseMove : undefined}
      onMouseUp={onMouseUp}
    >
      {/* Header */}
      <div className="h-8 px-2 flex items-center justify-between border-b bg-neutral-50 text-xs">
        <span className="font-medium truncate">{node.label}</span>
        <span className="uppercase text-[10px] text-neutral-500">{node.kind}</span>
      </div>

      {/* Content placeholder */}
      <div className="p-2 text-[11px] text-neutral-500">
        {/* ... */}
      </div>

      {/* Input ports (left) */}
      {inputs.map((p, i) => (
        <button
          key={p.id}
          className="absolute -left-2 rounded-full border bg-white hover:bg-blue-50"
          style={{ top: portY(i, inputs.length), width: PORT_SIZE, height: PORT_SIZE }}
          title={`${p.name} (${p.kind})`}
          onClick={(e) => {
            e.stopPropagation();
            onPortClick(p);
          }}
          data-port-id={p.id}
        />
      ))}

      {/* Output ports (right) */}
      {outputs.map((p, i) => (
        <button
          key={p.id}
          className="absolute -right-2 rounded-full border bg-white hover:bg-blue-50"
          style={{ top: portY(i, outputs.length), width: PORT_SIZE, height: PORT_SIZE }}
          title={`${p.name} (${p.kind})`}
          onClick={(e) => {
            e.stopPropagation();
            onPortClick(p);
          }}
          data-port-id={p.id}
        />
      ))}
    </div>
  );
}
