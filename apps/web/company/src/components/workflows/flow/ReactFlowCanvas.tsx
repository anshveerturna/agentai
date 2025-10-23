"use client";
import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Connection,
  Edge,
  Node,
  NodeTypes,
  ReactFlowInstance,
  MarkerType,
  ConnectionMode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkflowStore } from '@/store/workflowStore';
import type { NodeModel, Port } from '@/types/workflow';
import ActionNode, { type ActionNodeData } from './nodes/ActionNode';
import { ActionLibrary } from '@/components/workflows/ActionLibrary';

export type AddNodeFn = (type: string, initial?: Partial<Node>) => string;

export interface ReactFlowCanvasProps {
  onNodeSelect?: (node: Node | null) => void;
  onNodeClick?: (node: Node) => void;
  onPaneClick?: (pos: { x: number; y: number }) => void;
  onAddNodeRequest?: () => void;
  // current tool id to allow contextual interactions (e.g., split insertion on edge click)
  tool?: 'cursor'|'hand'|'connector'|'split'|'text'|string;
  // when tool === 'split', clicking an edge should trigger this
  onSplitEdge?: (edge: { id: string; source: string; target: string }) => void;
  onReady?: (api: {
    addNode: AddNodeFn;
    instance: ReactFlowInstance<any, any>;
    zoomIn: () => void;
    zoomOut: () => void;
    fitView: () => void;
    toggleMinimap: () => void;
    toggleGrid: () => void;
    setMode: (mode: 'pan' | 'select') => void;
    updateNodeData: (id: string, data: Record<string, any>) => void;
    addEdge: (fromId: string, toId: string, kind?: 'control' | 'data' | 'error') => void;
  }) => void;
  mode?: 'pan' | 'select';
  initialMinimap?: boolean;
  initialGrid?: boolean;
}

