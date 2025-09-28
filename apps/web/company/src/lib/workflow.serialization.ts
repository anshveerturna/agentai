// Utilities to serialize/deserialize the visual graph to an execution spec
// This is the contract that will be stored in the backend and rendered in the code editor.
// Keep it minimal now; extend with data edges, typed schemas, and validators later.

import type { Workflow, NodeModel, Edge } from '@/types/workflow';

export type ExecutionSpec = {
  id: string;
  name: string;
  nodes: Array<{
    id: string;
    type: string; // semantic type, e.g., http, condition, text, table, interface, chat, agent, action
    label?: string;
    config?: Record<string, unknown>;
  }>;
  flow: Array<{
    from: string;
    to: string;
    kind: 'control' | 'data' | 'error';
    label?: string;
  }>;
  // optional layout metadata for the visual editor
  layout?: {
    positions: Record<string, { x: number; y: number }>;
  };
  version?: number;
};

export function toExecutionSpec(wf: Workflow): ExecutionSpec {
  const nodes = wf.nodes.map((n: NodeModel) => ({
    id: n.id,
    type: String((n.config as any)?.nodeType ?? (n.config as any)?.type ?? n.kind ?? 'action'),
    label: n.label,
    config: n.config ?? {},
  }));
  const flow = wf.edges.map((e: Edge) => ({
    from: e.from.nodeId,
    to: e.to.nodeId,
    kind: e.kind,
    label: e.label,
  }));
  const layout = {
    positions: Object.fromEntries(wf.nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]))
  };
  return { id: wf.id, name: wf.name, nodes, flow, layout, version: 1 };
}

export function fromExecutionSpec(spec: ExecutionSpec): Workflow {
  const nodes: Workflow['nodes'] = spec.nodes.map((n) => ({
    id: n.id,
    kind: 'custom',
    label: n.label || n.type,
    position: spec.layout?.positions?.[n.id] ?? { x: 100, y: 100 },
    size: { width: 200, height: 60 },
    ports: [
      { id: crypto.randomUUID(), name: 'in', direction: 'in', kind: 'control' },
      { id: crypto.randomUUID(), name: 'out', direction: 'out', kind: 'control' },
    ] as any,
    config: { ...(n.config ?? {}), nodeType: n.type },
  }));
  const edges: Workflow['edges'] = spec.flow.map((e) => ({
    id: crypto.randomUUID(),
    from: { nodeId: e.from, portId: '' as any },
    to: { nodeId: e.to, portId: '' as any },
    kind: e.kind,
    label: e.label,
  }));
  return {
    id: spec.id,
    name: spec.name,
    nodes,
    edges,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
