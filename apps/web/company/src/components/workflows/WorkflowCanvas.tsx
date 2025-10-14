"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { WorkflowToolbar } from './WorkflowToolbar';
import ReactFlowCanvas, { type AddNodeFn } from './flow/ReactFlowCanvas';
import { WorkflowCodeEditor } from './WorkflowCodeEditor';
import { CommandPalette } from '@/components/workflows/CommandPalette';
import { PropertiesPanel } from './PropertiesPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Code2, Play, Save } from 'lucide-react';
import type { Node } from '@xyflow/react';
import { useParams } from 'next/navigation';
import { useWorkflowStore } from '@/store/workflowStore';
import { createVersion, listVersions, restoreVersion, updateWorkflow, type WorkflowVersion } from '@/lib/workflows.client';
import { toExecutionSpec, fromExecutionSpec, validateExecutionSpec } from '@/lib/workflow.serialization';
import { getWorkflow } from '@/lib/workflows.client';

interface WorkflowCanvasProps {
  workflowId?: string;
  onBack: () => void;
  isCodeView: boolean;
  onToggleCodeView: () => void;
}

export function WorkflowCanvas({ workflowId: explicitWorkflowId, onBack, isCodeView, onToggleCodeView }: WorkflowCanvasProps) {
  const [selectedTool, setSelectedTool] = useState('cursor');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [pendingConnectorFrom, setPendingConnectorFrom] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [addNodeApi, setAddNodeApi] = useState<AddNodeFn | null>(null);
  const [flowApi, setFlowApi] = useState<{
    zoomIn: () => void; zoomOut: () => void; fitView: () => void; toggleMinimap: () => void; toggleGrid: () => void; updateNodeData: (id: string, data: Record<string, any>) => void; addEdge?: (fromId: string, toId: string, kind?: 'control'|'data'|'error') => void;
  } | null>(null);
  const params = useParams();
  const routeWorkflowId = (params?.id as string) || undefined;
  const workflowId = explicitWorkflowId || routeWorkflowId || (typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean).pop() : undefined);

  // Local autosave/versions state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<WorkflowVersion[] | null>(null);

  // Observe store workflow for dirty tracking
  const workflowSnapshot = useWorkflowStore((s) => s.workflow);
  const setWorkflow = useWorkflowStore((s) => (s as any).setWorkflow as (wf: any) => void);
  const workflowHash = useMemo(() => JSON.stringify({ nodes: workflowSnapshot.nodes, edges: workflowSnapshot.edges, meta: { name: workflowSnapshot.name } }), [workflowSnapshot.nodes, workflowSnapshot.edges, workflowSnapshot.name]);

  useEffect(() => {
    if (!workflowId) return;
    // Initial hydration from backend
    (async () => {
      try {
        const wf = await getWorkflow(workflowId);
        const spec = (wf?.graph as any) ?? null;
        if (spec && typeof spec === 'object') {
          let hydrated: any;
          try {
            hydrated = spec.nodes && spec.flow ? fromExecutionSpec(spec as any) : {
              id: wf.id,
              name: wf.name || 'Untitled Workflow',
              nodes: Array.isArray(spec.nodes) ? spec.nodes : [],
              edges: Array.isArray(spec.edges) ? spec.edges : [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
          } catch {
            hydrated = {
              id: wf.id,
              name: wf.name || 'Untitled Workflow',
              nodes: [],
              edges: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
          }
          // Ensure ID & name propagate even if empty graph
          hydrated.id = wf.id;
          hydrated.name = wf.name || hydrated.name;
          setWorkflow(hydrated as any);
        }
      } catch (e) {
        console.warn('Initial hydration failed', e);
      }
    })();
    // Debounced autosave every 30s when changes detected
    const interval = setInterval(async () => {
      try {
        setIsSaving(true);
        // 1) push current execution spec to backend (validate before versioning)
        const spec = toExecutionSpec(workflowSnapshot as any);
        await updateWorkflow(workflowId, { graph: spec });
        const valid = validateExecutionSpec(spec);
        // 2) create a new version if valid
        if (valid.ok) await createVersion(workflowId, 'Auto-save');
        setLastSavedAt(Date.now());
      } catch (e) {
        console.warn('Autosave failed', e);
      } finally {
        setIsSaving(false);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [workflowId, workflowHash, workflowSnapshot.nodes, workflowSnapshot.edges]);

  async function manualSave() {
    if (!workflowId) return;
    try {
      setIsSaving(true);
      const spec = toExecutionSpec(workflowSnapshot as any);
      await updateWorkflow(workflowId, { graph: spec });
      const valid = validateExecutionSpec(spec);
      if (valid.ok) {
        await createVersion(workflowId, 'Manual save');
      } else {
        console.warn('Validation failed, version not created', valid.errors);
      }
      setLastSavedAt(Date.now());
    } catch (e) {
      console.warn('Save failed', e);
    } finally {
      setIsSaving(false);
    }
  }

  async function openVersions() {
    if (!workflowId) return;
    try {
      const list = await listVersions(workflowId);
      setVersions(list);
      setVersionsOpen(true);
    } catch (e) {
      console.warn('Failed to load versions', e);
    }
  }

  async function handleRestore(versionId: string) {
    if (!workflowId) return;
    try {
      await restoreVersion(workflowId, versionId);
      // Re-fetch workflow and hydrate without full reload
      const wf = await getWorkflow(workflowId);
      const spec = (wf?.graph as any) ?? null;
      if (spec && typeof spec === 'object' && spec.nodes && spec.flow) {
        const hydrated = fromExecutionSpec(spec as any);
        setWorkflow(hydrated as any);
      }
    } catch (e) {
      console.warn('Restore failed', e);
    }
  }

  // Handle ESC key to dismiss panels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setSelectedNode(null);
        setShowPropertiesPanel(false);
        setSelectedTool('cursor');
        setPendingConnectorFrom(null);
      }
      // Toggle connector tool with C
      if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setSelectedTool((t) => (t === 'connector' ? 'cursor' : 'connector'));
      }
      // Text tool with T
      if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setSelectedTool('text');
      }
      // Split tool with D
      if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setSelectedTool((t) => (t === 'split' ? 'cursor' : 'split'));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show properties panel when node is selected via selection change (keyboard/marquee)
  useEffect(() => {
    setShowPropertiesPanel(!!selectedNode);
  }, [selectedNode]);

  const handleAddNode = () => {
    setShowCommandPalette(true);
  };

  const handleNodeCreated = (nodeType: string) => {
    // Add a node via React Flow API then close
    addNodeApi?.(nodeType);
    setShowCommandPalette(false);
  };

  const applyProperties = (data: Record<string, any>) => {
    if (selectedNode && flowApi) {
      flowApi.updateNodeData(selectedNode.id, data);
    }
  };

  if (isCodeView) {
    return <WorkflowCodeEditor onToggleView={onToggleCodeView} />;
  }

  return (
    <div className="h-full bg-background flex flex-col">
  {/* Builder Header (replaces global header in editor mode) */}
  <div id="workflow-builder-header" className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-border bg-card z-40" style={{ height: 'var(--app-header-height)' }}>
        <div className="flex items-center gap-4 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg font-semibold truncate" title={workflowSnapshot.name || workflowId}>
              {workflowSnapshot.name || 'Untitled Workflow'}
            </h1>
            <div className="text-[11px] text-muted-foreground" title={workflowId}>ID: {workflowId}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-xs text-muted-foreground pr-2">
            {isSaving ? 'Saving…' : lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'Not saved yet'}
          </div>
          <Button
            variant={isCodeView ? "default" : "outline"}
            size="sm"
            onClick={onToggleCodeView}
          >
            {isCodeView ? <Eye className="w-4 h-4 mr-2" /> : <Code2 className="w-4 h-4 mr-2" />}
            {isCodeView ? "Visual" : "Code"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => manualSave()}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={() => openVersions()}>
            History
          </Button>
          <Button size="sm">
            <Play className="w-4 h-4 mr-2" />
            Run Workflow
          </Button>
        </div>
      </div>

      {/* Full-Screen Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlowCanvas 
          mode={selectedTool === 'hand' ? 'pan' : 'select'}
          tool={selectedTool}
          onNodeSelect={setSelectedNode}
          onNodeClick={(node) => {
            if (selectedTool === 'connector') {
              if (!pendingConnectorFrom) {
                setPendingConnectorFrom(node.id);
              } else {
                if (flowApi?.addEdge) flowApi.addEdge(pendingConnectorFrom, node.id, 'control');
                setPendingConnectorFrom(null);
              }
              return; // do not toggle properties during connector mode
            }
            // Toggle: clicking the same node closes the panel; clicking any node opens
            if (selectedNode && node.id === selectedNode.id && showPropertiesPanel) {
              setShowPropertiesPanel(false);
              setSelectedNode(null);
            } else {
              setSelectedNode(node);
              setShowPropertiesPanel(true);
            }
          }}
          onPaneClick={(pos) => {
            // In text mode, click to add a text node at cursor
            if (selectedTool === 'text' && addNodeApi) {
              const id = addNodeApi('text', { position: pos as any, data: { label: 'Text' } as any });
              setSelectedTool('cursor');
              setSelectedNode({ id, position: pos as any } as any);
              setShowPropertiesPanel(true);
            }
            if (selectedTool === 'connector' && pendingConnectorFrom) {
              // cancel dangling connector on pane click
              setPendingConnectorFrom(null);
            }
          }}
          onSplitEdge={({ id, source, target }) => {
            // Insert a split (condition) node inline between source and target
            if (!addNodeApi || !flowApi?.addEdge) return;
            try {
              // 1) Create condition node near the midpoint
              // We don't have direct edge coordinates here; place relative to source node
              const state = (useWorkflowStore as any).getState?.();
              const src = state?.workflow?.nodes?.find((n: any) => n.id === source);
              const tgt = state?.workflow?.nodes?.find((n: any) => n.id === target);
              const mx = src && tgt ? (src.position.x + tgt.position.x) / 2 : (src?.position?.x ?? 100) + 80;
              const my = src && tgt ? (src.position.y + tgt.position.y) / 2 : (src?.position?.y ?? 100);
              const splitId = addNodeApi('condition', { position: { x: mx, y: my } as any, data: { label: 'Split' } as any });

              // 2) Remove the original edge and add two edges: source->split and split->target (default to 'true' branch)
              try { (useWorkflowStore as any).getState?.().removeEdges?.([id]); } catch {}

              // Connect source -> split (control)
              flowApi.addEdge(source, splitId, 'control');
              // Connect split -> target on default 'true' out port (handled in addEdge helper)
              flowApi.addEdge(splitId, target, 'control');

              // 3) Select the new split node and open properties
              setSelectedNode({ id: splitId } as any);
              setShowPropertiesPanel(true);
              setSelectedTool('cursor');
            } catch (e) {
              console.warn('Failed to insert split', e);
            }
          }}
          onAddNodeRequest={handleAddNode}
          onReady={({ addNode, zoomIn, zoomOut, fitView, toggleMinimap, toggleGrid, updateNodeData, addEdge }) => {
            setAddNodeApi(() => addNode);
            setFlowApi({ zoomIn, zoomOut, fitView, toggleMinimap, toggleGrid, updateNodeData, addEdge });
          }}
        />
        
        {/* Floating Toolbar */}
        <WorkflowToolbar
          selectedTool={selectedTool}
          onToolSelect={(tool) => {
            setSelectedTool(tool);
            // Quick actions: open palette or invoke flow controls for special IDs
            if (tool === 'codie') {
              setShowCommandPalette(true);
            }
          }}
        />

        {/* Command Palette Modal */}
        {showCommandPalette && (
          <CommandPalette
            onClose={() => setShowCommandPalette(false)}
            onNodeCreated={handleNodeCreated}
          />
        )}

        {/* Contextual Properties Panel */}
        <PropertiesPanel 
          selectedNode={selectedNode} 
          isVisible={showPropertiesPanel}
          onClose={() => {
            setSelectedNode(null);
            setShowPropertiesPanel(false);
          }}
          onApply={applyProperties}
        />

        {/* Bottom-left Zoom Controls */}
        <div
          className="absolute left-4 bottom-4 z-20 flex items-center gap-1.5 bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-lg p-1.5"
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onClick={(e) => { e.stopPropagation(); }}
        >
          <Button
            size="icon"
            variant="ghost"
            type="button"
            title="Zoom out"
            aria-label="Zoom out"
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onClick={(e) => { e.stopPropagation(); flowApi?.zoomOut(); }}
          >
            {/* proper minus sign (U+2212) */}
            <span className="text-2xl leading-none">−</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            type="button"
            title="Fit view"
            aria-label="Fit view"
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onClick={(e) => { e.stopPropagation(); flowApi?.fitView(); }}
          >
            <span className="text-2xl leading-none">·</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            type="button"
            title="Zoom in"
            aria-label="Zoom in"
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onClick={(e) => { e.stopPropagation(); flowApi?.zoomIn(); }}
          >
            <span className="text-2xl leading-none">+</span>
          </Button>
        </div>
      </div>
      {versionsOpen && (
        <div className="absolute right-4 top-[var(--app-header-height)] z-40 w-96 max-h-[60vh] overflow-auto rounded-lg border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
            <div className="font-semibold">Versions</div>
            <button className="text-sm text-muted-foreground" onClick={() => setVersionsOpen(false)}>Close</button>
          </div>
          <div className="divide-y divide-border/50">
            {(versions ?? []).map(v => (
              <div key={v.id} className="px-4 py-3 flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">{v.label || `Version ${v.id.slice(0, 6)}`}</div>
                  <div className="text-xs text-muted-foreground">{v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleRestore(v.id)}>Restore</Button>
                </div>
              </div>
            ))}
            {(!versions || versions.length === 0) && (
              <div className="px-4 py-6 text-sm text-muted-foreground">No versions yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
