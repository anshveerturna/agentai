"use client";
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code, Download, Upload, Eye, EyeOff } from 'lucide-react';
// Monaco is dynamically imported on the client to avoid SSR evaluating window-dependent code.
import { useWorkflowStore } from '@/store/workflowStore';
import { toExecutionSpec, fromExecutionSpec, validateExecutionSpec } from '@/lib/workflow.serialization';
import { specToYaml, yamlToSpec, parseYamlWithIssues } from '@/lib/workflow.yaml';
import { validateSpecSchema } from '@/lib/workflow.schemaValidation';

interface WorkflowCodeEditorProps {
  onToggleView?: () => void;
}

export function WorkflowCodeEditor({ onToggleView }: WorkflowCodeEditorProps) {
  // Instrumentation: identify which version is mounting at runtime
  useEffect(() => {
    // This log helps confirm the Monaco-enabled component is actually rendered in the browser
    // If you do NOT see this in the browser console, a different (old) component bundle is being served.
    console.log('[WorkflowCodeEditor] Monaco-enabled component mounted');
  }, []);
  const wf = useWorkflowStore((s) => s.workflow);
  const setWorkflow = useWorkflowStore((s) => (s as any).setWorkflow as (wf: any) => void);
  const [code, setCode] = useState<string>('');
  const [EditorComp, setEditorComp] = useState<any>(null);
  const [editorReady, setEditorReady] = useState(false);
  const monacoRef = useRef<any>(null);
  const editorRef = useRef<any>(null);
  const [issues, setIssues] = useState<Array<{ message: string; line: number; col: number; endLine?: number; endCol?: number; severity: 'error' | 'warning' }>>([]);

  const [showPreview, setShowPreview] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const isScrollingRef = useRef(false);
  const scrollStopTimerRef = useRef<number | null>(null);
  const parseTimerRef = useRef<number | null>(null);

  // Compute line count for gutter
  const lines = code.split('\n').length;

  // Keep gutter scrolled in sync with textarea
  const handleScroll = () => {
    const ta = document.querySelector('.monaco-scrollable-element .scrollbar.vertical .slider') as HTMLElement | null;
    const gutter = gutterRef.current;
    if (!ta || !gutter) return;
    // Best effort: sync gutter to Monaco editor scroll via container scrollTop
    const editorDom = document.querySelector('.monaco-scrollable-element') as HTMLElement | null;
    if (!editorDom) return;
    gutter.scrollTop = editorDom.scrollTop;
  };

  // Compute cursor line/col for the status bar
  const updateCursor = (lineNumber?: number, column?: number) => {
    if (typeof lineNumber === 'number' && typeof column === 'number') {
      setCursorPos({ line: lineNumber, col: column });
      return;
    }
    // Fallback
    const parts = code.split('\n');
    setCursorPos({ line: parts.length, col: (parts[parts.length - 1] || '').length + 1 });
  };

  useEffect(() => {
    updateCursor();
  }, [code]);

  // Initialize editor content from current visual workflow
  useEffect(() => {
    try {
      const spec = toExecutionSpec(wf as any);
      const yaml = specToYaml(spec);
      setCode(yaml);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamically load Monaco editor only on client and configure loader to use local ESM (CSP-safe)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === 'undefined') return; // extra guard
      try {
        const monacoReact = await import('@monaco-editor/react');
        const monaco = await import('monaco-editor/esm/vs/editor/editor.api');
        // Configure @monaco-editor/react to use our ESM monaco instance instead of CDN
        monacoReact.loader.config({ monaco });
        // Load YAML language contributions
        await import('monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution');
        if (!cancelled) {
          setEditorComp(() => monacoReact.default as any);
          setEditorReady(true);
        }
      } catch (e) {
        // If monaco fails to load, keep editor hidden to avoid crashing SSR
        console.error('Failed to initialize Monaco editor:', e);
      }
    })();
    return () => {
      cancelled = true;
      // clear timers if any were scheduled
      if (parseTimerRef.current) {
        window.clearTimeout(parseTimerRef.current);
        parseTimerRef.current = null;
      }
      if (scrollStopTimerRef.current) {
        window.clearTimeout(scrollStopTimerRef.current);
        scrollStopTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-[--editor-bg]" style={{
      // VSCode-like dark palette
      // You can tune these CSS variables to align with your theme
      // without affecting the rest of the app.
      ['--editor-bg' as any]: 'rgb(10 16 28)',
      ['--editor-panel' as any]: 'rgb(17 25 39)',
      ['--editor-border' as any]: 'rgb(51 65 85)',
      ['--editor-muted' as any]: 'rgb(148 163 184)',
      ['--editor-fg' as any]: 'rgb(226 232 240)'
    }}>
      {/* Editor Header */}
      <div className="h-12 border-b border-[--editor-border]/60 flex items-center justify-between px-4 bg-[--editor-panel]">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleView}
            className="text-[--editor-muted] hover:text-[--editor-fg]"
          >
            <Eye className="w-4 h-4 mr-2" />
            Back to Visual
          </Button>
          <div className="h-6 w-px bg-[--editor-border] mx-2" />
          <Code className="w-4 h-4 text-[--editor-muted]" />
          <span className="font-medium text-[--editor-fg]">Workflow Code</span>
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-md bg-[--editor-border]/40 text-[--editor-muted] tracking-wide">MONACO</span>
          <span className="text-xs text-[--editor-muted]">YAML</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-[--editor-muted] hover:text-[--editor-fg]">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="ghost" size="sm" className="text-[--editor-muted] hover:text-[--editor-fg]">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-[--editor-muted] hover:text-[--editor-fg]"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>
      </div>

      {/* Tab bar (removed faux window controls) */}
      <div className="border-b border-[--editor-border]/60 bg-[--editor-bg]">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-t-md bg-[--editor-panel] border border-b-0 border-[--editor-border]/60 text-[--editor-fg] text-sm shadow-sm">
                workflow.yaml
              </div>
            </div>
          </div>
          <div className="text-xs text-[--editor-muted]">Spaces: 2 | UTF-8 | LF | YAML</div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex">
        {/* Code Editor */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} flex flex-col`}> 
          <div className="flex-1 relative border-x border-[--editor-border]/60 bg-[--editor-bg]" onScroll={handleScroll}>
            {/* Gutter (line numbers) */}
            <div
              ref={gutterRef}
              className="absolute left-0 top-0 h-full w-12 overflow-hidden select-none text-right pr-2 pt-4 text-xs text-[--editor-muted] border-r border-[--editor-border]/60 bg-[--editor-bg]"
              aria-hidden="true"
            >
              <div className="inline-block w-full">
                {Array.from({ length: lines }).map((_, i) => (
                  <div key={i} className="leading-6 tabular-nums">{i + 1}</div>
                ))}
              </div>
            </div>

            {/* Monaco Editor */}
            <div className="absolute inset-0 pl-12">
              {editorReady && EditorComp ? (
                <EditorComp
                  height="100%"
                  defaultLanguage="yaml"
                  theme="vs-dark"
                  value={code}
                  onChange={(value: string | undefined) => {
                    const text = value ?? '';
                    setCode(text);
                    // Update YAML syntax + schema diagnostics markers (combined)
                    try {
                      const syntax = parseYamlWithIssues(text).issues;
                      const schema = validateSpecSchema(text).issues;
                      const combined = [...syntax, ...schema];
                      setIssues(combined);
                      const monaco = monacoRef.current;
                      const model = monaco?.editor?.getModels?.()?.[0];
                      if (monaco && model) {
                        monaco.editor.setModelMarkers(
                          model,
                          'yaml-check',
                          combined.map((i) => ({
                            startLineNumber: i.line,
                            startColumn: i.col,
                            endLineNumber: i.endLine ?? i.line,
                            endColumn: i.endCol ?? i.col + 1,
                            message: i.message,
                            severity: i.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
                          }))
                        );
                      }
                    } catch {}
                    // debounce + pause while scrolling
                    if (parseTimerRef.current) {
                      window.clearTimeout(parseTimerRef.current);
                      parseTimerRef.current = null;
                    }
                    const schedule = () => {
                      if (isScrollingRef.current) {
                        // try again shortly after scroll settles
                        parseTimerRef.current = window.setTimeout(schedule, 150);
                        return;
                      }
                      try {
                        const spec = yamlToSpec(text);
                        const valid = validateExecutionSpec(spec);
                        if (valid.ok) {
                          const wfHydrated = fromExecutionSpec(spec);
                          setWorkflow(wfHydrated as any);
                        }
                      } catch {
                        // ignore parse errors and keep previous visual state
                      }
                    };
                    parseTimerRef.current = window.setTimeout(schedule, 200);
                  }}
                  onMount={(editor: any, monaco: any) => {
                    try {
                      editor?.onDidChangeCursorPosition?.((e: any) => updateCursor(e.position.lineNumber, e.position.column));
                      editorRef.current = editor;
                      monacoRef.current = monaco;
                      // detect scroll and pause parsing until it settles
                      editor?.onDidScrollChange?.(() => {
                        isScrollingRef.current = true;
                        if (scrollStopTimerRef.current) {
                          window.clearTimeout(scrollStopTimerRef.current);
                        }
                        scrollStopTimerRef.current = window.setTimeout(() => {
                          isScrollingRef.current = false;
                        }, 150);
                      });
                    } catch {}
                  }}
                  options={{
                    fontSize: 13,
                    fontLigatures: true,
                    minimap: { enabled: false },
                    lineNumbers: 'off',
                    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                    scrollBeyondLastLine: false,
                    padding: { top: 16, bottom: 16 },
                    renderLineHighlight: 'all',
                    renderWhitespace: 'none',
                    wordWrap: 'off',
                    bracketPairColorization: { enabled: true },
                    tabSize: 2,
                    smoothScrolling: true,
                    automaticLayout: true,
                  }}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[--editor-muted]">
                  Loading editor…
                </div>
              )}
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="h-6 bg-[--editor-panel] border-t border-[--editor-border]/60 flex items-center justify-between px-3 text-[11px] text-[--editor-muted]">
            <span>YAML • Ln {cursorPos.line}, Col {cursorPos.col}</span>
            <span>LF • UTF-8</span>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/2 border-l border-[--editor-border]/60 flex flex-col bg-[--editor-bg]">
            <div className="h-10 border-b border-[--editor-border]/60 flex items-center px-4 text-sm font-medium text-[--editor-fg] bg-[--editor-panel]">
              Visual Preview
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Workflow Info */}
                <div className="p-3 rounded-lg border border-[--editor-border]/60 bg-[--editor-panel]">
                  <h3 className="font-medium mb-2 text-[--editor-fg]">Workflow Information</h3>
                  <div className="space-y-1 text-sm text-[--editor-muted]">
                    <div><strong>Name:</strong> Untitled Workflow</div>
                    <div><strong>Description:</strong> A new workflow</div>
                    <div><strong>Steps:</strong> 2</div>
                    <div><strong>Connections:</strong> 2</div>
                  </div>
                </div>

                {/* Triggers */}
                <div className="p-3 rounded-lg border border-[--editor-border]/60 bg-[--editor-panel]">
                  <h3 className="font-medium mb-2 text-[--editor-fg]">Triggers</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-[--editor-fg]">Webhook Trigger</span>
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div className="p-3 rounded-lg border border-[--editor-border]/60 bg-[--editor-panel]">
                  <h3 className="font-medium mb-2 text-[--editor-fg]">Steps</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-[--editor-fg]">Process Data</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm text-[--editor-fg]">AI Analysis</span>
                    </div>
                  </div>
                </div>

                {/* Validation Status */}
                <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-300">
                      Configuration Valid
                    </span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
