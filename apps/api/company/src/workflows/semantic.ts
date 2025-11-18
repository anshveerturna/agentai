// Use Node's built-in crypto via named import to work reliably under ESM/CJS
import { createHash } from 'node:crypto';

export interface GraphSpec {
  nodes?: any[];
  edges?: any[];
  meta?: Record<string, any>;
}

// Remove volatile/layout fields and sort deterministically
export function normalizeSpec(spec: any): GraphSpec {
  const clone = JSON.parse(JSON.stringify(spec || {}));
  // Strip positions/sizes from nodes
  if (Array.isArray(clone.nodes)) {
    clone.nodes = clone.nodes
      .map((n: any) => {
        const { position, size, selected, ...rest } = n || {};
        return sortObjectDeep(rest);
      })
      .sort(byIdThenType);
  }
  // Normalize/sort edges
  if (Array.isArray(clone.edges)) {
    clone.edges = clone.edges
      .map((e: any) => sortObjectDeep(e || {}))
      .sort(byEdge);
  }
  // Normalize meta minimally
  if (clone.meta && typeof clone.meta === 'object')
    clone.meta = sortObjectDeep(clone.meta);
  return clone;
}

export function semanticHash(spec: any): string {
  const normalized = normalizeSpec(spec);
  const payload = JSON.stringify(normalized);
  return createHash('sha256').update(payload).digest('hex');
}

export interface DiffResult {
  summary: string;
  score: number;
  details: any;
}

export function diffAndScore(a: any, b: any): DiffResult {
  const A = normalizeSpec(a);
  const B = normalizeSpec(b);
  const nodesA = A.nodes || [];
  const nodesB = B.nodes || [];
  const edgesA = A.edges || [];
  const edgesB = B.edges || [];

  const byId = (x: any) => String(x.id ?? '');
  const setA = new Set(nodesA.map(byId));
  const setB = new Set(nodesB.map(byId));

  const addedNodes = nodesB.filter((n: any) => !setA.has(byId(n)));
  const removedNodes = nodesA.filter((n: any) => !setB.has(byId(n)));
  const commonNodeIds = nodesB.map(byId).filter((id: string) => setA.has(id));

  const changedNodes: any[] = [];
  commonNodeIds.forEach((id) => {
    const na = nodesA.find((n: any) => byId(n) === id);
    const nb = nodesB.find((n: any) => byId(n) === id);
    if (JSON.stringify(na) !== JSON.stringify(nb))
      changedNodes.push({ id, from: na, to: nb });
  });

  const edgeKey = (e: any) =>
    `${e.from?.nodeId}:${e.from?.portId}->${e.to?.nodeId}:${e.to?.portId}:${e.kind ?? 'control'}`;
  const eSetA = new Set(edgesA.map(edgeKey));
  const eSetB = new Set(edgesB.map(edgeKey));
  const addedEdges = edgesB.filter((e: any) => !eSetA.has(edgeKey(e)));
  const removedEdges = edgesA.filter((e: any) => !eSetB.has(edgeKey(e)));

  // Scoring heuristic per your spec
  const score =
    addedNodes.length * 5 +
    removedNodes.length * 5 +
    addedEdges.length * 2 +
    removedEdges.length * 2 +
    changedNodes.reduce(
      (acc, c) =>
        acc +
        (isConditionNode(c.to)
          ? 8
          : isConfigStructuralChange(c.from, c.to)
            ? 4
            : 1),
      0,
    );

  const summaryParts = [] as string[];
  if (addedNodes.length) summaryParts.push(`+${addedNodes.length} nodes`);
  if (removedNodes.length) summaryParts.push(`-${removedNodes.length} nodes`);
  if (addedEdges.length) summaryParts.push(`+${addedEdges.length} edges`);
  if (removedEdges.length) summaryParts.push(`-${removedEdges.length} edges`);
  if (changedNodes.length)
    summaryParts.push(`modified ${changedNodes.length} nodes`);

  return {
    summary: summaryParts.join(', ') || 'no changes',
    score,
    details: {
      addedNodes,
      removedNodes,
      addedEdges,
      removedEdges,
      changedNodes,
    },
  };
}

function isConditionNode(n: any): boolean {
  const kind = n?.kind || n?.config?.nodeType;
  return kind === 'condition' || kind === 'split';
}

function isConfigStructuralChange(a: any, b: any): boolean {
  const ka = Object.keys(a?.config || {})
    .sort()
    .join('|');
  const kb = Object.keys(b?.config || {})
    .sort()
    .join('|');
  return ka !== kb;
}

function sortObjectDeep(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectDeep);
  return Object.keys(obj)
    .sort()
    .reduce((acc: any, k: string) => {
      acc[k] = sortObjectDeep(obj[k]);
      return acc;
    }, {} as any);
}

function byIdThenType(a: any, b: any) {
  const ai = String(a?.id ?? '');
  const bi = String(b?.id ?? '');
  if (ai === bi)
    return String(a?.kind ?? '').localeCompare(String(b?.kind ?? ''));
  return ai.localeCompare(bi);
}

function byEdge(a: any, b: any) {
  const ka = `${a.from?.nodeId}:${a.from?.portId}->${a.to?.nodeId}:${a.to?.portId}:${a.kind ?? 'control'}`;
  const kb = `${b.from?.nodeId}:${b.from?.portId}->${b.to?.nodeId}:${b.to?.portId}:${b.kind ?? 'control'}`;
  return ka.localeCompare(kb);
}
