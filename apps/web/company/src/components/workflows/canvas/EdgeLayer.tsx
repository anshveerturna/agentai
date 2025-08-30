"use client";

import React, { useMemo } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import type { Edge, NodeModel, Port } from "@/types/workflow";

function getPortCenter(node: NodeModel, port: Port) {
  // Approximate: left side for inputs, right side for outputs; vertical position from NodeView's logic
  const PORT_SIZE = 10;
  const PORT_MARGIN = 8;
  const ports = port.direction === "in" ? node.ports.filter(p => p.direction === "in") : node.ports.filter(p => p.direction === "out");
  const index = ports.findIndex((p) => p.id === port.id);
  const count = ports.length || 1;
  const top = PORT_MARGIN;
  const bottom = node.size.height - PORT_MARGIN - PORT_SIZE;
  const y = count <= 1 ? (top + bottom) / 2 : top + (index * (bottom - top)) / (count - 1);
  const x = port.direction === "in" ? 0 : node.size.width;
  return { x: node.position.x + x, y: node.position.y + y + PORT_SIZE / 2 };
}

function pathForEdge(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
  const c1x = a.x + dx;
  const c2x = b.x - dx;
  return `M ${a.x},${a.y} C ${c1x},${a.y} ${c2x},${b.y} ${b.x},${b.y}`;
}

export function EdgeLayer() {
  const nodes = useWorkflowStore((s) => s.workflow.nodes);
  const edges = useWorkflowStore((s) => s.workflow.edges);
  const draft = useWorkflowStore((s) => s.connectionDraft);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const renderEdge = (e: Edge) => {
    const fromNode = byId.get(e.from.nodeId);
    const toNode = byId.get(e.to.nodeId);
    if (!fromNode || !toNode) return null;
    const fromPort = fromNode.ports.find((p) => p.id === e.from.portId);
    const toPort = toNode.ports.find((p) => p.id === e.to.portId);
    if (!fromPort || !toPort) return null;
    const a = getPortCenter(fromNode, fromPort);
    const b = getPortCenter(toNode, toPort);
    const d = pathForEdge(a, b);
    const color = e.kind === "data" ? "#16a34a" : e.kind === "control" ? "#2563eb" : "#dc2626";
    return <path key={e.id} d={d} stroke={color} strokeWidth={2} fill="none" />;
  };

  const renderDraft = () => {
    if (!draft?.from || !draft?.cursor) return null;
    const fromNode = byId.get(draft.from.nodeId);
    if (!fromNode) return null;
    const fromPort = fromNode.ports.find((p) => p.id === draft.from!.portId);
    if (!fromPort) return null;
    const a = getPortCenter(fromNode, fromPort);
    const b = draft.cursor;
    const d = pathForEdge(a, b);
    const color = draft.from.kind === "data" ? "#16a34a" : draft.from.kind === "control" ? "#2563eb" : "#dc2626";
    return <path d={d} stroke={color} strokeWidth={2} fill="none" strokeDasharray="6 4" />;
  };

  return (
    <svg className="absolute inset-0 overflow-visible pointer-events-none" width="100%" height="100%">
      <g>{edges.map((e) => renderEdge(e))}</g>
      {renderDraft()}
    </svg>
  );
}