export default function ReactFlowCanvas({ onNodeSelect, onNodeClick, onPaneClick, onAddNodeRequest, onReady, tool, mode = 'select', initialMinimap = true, initialGrid = true, onSplitEdge }: ReactFlowCanvasProps) {
  // Local rf helpers
  const [rfSelection, setRfSelection] = useState<string | null>(null);
  const [instance, setInstance] = useState<ReactFlowInstance<any, any> | null>(null);
  const [showMinimap, setShowMinimap] = useState(initialMinimap);
  const [showGrid, setShowGrid] = useState(initialGrid);
  const [ignoreNextSelection, setIgnoreNextSelection] = useState(false);
  const nodeTypes: NodeTypes = useMemo(() => ({ action: ActionNode as any }), []);

  // Store bindings
  const {
    workflow,
    viewport,
    setViewport,
    addNode: storeAddNode,
    updateNode,
    moveNodes,
    removeNodes,
    addEdge: storeAddEdge,
    selectNodes,
    selectEdges,
    clearSelection,
  } = useWorkflowStore((s) => ({
    workflow: s.workflow,
    viewport: s.viewport,
    setViewport: s.setViewport,
    addNode: s.addNode,
    updateNode: s.updateNode,
    moveNodes: s.moveNodes,
    removeNodes: s.removeNodes,
    addEdge: s.addEdge,
    selectNodes: s.selectNodes,
    selectEdges: s.selectEdges,
    clearSelection: s.clearSelection,
  }));
  const selectedEdgeIds = useWorkflowStore((s) => s.selection.edges);

  // nodes/edges mapping
  const rfNodes = useMemo<Node[]>(() => (
    workflow.nodes.map((n: NodeModel) => ({
      id: n.id,
      type: 'action',
      position: { x: n.position.x, y: n.position.y },
      data: { 
        label: n.label, 
        kind: n.kind, 
        config: n.config,
        nodeType: (n as any)?.config?.nodeType || 'action',
        ports: n.ports,
      } as any,
      selected: !!n.selected,
      width: n.size?.width,
      height: n.size?.height,
    }))
  ), [workflow.nodes]);

  const rfEdges = useMemo<Edge[]>(() =>
    workflow.edges.map((e) => {
      const isSelected = selectedEdgeIds?.has?.(e.id) ?? false;
      const color = e.kind === 'error' ? '#f87171' : e.kind === 'data' ? '#a78bfa' : '#60a5fa';
      return {
        id: e.id,
        source: e.from.nodeId,
        target: e.to.nodeId,
        sourceHandle: e.from.portId as any,
        targetHandle: e.to.portId as any,
        selectable: true,
        interactionWidth: 8,
        selected: isSelected,
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color },
        style: {
          stroke: color,
          strokeWidth: isSelected ? 2.5 : 2,
          strokeDasharray: e.kind === 'error' ? '5,5' : undefined,
        },
        type: 'smoothstep',
      } as Edge;
    })
  , [workflow.edges, selectedEdgeIds]);

  // connection handler to store
  const onConnect = useCallback((connection: Edge | Connection) => {
    const c = connection as Connection;
    const { source, target, sourceHandle, targetHandle } = c;
    if (!source || !target) return;
    const fromNode = workflow.nodes.find((n) => n.id === source);
    const toNode = workflow.nodes.find((n) => n.id === target);
    if (!fromNode || !toNode) return;
    const findPort = (list: Port[], dir: 'in'|'out') => list.find((p) => p.direction === dir)?.id;
    const fromPort = (sourceHandle as string) || findPort(fromNode.ports || [], 'out') || (fromNode.ports[0]?.id as string);
    const toPort = (targetHandle as string) || findPort(toNode.ports || [], 'in') || (toNode.ports[0]?.id as string);
    if (fromPort && toPort) {
      storeAddEdge({ from: { nodeId: fromNode.id, portId: fromPort }, to: { nodeId: toNode.id, portId: toPort }, kind: 'control' });
    }
  }, [workflow.nodes, storeAddEdge]);

  // add node via store
  const addNode: AddNodeFn = useCallback((type: string, initial?: Partial<Node>) => {
    const deriveNodeType = (t: string) => (
      t === 'text' ? 'text'
      : t === 'condition' || t === 'split' ? 'condition'
      : t.includes('http') ? 'http'
      : t.includes('table') ? 'table'
      : t.includes('interface') ? 'interface'
      : t.includes('chat') || t.includes('bot') ? 'chat'
      : t.includes('agent') ? 'agent'
      : 'action'
    );
    const nodeType = deriveNodeType(type);
    const kind: NodeModel['kind'] = type === 'trigger' ? 'trigger' : (type === 'condition' || type === 'split') ? 'condition' : 'custom';
    let ports: Port[] = [];
    let size = { width: 220, height: 80 };
    if (type === 'text') {
      ports = [];
      size = { width: 200, height: 28 };
    } else if (type === 'condition' || type === 'split') {
      ports = [
        { id: crypto.randomUUID(), name: 'in', direction: 'in', kind: 'control' } as Port,
        { id: crypto.randomUUID(), name: 'true', direction: 'out', kind: 'control' } as Port,
        { id: crypto.randomUUID(), name: 'false', direction: 'out', kind: 'control' } as Port,
      ];
      size = { width: 220, height: 90 };
    } else {
      ports = [
        { id: crypto.randomUUID(), name: 'in', direction: 'in', kind: 'control' } as Port,
        { id: crypto.randomUUID(), name: 'out', direction: 'out', kind: 'control' } as Port,
      ];
    }
    const id = storeAddNode({
      kind,
      label: (initial?.data as any)?.label ?? (type === 'text' ? 'Text' : type === 'condition' || type === 'split' ? 'Condition' : type),
      position: initial?.position ?? { x: 100, y: 100 },
      size,
      ports,
      config: { type, nodeType },
    });
    selectNodes([id]);
    return id;
  }, [storeAddNode, selectNodes]);

  // selection sync
  const onSelectionChange = useCallback(({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
    if (ignoreNextSelection) {
      setIgnoreNextSelection(false);
      return;
    }
    const node = nodes[0] ?? null;
    setRfSelection(node?.id ?? null);
    if (node) {
      selectNodes([node.id]);
    } else {
      selectNodes([]);
    }
    if (edges && edges.length) {
      // sync selected edges to store
      selectEdges(edges.map((e) => e.id as string));
    } else {
      selectEdges([]);
      if (!node) clearSelection();
    }
    onNodeSelect?.(node ?? null);
  }, [onNodeSelect, selectNodes, selectEdges, clearSelection, ignoreNextSelection]);

  // node change: move/remove
  // Original delta-based move logic (reverted)
  const onNodesChange = useCallback((changes: any[]) => {
    const positionChanges: { id: string; dx: number; dy: number }[] = [];
    const removed: string[] = [];
    for (const ch of changes) {
      if (ch.type === 'position' && ch.position) {
        const n = workflow.nodes.find((x) => x.id === ch.id);
        if (!n) continue;
        const dx = ch.position.x - n.position.x;
        const dy = ch.position.y - n.position.y;
        if (dx !== 0 || dy !== 0) positionChanges.push({ id: ch.id, dx, dy });
      }
      if (ch.type === 'remove') removed.push(ch.id);
    }
    if (positionChanges.length) {
      positionChanges.forEach(({ id, dx, dy }) => moveNodes([id], dx, dy, 1));
    }
    if (removed.length) removeNodes(removed);
  }, [workflow.nodes, moveNodes, removeNodes]);

  const onEdgesChange = useCallback((changes: any[]) => {
    const removed = changes.filter((c) => c.type === 'remove').map((c) => c.id).filter(Boolean);
    if (removed.length) {
      // remove from store when RF deletes selected edges via keyboard
      try { (useWorkflowStore as any).getState?.().removeEdges(removed); } catch {}
    }
  }, []);

  // Action Library state
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ nodeId: string; side: 'left'|'right'|'top'|'bottom' }|null>(null);
  const [pendingEditNodeId, setPendingEditNodeId] = useState<string|null>(null);

  const onPlusClick = useCallback((nodeId: string, side: 'left'|'right'|'top'|'bottom') => {
    setAnchor({ nodeId, side });
    setLibraryOpen(true);
  }, []);

  const rfNodesWithCallbacks = useMemo(() => rfNodes.map((n) => ({
    ...n,
    data: {
      ...(n.data as ActionNodeData),
      onPlusClick: (side: 'left'|'right'|'top'|'bottom') => onPlusClick(n.id, side),
      onAction: (action: 'edit'|'change'|'run'|'duplicate'|'delete') => {
        if (action === 'edit') {
          setPendingEditNodeId(n.id);
          selectNodes([n.id]);
        } else if (action === 'change') {
          setAnchor({ nodeId: n.id, side: 'right' });
          setLibraryOpen(true);
        } else if (action === 'duplicate') {
          const base = workflow.nodes.find((x) => x.id === n.id);
          if (!base) return;
          const newId = storeAddNode({
            kind: base.kind,
            label: base.label,
            position: { x: base.position.x + 260, y: base.position.y },
            size: base.size,
            ports: base.ports,
            config: base.config,
          });
          selectNodes([newId]);
        } else if (action === 'delete') {
          removeNodes([n.id]);
        } else if (action === 'run') {
          console.info('Run node', n.id);
        }
      }
    } as ActionNodeData,
  })), [rfNodes, onPlusClick, selectNodes, storeAddNode, workflow.nodes, removeNodes]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={rfNodesWithCallbacks}
        edges={rfEdges}
        connectionMode={ConnectionMode.Loose}
        elementsSelectable
        edgesFocusable
        defaultEdgeOptions={{
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#60a5fa' },
          style: { stroke: '#60a5fa', strokeWidth: 2 },
          type: 'smoothstep',
        }}
        onEdgeClick={(event, edge) => {
          // Split tool: insert a split node inline on this connection
          if (tool === 'split' && onSplitEdge) {
            try {
              onSplitEdge({ id: edge.id as string, source: edge.source as string, target: edge.target as string });
              setIgnoreNextSelection(true);
            } catch {}
            event?.stopPropagation?.();
            event?.preventDefault?.();
            return;
          }
          // Toggle selection: if already selected, unselect; otherwise select
          try {
            const id = edge.id as string;
            const isSelected = selectedEdgeIds?.has?.(id) ?? false;
            if (isSelected) {
              const rest = Array.from(selectedEdgeIds ?? []).filter((x) => x !== id);
              selectEdges(rest, false);
              // prevent RF selection handler from re-selecting this edge
              setIgnoreNextSelection(true);
            } else {
              selectEdges([id], false);
            }
          } catch {}
          event?.stopPropagation?.();
          event?.preventDefault?.();
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onPaneClick={(e) => {
          onNodeSelect?.(null);
          try {
            const ev = e as unknown as { clientX: number; clientY: number };
            const pt = (instance as any)?.screenToFlowPosition?.({ x: ev.clientX, y: ev.clientY });
            if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
              (typeof (onPaneClick) === 'function') && onPaneClick?.(pt as { x: number; y: number });
              return;
            }
          } catch {}
          // Fallback using viewport if instance conversion not available
          const ev = e as unknown as { clientX: number; clientY: number };
          const px = ev.clientX;
          const py = ev.clientY;
          const x = (px - viewport.offset.x) / viewport.zoom;
          const y = (py - viewport.offset.y) / viewport.zoom;
          (typeof (onPaneClick) === 'function') && onPaneClick?.({ x, y });
        }}
        onNodeClick={(_, node) => onNodeClick?.(node as Node)}
        nodeTypes={nodeTypes}
        panOnDrag={mode === 'pan'}
        selectionOnDrag={mode === 'select'}
  proOptions={{ hideAttribution: true }}
  translateExtent={[[-100000, -100000], [100000, 100000]]}
  minZoom={0.1}
  maxZoom={3}
  panOnScroll
  zoomOnScroll={false}
  zoomOnPinch
        defaultViewport={{ x: viewport.offset.x, y: viewport.offset.y, zoom: viewport.zoom }}
        onMoveEnd={(_, vp) => {
          if (!vp) return;
          setViewport({ zoom: vp.zoom, offset: { x: vp.x, y: vp.y } });
        }}
        onInit={(inst) => {
          setInstance(inst as any);
          const safeZoomStep = 0.2;
          const safeZoomIn = () => {
            try {
              // @ts-ignore - older/newer API differences
              if (typeof inst.zoomIn === 'function') return inst.zoomIn({ duration: 120 });
            } catch {}
            const current = inst.getZoom?.() ?? 1;
            const next = Math.min((current as number) + safeZoomStep, 3);
            // @ts-ignore
            inst.setViewport?.({ zoom: next }, { duration: 120 });
          };
          const safeZoomOut = () => {
            try {
              // @ts-ignore
              if (typeof inst.zoomOut === 'function') return inst.zoomOut({ duration: 120 });
            } catch {}
            const current = inst.getZoom?.() ?? 1;
            const next = Math.max((current as number) - safeZoomStep, 0.1);
            // @ts-ignore
            inst.setViewport?.({ zoom: next }, { duration: 120 });
          };
          const safeFitView = () => {
            try {
              return inst.fitView({ padding: 0.2, duration: 180 });
            } catch {}
          };
          onReady?.({
            addNode,
            instance: inst as any,
            zoomIn: safeZoomIn,
            zoomOut: safeZoomOut,
            fitView: safeFitView,
            toggleMinimap: () => setShowMinimap((s) => !s),
            toggleGrid: () => setShowGrid((s) => !s),
            setMode: (_mode) => { /* no-op for external control */ },
            updateNodeData: (id: string, data: Record<string, any>) => {
              const patch: Partial<NodeModel> = {};
              if (typeof (data as any).label !== 'undefined') (patch as any).label = (data as any).label;
              if (typeof (data as any).config !== 'undefined') {
                try {
                  const state = (useWorkflowStore as any).getState?.();
                  const existing = state?.workflow?.nodes?.find((n: any) => n.id === id)?.config ?? {};
                  (patch as any).config = { ...existing, ...(data as any).config };
                } catch {
                  (patch as any).config = (data as any).config;
                }
              }
              updateNode(id, patch);
            },
            addEdge: (fromId: string, toId: string, kind: 'control'|'data'|'error' = 'control') => {
              const fromNode = workflow.nodes.find((n) => n.id === fromId);
              const toNode = workflow.nodes.find((n) => n.id === toId);
              if (!fromNode || !toNode) return;
              const findPort = (list: Port[], dir: 'in'|'out') => list.find((p) => p.direction === dir)?.id;
              const fromPort = findPort(fromNode.ports || [], 'out') || (fromNode.ports[0]?.id as string);
              const toPort = findPort(toNode.ports || [], 'in') || (toNode.ports[0]?.id as string);
              if (fromPort && toPort) {
                storeAddEdge({ from: { nodeId: fromNode.id, portId: fromPort }, to: { nodeId: toNode.id, portId: toPort }, kind });
              }
            }
          });
        }}
        fitView
      >
        {showGrid && (
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
        )}
        {showMinimap && (
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            style={{ background: 'transparent', boxShadow: 'none', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8 }}
            maskColor="rgba(2, 6, 23, 0.6)"
            nodeColor={() => '#1e293b'}
            nodeStrokeColor={() => '#64748b'}
          />
        )}
      </ReactFlow>

      {/* Empty State */}
      {rfNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" data-empty-state>
          <div className="text-center space-y-4 pointer-events-auto">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Start Building Your Workflow</h3>
            <p className="text-muted-foreground mb-6">Create your first workflow by adding a trigger component</p>
            <Button onClick={() => { setAnchor(null); setLibraryOpen(true); }} className="gap-2">
              {/* small plus square */}
              <span className="w-3.5 h-3.5 rounded-sm bg-primary-foreground" />
              Add Trigger
            </Button>
          </div>
        </div>
      )}

      {/* Action Library panel */}
      <ActionLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={(action) => {
          let position = { x: 100, y: 100 };
          let fromId: string | null = null;
          if (anchor) {
            const base = workflow.nodes.find((n) => n.id === anchor.nodeId);
            if (base) {
              const dx = anchor.side === 'left' ? -300 : anchor.side === 'right' ? 300 : 0;
              const dy = anchor.side === 'top' ? -220 : anchor.side === 'bottom' ? 220 : 0;
              position = { x: base.position.x + dx, y: base.position.y + dy };
              fromId = base.id;
            }
          }
          const newId = storeAddNode({
            kind: 'custom',
            label: action.label,
            position,
            size: { width: 140, height: 32 },
            ports: [
              { id: crypto.randomUUID(), name: 'in', direction: 'in', kind: 'control' } as Port,
              { id: crypto.randomUUID(), name: 'out', direction: 'out', kind: 'control' } as Port,
            ],
            config: { 
              type: action.id,
              nodeType: action.nodeType || 'action'
            },
          });
          if (fromId) {
            const state = (useWorkflowStore as any).getState?.() ?? null;
            const fromNode = (state?.workflow?.nodes ?? workflow.nodes).find((n: any) => n.id === fromId);
            const newNode = (state?.workflow?.nodes ?? workflow.nodes).find((n: any) => n.id === newId);
            if (fromNode && newNode) {
              const outPort = (fromNode.ports.find((p: Port) => p.direction === 'out') ?? fromNode.ports[0])?.id as string | undefined;
              const inPort = (newNode.ports.find((p: Port) => p.direction === 'in') ?? newNode.ports[0])?.id as string | undefined;
              if (outPort && inPort) {
                storeAddEdge({ from: { nodeId: fromNode.id, portId: outPort }, to: { nodeId: newId, portId: inPort }, kind: 'control' });
              }
            }
          }
          selectNodes([newId]);
          setLibraryOpen(false);
        }}
      />
    </div>
  );
}
