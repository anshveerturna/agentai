"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WorkflowToolbar } from './WorkflowToolbar';
import ReactFlowCanvas, { type AddNodeFn } from './flow/ReactFlowCanvas';
import { WorkflowCodeEditor } from './WorkflowCodeEditor';
import { CommandPalette } from '@/components/workflows/CommandPalette';
import { PropertiesPanel } from './PropertiesPanel';
import { CommitDialog } from './CommitDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Code2, Play, Trash2 } from 'lucide-react';
import type { Node } from '@xyflow/react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/store/workflowStore';
import { createVersion, listVersions, restoreVersion, updateWorkflow, type WorkflowVersion, getWorkingCopy as apiGetWorkingCopy, updateWorkingCopy as apiUpdateWorkingCopy, commit as apiCommit } from '@/lib/workflows.client';
import { toExecutionSpec, fromExecutionSpec, validateExecutionSpec } from '@/lib/workflow.serialization';
import { getWorkflow } from '@/lib/workflows.client';

interface WorkflowCanvasProps {
  onBack: () => void;
  isCodeView: boolean;
  onToggleCodeView: () => void;
}

export function WorkflowCanvas({ onBack, isCodeView, onToggleCodeView }: WorkflowCanvasProps) {
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
  const workflowId = (params?.id as string) ?? undefined;
  const router = useRouter();

  // Local autosave/versions state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [lastSyncedHash, setLastSyncedHash] = useState<string | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<WorkflowVersion[] | null>(null);
  const [latestVersionMeta, setLatestVersionMeta] = useState<{ versionNumber?: number | null; semanticHash?: string | null } | null>(null);
  const [recentVersions, setRecentVersions] = useState<WorkflowVersion[]>([]);
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  // Prevent UI flash by gating canvas render until hydration completes for the current workflow
  const [hydrating, setHydrating] = useState<boolean>(false);
  const lastManualSaveAtRef = useRef<number>(0);
  const versionsPanelRef = useRef<HTMLDivElement | null>(null);
  const historyButtonRef = useRef<HTMLButtonElement | null>(null);
  // Subtle click-feedback states for header buttons
  type PressKey = 'code' | 'history' | 'commit'
  const [pressed, setPressed] = useState<{ code: boolean; history: boolean; commit: boolean }>({ code: false, history: false, commit: false });
  const flashPress = (key: PressKey) => {
    setPressed((p) => ({ ...p, [key]: true }));
    setTimeout(() => setPressed((p) => ({ ...p, [key]: false })), 140);
  };

  // Observe store workflow for dirty tracking
  const workflowSnapshot = useWorkflowStore((s) => s.workflow);
  const setWorkflow = useWorkflowStore((s) => (s as any).setWorkflow as (wf: any) => void);
  const updateNodeInStore = useWorkflowStore((s) => (s as any).updateNode as any);
  const [localName, setLocalName] = useState<string>(workflowSnapshot?.name || 'Untitled Workflow');
  useEffect(() => { setLocalName(workflowSnapshot?.name || 'Untitled Workflow'); }, [workflowSnapshot?.name]);
  const nameSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistName = (name: string) => {
    if (!workflowId) return;
    try { updateWorkflow(workflowId, { name }); } catch {}
  };
  const onNameChange = (val: string) => {
    setLocalName(val);
    // update store immediately for UI
    try {
      setWorkflow({ ...workflowSnapshot, name: val } as any);
    } catch {}
    // debounce backend update
    if (nameSaveTimer.current) clearTimeout(nameSaveTimer.current);
    nameSaveTimer.current = setTimeout(() => persistName(val), 500);
  };
  // Compute a normalized hash of the graph that ignores transient UI fields (like selection) and is order-insensitive.
  const stableStringify = (obj: any): string => {
    if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map((v) => stableStringify(v)).join(',') + ']';
    const keys = Object.keys(obj).sort();
    const entries = keys.map((k) => JSON.stringify(k) + ':' + stableStringify((obj as any)[k]));
    return '{' + entries.join(',') + '}';
  };

  const computeGraphHash = (wf: any) => {
    try {
      const normNodes = (wf?.nodes ?? [])
        .map((n: any) => ({
          id: n.id,
          label: n.label,
          kind: n.kind,
          position: { x: n?.position?.x ?? 0, y: n?.position?.y ?? 0 },
          size: n?.size ? { width: n.size.width ?? undefined, height: n.size.height ?? undefined } : undefined,
          ports: (n?.ports ?? [])
            .map((p: any) => ({ id: p.id, name: p.name, direction: p.direction, kind: p.kind }))
            .sort((a: any, b: any) => (a.id || '').localeCompare(b.id || '')),
          // config can be arbitrary; include as-is for semantics
          config: n?.config ?? undefined,
        }))
        .sort((a: any, b: any) => (a.id || '').localeCompare(b.id || ''));
      const normEdges = (wf?.edges ?? [])
        .map((e: any) => ({
          id: e.id,
          kind: e.kind,
          from: { nodeId: e?.from?.nodeId, portId: e?.from?.portId },
          to: { nodeId: e?.to?.nodeId, portId: e?.to?.portId },
        }))
        .sort((a: any, b: any) => (a.id || '').localeCompare(b.id || ''));
      const meta = { name: wf?.name ?? undefined };
      return stableStringify({ nodes: normNodes, edges: normEdges, meta });
    } catch {
      // fallback to basic representation
      return stableStringify({ nodes: wf?.nodes ?? [], edges: wf?.edges ?? [], meta: { name: wf?.name } });
    }
  };
  const workflowHash = useMemo(() => computeGraphHash(workflowSnapshot), [workflowSnapshot.nodes, workflowSnapshot.edges, workflowSnapshot.name]);
  const hasUnsaved = useMemo(() => {
    if (lastSavedAt == null) return false; // show "Not saved yet" until first successful sync
    const unsaved = lastSyncedHash !== workflowHash;
    if (unsaved) {
      console.log('[hasUnsaved] TRUE - lastSynced:', lastSyncedHash?.slice(0, 30), 'current:', workflowHash.slice(0, 30));
    }
    return unsaved;
  }, [lastSyncedHash, workflowHash, lastSavedAt]);
  // Keep minimal saved status only; hide commit-ready/hash chips per request

  async function refreshLatestVersion() {
    if (!workflowId) return;
    try {
      const list = await listVersions(workflowId);
      console.log('All versions from API:', list);
      // Only consider explicit commits (exclude autosaves/restores)
      const explicit = (list || []).filter(v => {
        const lbl = (v.label || v.name || '').trim();
        console.log('Filtering version:', { id: v.id, label: v.label, name: v.name, lbl });
        if (!lbl) return false;
        const lower = lbl.toLowerCase();
        if (lower.startsWith('revert')) return false;
        if (lower.includes('auto') && lower.includes('save')) return false; // handles 'autosave', 'auto-save', 'auto save'
        // Accept commits that have a label/name (explicit commits)
        return true;
      });
      console.log('Filtered explicit commits:', explicit);
      if (explicit && explicit.length) {
        const sorted = [...explicit].sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        const top = sorted[0];
        setLatestVersionMeta({ versionNumber: (top as any).versionNumber ?? null, semanticHash: (top as any).semanticHash ?? null });
        setRecentVersions(sorted.slice(0, 12));
      }
    } catch {}
  }

  // Initial hydration (runs once per workflowId) with id-stability and working-copy validation
  useEffect(() => {
    if (!workflowId) return;
    let cancelled = false;
    const myId = workflowId;
    // If the store already contains the requested workflow, render it immediately (zero delay)
    if (workflowSnapshot?.id === myId) {
      setHydrating(false);
      refreshLatestVersion();
      return;
    }
    setHydrating(true);
    (async () => {
      try {
        const working = await apiGetWorkingCopy(myId);
        if (!cancelled && working?.graph && (!working?.workflowId || working.workflowId === myId)) {
          const g = working.graph as any;
          const hydrated = (g && typeof g === 'object' && 'flow' in g)
            ? fromExecutionSpec(g)
            : (g?.nodes && g?.edges ? g : { id: myId, name: 'Untitled Workflow', nodes: [], edges: [] });
          // Try fetching workflow metadata to get name
          try {
            const wfMeta = await getWorkflow(myId);
            (hydrated as any).name = (wfMeta?.name as any) || (hydrated as any).name;
          } catch {}
          if (cancelled) return;
          setWorkflow(hydrated as any);
          try {
            const h = computeGraphHash(hydrated);
            setLastSyncedHash(h);
            setLastSavedAt(Date.now());
          } catch {}
          setHydrating(false);
          return;
        }
      } catch {}
      try {
        const wf = await getWorkflow(myId);
        if (cancelled) return;
        const spec = (wf?.graph as any) ?? null;
        const hydrated = (spec && typeof spec === 'object')
          ? (('flow' in spec) ? fromExecutionSpec(spec as any)
             : (spec.nodes && spec.edges ? spec : { id: myId, name: wf?.name || 'Untitled Workflow', nodes: [], edges: [] }))
          : { id: myId, name: wf?.name || 'Untitled Workflow', nodes: [], edges: [] };
        setWorkflow(hydrated as any);
        try {
          const h = computeGraphHash(hydrated);
          setLastSyncedHash(h);
          setLastSavedAt(Date.now());
        } catch {}
        setHydrating(false);
      } catch (e) {
        if (!cancelled) console.warn('Initial hydration failed', e);
        setHydrating(false);
      }
    })();
    refreshLatestVersion();
    return () => { cancelled = true; };
  }, [workflowId]);

  // Debounced working-copy sync (reacts to graph changes). No auto-commit.
  useEffect(() => {
    if (!workflowId) return;
    if (!autosaveEnabled) return;
    const timeout = setTimeout(async () => {
      // Skip autosave if a manual save just happened (small window to avoid races)
      if (Date.now() - lastManualSaveAtRef.current < 500) {
        console.log('[Autosave] Skipped (manual save just happened)');
        return;
      }
      try {
        setIsSaving(true);
        const spec = toExecutionSpec(workflowSnapshot as any);
        await apiUpdateWorkingCopy(workflowId, spec);
        // mark current snapshot as synced on success
        console.log('[Autosave] Setting lastSyncedHash to:', workflowHash.slice(0, 50));
        setLastSyncedHash(workflowHash);
        setLastSavedAt(Date.now());
      } catch (e) {
        console.warn('Working copy sync failed', e);
      } finally {
        setIsSaving(false);
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [workflowId, workflowHash, autosaveEnabled]);

  async function commitNow(name?: string, description?: string) {
    if (!workflowId) return;
    try {
      setIsSaving(true);
      // Validate snapshot and commit explicitly
      const snapshot = { ...workflowSnapshot } as any;
      const spec = toExecutionSpec(snapshot as any);
      const valid = validateExecutionSpec(spec);
      if (!valid.ok) {
        console.warn('Validation failed, commit skipped', valid.errors);
        setIsSaving(false);
        return;
      }
      // Ensure server working copy matches the current snapshot (covers when Autosave is off)
      try {
        await apiUpdateWorkingCopy(workflowId, spec);
      } catch {}
      // Commit with name and description
      console.log('Committing with name:', name, 'description:', description);
      await apiCommit(workflowId, name, description);
      console.log('Commit successful');
      await refreshLatestVersion();
      // If history panel is open, refresh its list so the new commit appears immediately
      if (versionsOpen) {
        try {
          const list = await listVersions(workflowId);
          console.log('Refreshing history panel, all versions:', list);
          const explicit = (list || []).filter(v => {
            const lbl = (v.label || v.name || '').trim();
            console.log('History panel filter:', { id: v.id, label: v.label, name: v.name, lbl });
            if (!lbl) return false;
            const lower = lbl.toLowerCase();
            if (lower.startsWith('revert')) return false;
            if (lower.includes('auto') && lower.includes('save')) return false;
            // Accept commits that have a label/name (explicit commits)
            return true;
          });
          console.log('History panel explicit commits:', explicit);
          setVersions(explicit);
        } catch {}
      }
      // Committing doesn't change working copy hash; status stays based on autosave
    } catch (e) {
      console.error('Commit failed', e);
    } finally {
      setIsSaving(false);
    }
  }

  async function openVersions() {
    if (!workflowId) return;
    try {
      const list = await listVersions(workflowId);
      // Only show explicit/manual commits (exclude autosave and restore entries)
      const explicit = (list || []).filter(v => {
        const lbl = (v.label || v.name || '').trim();
        if (!lbl) return false;
        const lower = lbl.toLowerCase();
        if (lower.startsWith('revert')) return false;
        if (lower.includes('auto') && lower.includes('save')) return false;
        // Accept commits that have a label/name (explicit commits)
        return true;
      });
      setVersions(explicit);
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
        try {
          const h = computeGraphHash(hydrated);
          setLastSyncedHash(h);
          setLastSavedAt(Date.now());
        } catch {}
      }
    } catch (e) {
      console.warn('Restore failed', e);
    }
  }

  async function handleDeleteVersion(versionId: string) {
    if (!workflowId) return;
    const ok = window.confirm('Delete this version? This cannot be undone.');
    if (!ok) return;
    try {
      const { deleteVersion } = await import('@/lib/workflows.client');
      await deleteVersion(workflowId, versionId);
      await refreshLatestVersion();
      // refresh panel list with filter
      try {
        const list = await listVersions(workflowId);
        const explicit = (list || []).filter(v => {
          const lbl = (v.label || v.name || '').trim();
          if (!lbl) return false;
          const lower = lbl.toLowerCase();
          if (lower.startsWith('revert')) return false;
          if (lower.includes('auto') && lower.includes('save')) return false;
          // Accept commits that have a label/name (explicit commits)
          return true;
        });
        setVersions(explicit);
      } catch {}
    } catch (e) {
      console.warn('Delete version failed', e);
    }
  }


  // Handle ESC key to dismiss panels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore hotkeys when typing in inputs/textareas/selects or contenteditable fields
      const target = (e.target as HTMLElement) || null;
      const tag = (target?.tagName || '').toLowerCase();
      const isEditable = !!(
        target && (
          (target as HTMLElement).isContentEditable ||
          tag === 'input' ||
          tag === 'textarea' ||
          tag === 'select' ||
          // editors/textboxes
          target.closest?.('[contenteditable="true"], [role="textbox"], .cm-editor, .CodeMirror')
        )
      );
      if (isEditable) return;
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setSelectedNode(null);
        setShowPropertiesPanel(false);
        setSelectedTool('cursor');
        setPendingConnectorFrom(null);
        setVersionsOpen(false);
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
      // Group selected nodes with G
      if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        // Prefer store selection set (more reliable than transient node.selected flags)
        const selIds = Array.from(useWorkflowStore.getState().selection.nodes);
        const selectedNodeIds = selIds.length ? selIds : Array.from(workflowSnapshot.nodes.filter(n => n.selected).map(n => n.id));
        if (selectedNodeIds.length >= 2) {
          const groupNodes = useWorkflowStore.getState().groupNodes;
          const id = groupNodes(selectedNodeIds);
          if (!id) {
            console.warn('[Group] Failed to create group from ids', selectedNodeIds);
          }
        } else {
          console.info('[Group] Need at least 2 nodes selected (have', selectedNodeIds.length, ')');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close versions panel on outside click
  useEffect(() => {
    if (!versionsOpen) return;
    const onDown = (e: MouseEvent) => {
      const panel = versionsPanelRef.current;
      const button = historyButtonRef.current;
      if (!panel) return;
      
      const target = e.target as HTMLElement;
      // Don't close if clicking inside the panel or on the History button
      if (panel.contains(target) || (button && button.contains(target))) {
        return;
      }
      
      setVersionsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [versionsOpen]);

  // Only close properties panel when selection clears; do not auto-open on single selection
  useEffect(() => {
    if (!selectedNode) setShowPropertiesPanel(false);
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

  const relativeTime = useMemo(() => {
    if (!lastSavedAt) return 'Not saved yet';
    const diff = Date.now() - lastSavedAt;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `Saved ${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `Saved ${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `Saved ${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `Saved ${day}d ago`;
  }, [lastSavedAt]);

  if (!workflowId) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">No workflow selected. Return to list to pick or create one.</p>
        <Button onClick={() => { onBack(); router.push('/workflows'); }}>
          Back to Workflows
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card z-40">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="h-6 w-px bg-border mx-2" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Workflow:</span>
            <input
              value={localName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => { e.stopPropagation(); }}
              className="bg-transparent border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Untitled Workflow"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground pr-2 min-w-[140px] text-right">
            {isSaving ? 'Syncing…' : hasUnsaved ? 'Unsaved changes' : relativeTime}
          </div>
          {/* Autosave toggle */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground mr-2 select-none">
            <input
              type="checkbox"
              className="accent-primary"
              checked={autosaveEnabled}
              onChange={(e) => setAutosaveEnabled(e.target.checked)}
            />
            Autosave
          </label>
          <Button
            variant={isCodeView ? "default" : "outline"}
            size="sm"
            onMouseDown={() => flashPress('code')}
            onClick={onToggleCodeView}
            className={`transition-colors duration-150 ${pressed.code ? 'bg-primary/10 border-primary/50 text-primary' : ''}`}
          >
            {isCodeView ? <Eye className="w-4 h-4 mr-2" /> : <Code2 className="w-4 h-4 mr-2" />}
            {isCodeView ? "Visual" : "Code"}
          </Button>
          <Button
            ref={historyButtonRef}
            variant="outline"
            size="sm"
            aria-pressed={versionsOpen}
            onMouseDown={() => flashPress('history')}
            onClick={() => {
              if (versionsOpen) {
                setVersionsOpen(false);
              } else {
                openVersions();
              }
            }}
            className={`transition-colors duration-150 ${versionsOpen ? 'bg-blue-500/80 hover:bg-blue-500 text-white border-transparent' : ''} ${!versionsOpen && pressed.history ? 'bg-primary/10 border-primary/50 text-primary' : ''}`}
          >
            History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onMouseDown={() => flashPress('commit')}
            onClick={() => setShowCommitDialog(true)}
            className={`transition-colors duration-150 ${pressed.commit ? 'bg-primary/10 border-primary/50 text-primary' : ''}`}
          >
            Commit
          </Button>
          <Button size="sm" className="bg-emerald-500/80 hover:bg-emerald-500 text-white border-transparent">
            <Play className="w-4 h-4 mr-2" />
            Run Workflow
          </Button>
        </div>
      </div>

      {/* Full-Screen Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {hydrating ? (
          <div className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-[1px] z-30">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-full bg-primary animate-pulse" />
              Loading workflow…
            </div>
          </div>
        ) : null}
        {!hydrating && (
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
            // Single-click: select only, do not open properties
            setSelectedNode(node);
          }}
          onNodeDoubleClick={(node) => {
            // Suppress properties panel for text nodes
            if (selectedTool === 'connector') return;
            const isText = (node as any)?.data?.nodeType === 'text' || (node as any)?.data?.config?.nodeType === 'text';
            setSelectedNode(node);
            if (!isText) {
              setShowPropertiesPanel(true);
            } else {
              // If panel was open for previous node, close it when double-clicking text
              if (showPropertiesPanel) setShowPropertiesPanel(false);
            }
          }}
          onPaneClick={(pos) => {
            // Disable click-to-create for text tool so drag-to-size is primary
            if (selectedTool === 'connector' && pendingConnectorFrom) {
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
        )}
        
        {/* Floating Toolbar */}
        {!hydrating && (
        <WorkflowToolbar
          selectedTool={selectedTool}
          onToolSelect={(tool) => {
            // Handle group button - instant action, not a toggle tool
            if (tool === 'group') {
              const selIds = Array.from(useWorkflowStore.getState().selection.nodes);
              const selectedNodeIds = selIds.length ? selIds : Array.from(workflowSnapshot.nodes.filter(n => n.selected).map(n => n.id));
              if (selectedNodeIds.length >= 2) {
                const { groupNodes, selectNodes } = useWorkflowStore.getState();
                const groupId = groupNodes(selectedNodeIds);
                if (groupId) {
                  // Select the new group immediately
                  selectNodes([groupId]);
                } else {
                  console.warn('[Group] groupNodes returned null');
                }
              } else {
                console.log('Please select 2 or more nodes to group (currently', selectedNodeIds.length, ')');
              }
              return; // keep current tool
            }
            
            setSelectedTool(tool);
            // Quick actions: open palette or invoke flow controls for special IDs
            if (tool === 'codie') {
              setShowCommandPalette(true);
            }
          }}
        />
        )}

        {/* Command Palette Modal */}
        {!hydrating && showCommandPalette && (
          <CommandPalette
            onClose={() => setShowCommandPalette(false)}
            onNodeCreated={handleNodeCreated}
          />
        )}

        {/* Contextual Properties Panel */}
        {!hydrating && (
        <PropertiesPanel 
          selectedNode={selectedNode} 
          isVisible={showPropertiesPanel}
          onClose={() => {
            setSelectedNode(null);
            setShowPropertiesPanel(false);
          }}
          onApply={applyProperties}
        />
        )}

        {/* Bottom-left Zoom Controls */}
        {!hydrating && (
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
        )}
      </div>
      {versionsOpen && (
        <div ref={versionsPanelRef} className="absolute right-4 top-16 z-50 w-96 max-h-[60vh] overflow-auto rounded-lg border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
            <div className="font-semibold">Versions</div>
            <button
              aria-label="Close versions"
              onClick={() => setVersionsOpen(false)}
              className="h-5 w-5 rounded-full flex items-center justify-center group"
              title="Close"
            >
              <span className="relative block h-4 w-4 rounded-full bg-red-500/80 group-hover:bg-red-500">
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[12px] font-extrabold text-red-950">×</span>
              </span>
            </button>
          </div>
          <div className="divide-y divide-border/50">
            {(versions ?? []).map(v => (
              <div key={v.id} className="px-4 py-3 flex items-center justify-between">
                <div className="text-sm flex-1 min-w-0 mr-4">
                  <div className="font-medium truncate" title={v.label || v.name || `Version ${v.id.slice(0, 6)}`}>
                    {v.label || v.name || `Version ${v.id.slice(0, 6)}`}
                  </div>
                  {v.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2" title={v.description}>
                      {v.description}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5">{v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" className="min-w-[96px]" onClick={() => handleRestore(v.id)}>Restore</Button>
                  <Button size="sm" className="min-w-[96px] bg-red-500/80 hover:bg-red-500 text-white border-transparent" onClick={() => handleDeleteVersion(v.id)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            ))}
            {(!versions || versions.length === 0) && (
              <div className="px-4 py-6 text-sm text-muted-foreground">No versions yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Commit Dialog */}
      <CommitDialog
        isOpen={showCommitDialog}
        onClose={() => setShowCommitDialog(false)}
        onCommit={async (name, description) => {
          await commitNow(name, description);
          setShowCommitDialog(false);
        }}
        isSaving={isSaving}
      />
    </div>
  );
}
