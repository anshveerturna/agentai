"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { NodeView } from "../nodes/NodeView";
import { EdgeLayer } from "./EdgeLayer";

const GRID_SIZE = 24;

export function Canvas() {
  const viewport = useWorkflowStore((s) => s.viewport);
  const setViewport = useWorkflowStore((s) => s.setViewport);
  const panBy = useWorkflowStore((s) => s.panBy);
  const zoomBy = useWorkflowStore((s) => s.zoomBy);
  const clearSelection = useWorkflowStore((s) => s.clearSelection);
  const nodes = useWorkflowStore((s) => s.workflow.nodes);
  const updateConnectCursor = useWorkflowStore((s) => s.updateConnectCursor);

  const ref = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Background grid style using CSS gradients
  const gridStyle = useMemo(() => {
    const s = GRID_SIZE * viewport.zoom;
    const ox = viewport.offset.x % s;
    const oy = viewport.offset.y % s;
    return {
      backgroundColor: "#fafafa",
      backgroundImage:
        "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px)," +
        "linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
      backgroundSize: `${s}px ${s}px`,
      backgroundPosition: `${ox}px ${oy}px`,
    } as React.CSSProperties;
  }, [viewport]);

  // Wheel zoom with ctrl/cmd
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = ref.current?.getBoundingClientRect();
        const center = rect
          ? { x: e.clientX - rect.left, y: e.clientY - rect.top }
          : undefined;
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        zoomBy(factor, center);
      }
    },
    [zoomBy]
  );

  // Mouse pan
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse or Alt+Left to pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Always update connection cursor for draft edge preview
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const cx = (e.clientX - rect.left - viewport.offset.x) / viewport.zoom;
        const cy = (e.clientY - rect.top - viewport.offset.y) / viewport.zoom;
        updateConnectCursor({ x: cx, y: cy });
      }

      // Panning logic
      if (!isPanning.current || !lastPos.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      panBy(dx, dy);
    },
    [panBy, updateConnectCursor, viewport.offset.x, viewport.offset.y, viewport.zoom]
  );

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
    lastPos.current = null;
  }, []);

  // Reset selection on background click
  const onBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === ref.current) clearSelection();
    },
    [clearSelection]
  );

  // Keep viewport within sane bounds (zoom clamped in store)
  useEffect(() => {
    if (!ref.current) return;
    // no-op for now
  }, [viewport]);

  return (
    <div
      ref={ref}
      className="absolute inset-0 overflow-hidden"
      style={gridStyle}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onClick={onBackgroundClick}
    >
      {/* Edge layer behind nodes to keep ports clickable */}
      <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
        <div
          style={{
            transform: `translate(${viewport.offset.x}px, ${viewport.offset.y}px) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
            width: "20000px",
            height: "20000px",
            position: "relative",
          }}
        >
          <EdgeLayer />
        </div>
      </div>

      {/* Transform container for nodes */}
      <div
        style={{
          transform: `translate(${viewport.offset.x}px, ${viewport.offset.y}px) scale(${viewport.zoom})`,
          transformOrigin: "0 0",
          width: "20000px",
          height: "20000px",
          position: "relative",
        }}
      >
        {nodes.map((n) => (
          <NodeView key={n.id} node={n} />
        ))}
      </div>
    </div>
  );
}
