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
  ReactFlowInstance
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkflowStore } from '@/store/workflowStore';
import type { NodeModel, Port } from '@/types/workflow';

export type AddNodeFn = (type: string, initial?: Partial<Node>) => void;

export interface ReactFlowCanvasProps {
  onNodeSelect?: (node: Node | null) => void;
  onAddNodeRequest?: () => void;
  onReady?: (api: {
    addNode: AddNodeFn;
    instance: ReactFlowInstance;
    zoomIn: () => void;
    zoomOut: () => void;
    fitView: () => void;
    toggleMinimap: () => void;
    toggleGrid: () => void;
    setMode: (mode: 'pan' | 'select') => void;
    updateNodeData: (id: string, data: Record<string, any>) => void;
  }) => void;
  mode?: 'pan' | 'select';
  initialMinimap?: boolean;
  initialGrid?: boolean;
}

export default function ReactFlowCanvas({ onNodeSelect, onAddNodeRequest, onReady, mode = 'select', initialMinimap = true, initialGrid = true }: ReactFlowCanvasProps) {
  // Local UI toggles / rf instance
  const [rfSelection, setRfSelection] = useState<string | null>(null);
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const [showMinimap, setShowMinimap] = useState(initialMinimap);
  const [showGrid, setShowGrid] = useState(initialGrid);

  const nodeTypes: NodeTypes = useMemo(() => ({}), []);
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
    clearSelection: s.clearSelection,
  }));

  // Map store nodes -> React Flow nodes
  const rfNodes = useMemo<Node[]>(() => {
    return workflow.nodes.map((n: NodeModel) => ({
      id: n.id,
      type: n.kind as string, // fallback to default renderer
      position: { x: n.position.x, y: n.position.y },
      data: { label: n.label, kind: n.kind, config: n.config },
      selected: !!n.selected,
      width: n.size?.width,
      height: n.size?.height,
    }));
  }, [workflow.nodes]);

  // Map store edges -> React Flow edges (basic center-to-center for now)
  const rfEdges = useMemo<Edge[]>(() => {
    return workflow.edges.map((e) => ({
      id: e.id,
      source: e.from.nodeId,
      target: e.to.nodeId,
      // sourceHandle: e.from.portId, // reserved for custom handles later
      // targetHandle: e.to.portId,
      animated: false,
    }));
  }, [workflow.edges]);

  // Handle connections -> store edge
  const onConnect = useCallback((connection: Edge | Connection) => {
    const source = (connection as Connection).source;
    const target = (connection as Connection).target;
    if (!source || !target) return;
    const fromNode = workflow.nodes.find((n) => n.id === source);
    const toNode = workflow.nodes.find((n) => n.id === target);
    if (!fromNode || !toNode) return;
    const findPort = (list: Port[], dir: 'in' | 'out') => list.find((p) => p.direction === dir)?.id;
    const fromPort = findPort(fromNode.ports || [], 'out') || (fromNode.ports[0]?.id as string);
    const toPort = findPort(toNode.ports || [], 'in') || (toNode.ports[0]?.id as string);
    if (!fromPort || !toPort) return;
    storeAddEdge({
      from: { nodeId: fromNode.id, portId: fromPort },
      to: { nodeId: toNode.id, portId: toPort },
      kind: 'control',
    });
  }, [workflow.nodes, storeAddEdge]);

  // Add node via store and basic ports
  const addNode: AddNodeFn = useCallback((type: string, initial?: Partial<Node>) => {
    const inPort: Port = { id: crypto.randomUUID(), name: 'in', direction: 'in', kind: 'control' } as Port;
    const outPort: Port = { id: crypto.randomUUID(), name: 'out', direction: 'out', kind: 'control' } as Port;
    const kind = type === 'trigger' ? 'trigger' : 'custom';
    const id = storeAddNode({
      kind: kind as NodeModel['kind'],
      label: (initial?.data as any)?.label ?? type,
      position: initial?.position ?? { x: 100, y: 100 },
      size: { width: 220, height: 80 },
      ports: [inPort, outPort],
      config: {},
    });
    // select newly added
    selectNodes([id]);
  }, [storeAddNode, selectNodes]);

  // Selection sync from RF to store + notify parent
  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    const node = nodes[0] ?? null;
    setRfSelection(node?.id ?? null);
    if (node) selectNodes([node.id]); else clearSelection();
    onNodeSelect?.(node);
  }, [onNodeSelect, selectNodes, clearSelection]);

  // Node change handler for position/removal
  const onNodesChange = useCallback((changes: any[]) => {
    // Aggregate moves by id
    const moved: Record<string, { x: number; y: number }> = {};
    const removed: string[] = [];
    for (const ch of changes) {
      if (ch.type === 'position' && ch.position) {
        moved[ch.id] = ch.position;
      }
      if (ch.type === 'remove') removed.push(ch.id);
    }
    const movedIds = Object.keys(moved);
    if (movedIds.length) {
      // compute deltas per node from current store position
      movedIds.forEach((id) => {
        const n = workflow.nodes.find((x) => x.id === id);
        if (!n) return;
        const dx = moved[id].x - n.position.x;
        const dy = moved[id].y - n.position.y;
        if (dx !== 0 || dy !== 0) moveNodes([id], dx, dy, 1);
      });
    }
    if (removed.length) removeNodes(removed);
  }, [workflow.nodes, moveNodes, removeNodes]);

  // Edges change: support remove only for now
  const onEdgesChange = useCallback((changes: any[]) => {
    // Future: route edge removals to store
    // No-op until edge UI is added
  }, []);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
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
        onMoveEnd={(_, viewportState) => {
          if (!viewportState) return;
          setViewport({ zoom: viewportState.zoom, offset: { x: viewportState.x, y: viewportState.y } });
        }}
        onInit={(inst) => {
          setInstance(inst);
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
            instance: inst,
            zoomIn: safeZoomIn,
            zoomOut: safeZoomOut,
            fitView: safeFitView,
            toggleMinimap: () => setShowMinimap((s) => !s),
            toggleGrid: () => setShowGrid((s) => !s),
            setMode: (_mode) => {
              // handled via props in parent; this is a no-op helper for convenience
      },
      updateNodeData: (id: string, data: Record<string, any>) => {
        // Only patch known fields for now (label, config)
        const patch: Partial<NodeModel> = {};
        if (typeof (data as any).label !== 'undefined') (patch as any).label = (data as any).label;
        if (typeof (data as any).config !== 'undefined') (patch as any).config = (data as any).config;
        updateNode(id, patch);
      }
          });
          // Ensure RF reflects store viewport immediately
          try {
            // @ts-ignore
            inst.setViewport?.({ x: viewport.offset.x, y: viewport.offset.y, zoom: viewport.zoom }, { duration: 0 });
          } catch {}
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
            <Button onClick={onAddNodeRequest} className="gap-2">
              {/* small plus square */}
              <span className="w-3.5 h-3.5 rounded-sm bg-primary-foreground" />
              Add Trigger
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
