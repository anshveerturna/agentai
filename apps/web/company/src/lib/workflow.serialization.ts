// Utilities to serialize/deserialize the visual graph to an execution spec
// This is the contract that will be stored in the backend and rendered in the code editor.
// Keep it minimal now; extend with data edges, typed schemas, and validators later.

import type { Workflow, NodeModel, Edge, Port } from '@/types/workflow';

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
    // optional branch info for conditions/splits, e.g., 'true' | 'false' | 'case:foo'
    branch?: string;
    // optional schema/type identifier for data edges
    schema?: string;
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
  const flow = wf.edges.map((e: Edge) => {
    const fromNode = wf.nodes.find((n) => n.id === e.from.nodeId);
    const toNode = wf.nodes.find((n) => n.id === e.to.nodeId);
    const fromPort = fromNode?.ports?.find((p) => p.id === e.from.portId);
    const toPort = toNode?.ports?.find((p) => p.id === e.to.portId);
    const branch = fromNode?.kind === 'condition' && fromPort?.direction === 'out' ? fromPort?.name : undefined;
    const schema = e.kind === 'data' ? (fromPort?.dataType || toPort?.dataType) : undefined;
    return {
      from: e.from.nodeId,
      to: e.to.nodeId,
      kind: e.kind,
      label: e.label,
      ...(branch ? { branch } : {}),
      ...(schema ? { schema } : {}),
    };
  });
  const layout = {
    positions: Object.fromEntries(wf.nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]))
  };
  return { id: wf.id, name: wf.name, nodes, flow, layout, version: 1 };
}

export function fromExecutionSpec(spec: ExecutionSpec): Workflow {
  // Build nodes, creating ports according to type
  const nodes: Workflow['nodes'] = spec.nodes.map((n) => {
    const kind: NodeModel['kind'] = n.type === 'condition' ? 'condition' : n.type === 'trigger' ? 'trigger' : 'custom';
    let ports: Port[] = [];
    if (kind === 'condition') {
      ports = [
        { id: crypto.randomUUID() as string, name: 'in', direction: 'in', kind: 'control' },
        { id: crypto.randomUUID() as string, name: 'true', direction: 'out', kind: 'control' },
        { id: crypto.randomUUID() as string, name: 'false', direction: 'out', kind: 'control' },
      ];
    } else if (n.type === 'text') {
      ports = [];
    } else {
      ports = [
        { id: crypto.randomUUID() as string, name: 'in', direction: 'in', kind: 'control' },
        { id: crypto.randomUUID() as string, name: 'out', direction: 'out', kind: 'control' },
      ];
    }
    return {
      id: n.id,
      kind,
      label: n.label || n.type,
      position: spec.layout?.positions?.[n.id] ?? { x: 100, y: 100 },
      size: { width: 200, height: 60 },
      ports,
      config: { ...(n.config ?? {}), nodeType: n.type },
    } as NodeModel;
  });
  // Helper to find a port on a node by direction or name (for branches)
  const findPortId = (nodeId: string, opts: { direction?: 'in'|'out'; name?: string }): string | undefined => {
    const node = nodes.find((x) => x.id === nodeId);
    if (!node) return undefined;
    if (opts.name) return node.ports.find((p) => p.name === opts.name)?.id;
    if (opts.direction) return node.ports.find((p) => p.direction === opts.direction)?.id;
    return node.ports[0]?.id;
  };
  const edges: Workflow['edges'] = spec.flow.map((e) => {
    const fromPortId = e.branch ? findPortId(e.from, { name: e.branch }) : findPortId(e.from, { direction: 'out' });
    const toPortId = findPortId(e.to, { direction: 'in' });
    return {
      id: crypto.randomUUID() as string,
      from: { nodeId: e.from, portId: (fromPortId ?? '') as string },
      to: { nodeId: e.to, portId: (toPortId ?? '') as string },
      kind: e.kind,
      label: e.label,
    } as Edge;
  });
  return {
    id: spec.id,
    name: spec.name,
    nodes,
    edges,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// Basic validation: check for missing nodes, dangling edges, and required ports
export function validateExecutionSpec(spec: ExecutionSpec): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const nodeIds = new Set(spec.nodes.map((n) => n.id));
  for (const f of spec.flow) {
    if (!nodeIds.has(f.from)) errors.push(`Edge from unknown node ${f.from}`);
    if (!nodeIds.has(f.to)) errors.push(`Edge to unknown node ${f.to}`);
    if (f.kind === 'data' && !f.schema) errors.push(`Data edge ${f.from}→${f.to} missing schema`);
    if (typeof f.branch !== 'undefined') {
      const src = spec.nodes.find((n) => n.id === f.from);
      if (!src || src.type !== 'condition') errors.push(`Branch specified on non-condition node ${f.from}`);
    }
  }
  return { ok: errors.length === 0, errors };
}
