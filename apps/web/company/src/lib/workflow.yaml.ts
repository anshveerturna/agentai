import YAML from 'yaml';
import type { ExecutionSpec } from './workflow.serialization';

export function specToYaml(spec: ExecutionSpec): string {
  // Keep ordering stable and human-friendly
  const ordered: ExecutionSpec = {
    id: spec.id,
    name: spec.name,
    nodes: spec.nodes.map(n => ({ id: n.id, type: n.type, label: n.label, ...(n.config ? { config: n.config } : {}) })),
    flow: spec.flow.map(e => ({ from: e.from, to: e.to, kind: e.kind, ...(e.branch ? { branch: e.branch } : {}), ...(e.label ? { label: e.label } : {}), ...(e.schema ? { schema: e.schema } : {}), })),
    ...(spec.layout ? { layout: spec.layout } : {}),
    version: spec.version ?? 1,
  };
  return YAML.stringify(ordered, { indent: 2, lineWidth: 120 });
}

export function yamlToSpec(src: string): ExecutionSpec {
  const doc = YAML.parse(src) as any;
  if (!doc || typeof doc !== 'object') throw new Error('Invalid YAML');
  // Minimal shape validation; deeper validation is handled elsewhere
  if (!doc.id || !doc.name) throw new Error('YAML missing required fields: id/name');
  if (!Array.isArray(doc.nodes)) throw new Error('YAML missing nodes array');
  if (!Array.isArray(doc.flow)) throw new Error('YAML missing flow array');

  const spec: ExecutionSpec = {
    id: String(doc.id),
    name: String(doc.name),
    nodes: doc.nodes.map((n: any) => ({ id: String(n.id), type: String(n.type), ...(n.label ? { label: String(n.label) } : {}), ...(n.config ? { config: n.config as Record<string, unknown> } : {}), })),
    flow: doc.flow.map((e: any) => ({ from: String(e.from), to: String(e.to), kind: (e.kind as any) ?? 'control', ...(e.branch ? { branch: String(e.branch) } : {}), ...(e.label ? { label: String(e.label) } : {}), ...(e.schema ? { schema: String(e.schema) } : {}), })),
    ...(doc.layout ? { layout: doc.layout } : {}),
    version: Number(doc.version ?? 1),
  };
  return spec;
}

export type YamlIssue = {
  message: string;
  line: number; // 1-based
  col: number; // 1-based
  endLine?: number;
  endCol?: number;
  severity: 'error' | 'warning';
};

// Parse YAML and collect positional issues (errors and warnings). This does not throw.
export function parseYamlWithIssues(src: string): { issues: YamlIssue[] } {
  try {
    const doc: any = (YAML as any).parseDocument(src, { prettyErrors: true });
    const rawIssues: any[] = [
      ...(doc?.errors ?? []),
      ...(doc?.warnings ?? []),
    ];
    const issues: YamlIssue[] = rawIssues.map((e: any) => {
      // YAML error objects expose linePos (array of { line, col }) in recent versions
      const start = e?.linePos?.[0] ?? e?.pos?.[0] ?? { line: 1, col: 1 };
      const end = e?.linePos?.[1] ?? e?.pos?.[1] ?? start;
      return {
        message: String(e?.message ?? 'YAML error'),
        line: Number(start.line ?? 1),
        col: Number(start.col ?? 1),
        endLine: Number(end.line ?? start.line ?? 1),
        endCol: Number(end.col ?? start.col ?? 1),
        severity: e?.name === 'YAMLWarning' ? 'warning' : 'error',
      } as YamlIssue;
    });
    return { issues };
  } catch (err: any) {
    // Fall back to a generic error without position
    return { issues: [{ message: String(err?.message ?? 'YAML parse failed'), line: 1, col: 1, severity: 'error' }] };
  }
}
