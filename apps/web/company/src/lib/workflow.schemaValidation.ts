import Ajv, { ErrorObject } from 'ajv';
import schema from './workflow.schema.json';
import YAML from 'yaml';
import type { YamlIssue } from './workflow.yaml';

// Compile AJV once (schema is static)
const ajv = new Ajv({ allErrors: true } as any);
const validate = ajv.compile(schema as any);

type DocNode = any;

function jsonPointerToPath(ptr: string): Array<string | number> {
  if (!ptr || ptr === '') return [];
  return ptr
    .split('/')
    .slice(1)
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))
    .map((s) => (s.match(/^\d+$/) ? Number(s) : s));
}

function buildLineStarts(src: string): number[] {
  const starts: number[] = [0];
  for (let i = 0; i < src.length; i++) {
    if (src.charCodeAt(i) === 10 /* \n */) starts.push(i + 1);
  }
  return starts;
}

function offsetToLineCol(offset: number, lineStarts: number[]): { line: number; col: number } {
  // binary search for greatest lineStart <= offset
  let lo = 0, hi = lineStarts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lineStarts[mid] <= offset) lo = mid + 1; else hi = mid - 1;
  }
  const lineIdx = Math.max(0, hi);
  const col = offset - lineStarts[lineIdx] + 1;
  return { line: lineIdx + 1, col };
}

function getNodeAtPath(doc: any, path: Array<string | number>): DocNode | undefined {
  try {
    // The second arg true returns the node itself rather than its value
    return (doc as any).getIn(path, true);
  } catch {
    return undefined;
  }
}

function nodeRange(node: any): { start: number; end: number } | undefined {
  if (!node) return undefined;
  if (Array.isArray(node.range) && node.range.length >= 2) {
    return { start: node.range[0] as number, end: node.range[1] as number };
  }
  const srcToken = (node as any).srcToken as any;
  if (srcToken && typeof srcToken?.offset === 'number' && typeof srcToken?.end === 'number') {
    return { start: srcToken.offset, end: srcToken.end };
  }
  return undefined;
}

export function validateSpecSchema(yamlSrc: string): { issues: YamlIssue[] } {
  const issues: YamlIssue[] = [];
  let js: any;
  let doc: any;
  try {
    doc = YAML.parseDocument(yamlSrc, { keepCstNodes: true, prettyErrors: true } as any);
    js = doc.toJS({ mapAsMap: false });
  } catch (e: any) {
    // If YAML can't parse, defer to syntax layer; no schema issues
    return { issues };
  }

  const ok = validate(js);
  if (ok) return { issues };

  const lineStarts = buildLineStarts(yamlSrc);
  const ajvErrors = (validate.errors ?? []) as ErrorObject[];
  for (const err of ajvErrors) {
    const basePath = jsonPointerToPath(((err as any).instancePath || (err as any).dataPath || '') as string);
    const path = err.keyword === 'required' && (err.params as any)?.missingProperty
      ? [...basePath, (err.params as any).missingProperty]
      : basePath;
    let node = getNodeAtPath(doc, path);
    if (!node) {
      // Fallback to parent node if exact missing
      node = getNodeAtPath(doc, basePath) ?? doc?.contents;
    }
    const r = nodeRange(node);
    const start = r ? offsetToLineCol(r.start, lineStarts) : { line: 1, col: 1 };
    const end = r ? offsetToLineCol(r.end, lineStarts) : start;
    const message = err.keyword === 'required' && (err.params as any)?.missingProperty
      ? `Missing required property: ${(err.params as any).missingProperty}`
      : (err.message || 'Schema validation error');
    issues.push({
      message,
      line: start.line,
      col: start.col,
      endLine: end.line,
      endCol: end.col,
      severity: 'error'
    });
  }
  return { issues };
}
