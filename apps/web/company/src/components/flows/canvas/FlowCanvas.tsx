"use client";

import React, { 
  useRef, 
  useEffect, 
  useState, 
  useCallback, 
  forwardRef, 
  useImperativeHandle 
} from "react";
import { useFlowStore } from "@/store/flowStore";
import { FlowNode } from "../nodes/FlowNode";
import { FlowEdge } from "../edges/FlowEdge";
import { SelectionBox } from "../selection/SelectionBox";
import { Minimap } from "../minimap/Minimap";

export interface FlowCanvasRef {
  centerCanvas: () => void;
  fitToScreen: () => void;
  getCanvasElement: () => HTMLCanvasElement | null;
}

interface GridConfig {
  size: number;
  subdivisions: number;
  color: string;
  subColor: string;
}

const GRID_CONFIG: GridConfig = {
  size: 40,
  subdivisions: 5,
  color: 'rgba(148, 163, 184, 0.1)', // slate-400 with opacity
  subColor: 'rgba(148, 163, 184, 0.05)' // slate-400 with lower opacity
};

const ZOOM_LIMITS = {
  min: 0.1,
  max: 5.0,
  step: 0.1
};

export const FlowCanvas = forwardRef<FlowCanvasRef>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [spacePan, setSpacePan] = useState(false);
  const didAutoFitRef = useRef(false);
  const isPointerOverCanvas = useRef(false);

  const {
    viewport,
    workflow,
    selectedNodes,
    selectedEdges,
    connectionDraft,
    panBy,
    zoomBy,
    zoomTo,
  fitRequests,
  selectNode,
    setSelection,
    clearSelection,
    updateConnectionCursor
  } = useFlowStore();

  // Extract nodes and edges from workflow
  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];

  // Canvas context and rendering
  const canvasCtx = useRef<CanvasRenderingContext2D | null>(null);
  const [draggingNodes, setDraggingNodes] = useState<string[] | null>(null);
  const [lastMouse, setLastMouse] = useState<{ x: number; y: number } | null>(null);
  const [dragPending, setDragPending] = useState<boolean>(false);

  const fitAllToScreen = useCallback(() => {
    if (nodes.length === 0) return;
    const container = containerRef.current;
    if (!container) return;

    // Calculate bounds of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + node.size.width);
      maxY = Math.max(maxY, node.position.y + node.size.height);
    });

    const bounds = { 
      width: Math.max(1, maxX - minX), 
      height: Math.max(1, maxY - minY),
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };

    const containerBounds = container.getBoundingClientRect();
    const padding = 100;
    const scaleX = (containerBounds.width - padding * 2) / bounds.width;
    const scaleY = (containerBounds.height - padding * 2) / bounds.height;
    const scale = Math.min(scaleX, scaleY, 1);
    
    zoomTo(scale);
    const offsetX = containerBounds.width / 2 - bounds.centerX * scale;
    const offsetY = containerBounds.height / 2 - bounds.centerY * scale;
    panBy(offsetX - viewport.offset.x, offsetY - viewport.offset.y);
  }, [nodes, zoomTo, panBy, viewport.offset.x, viewport.offset.y]);

  useImperativeHandle(ref, () => ({
    centerCanvas: () => {
      panBy(-viewport.offset.x, -viewport.offset.y);
    },
    fitToScreen: () => fitAllToScreen(),
    getCanvasElement: () => canvasRef.current
  }));

  // Run fit-to-screen when requested via store (toolbar button)
  useEffect(() => {
    if (fitRequests && fitRequests > 0) {
      fitAllToScreen();
    }
  }, [fitRequests, fitAllToScreen]);

  // (Moved) canvas sizing effect is below renderGrid

  // Autofit on first mount so view focuses on content
  useEffect(() => {
    if (!didAutoFitRef.current) {
      didAutoFitRef.current = true;
      // slight delay to ensure container measured
      requestAnimationFrame(() => fitAllToScreen());
    }
  }, [fitAllToScreen]);

  // Render grid background
  const renderGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvasCtx.current;
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    
    const { offset, zoom } = viewport;
    const { size, subdivisions, color, subColor } = GRID_CONFIG;
    
    const scaledSize = size * zoom;
    const scaledSubSize = scaledSize / subdivisions;
    
    // Only render grid if it's not too small
    if (scaledSubSize > 2) {
      ctx.strokeStyle = subColor;
      ctx.lineWidth = 1;
      
      // Draw subdivision lines
      const startX = Math.floor(-offset.x / scaledSubSize) * scaledSubSize + (offset.x % scaledSubSize);
      const startY = Math.floor(-offset.y / scaledSubSize) * scaledSubSize + (offset.y % scaledSubSize);
      
      for (let x = startX; x < canvas.width / window.devicePixelRatio; x += scaledSubSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height / window.devicePixelRatio);
        ctx.stroke();
      }
      
      for (let y = startY; y < canvas.height / window.devicePixelRatio; y += scaledSubSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width / window.devicePixelRatio, y);
        ctx.stroke();
      }
    }
    
    // Draw main grid lines
    if (scaledSize > 10) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      
      const mainStartX = Math.floor(-offset.x / scaledSize) * scaledSize + (offset.x % scaledSize);
      const mainStartY = Math.floor(-offset.y / scaledSize) * scaledSize + (offset.y % scaledSize);
      
      for (let x = mainStartX; x < canvas.width / window.devicePixelRatio; x += scaledSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height / window.devicePixelRatio);
        ctx.stroke();
      }
      
      for (let y = mainStartY; y < canvas.height / window.devicePixelRatio; y += scaledSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width / window.devicePixelRatio, y);
        ctx.stroke();
      }
    }
  }, [viewport]);

  // Initialize canvas context and keep it sized to container with DPR
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvasCtx.current = canvas.getContext('2d');

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvasCtx.current;
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      // Draw grid on resize
      setTimeout(() => renderGrid(), 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(container);
    resizeObserverRef.current = ro;

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      ro.disconnect();
      resizeObserverRef.current = null;
    };
  }, [renderGrid]);

  // Re-render grid when viewport changes
  useEffect(() => {
    renderGrid();
  }, [renderGrid]);

  // Keyboard spacebar toggles pan mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePan(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePan(false);
        setIsDragging(false);
        setDragStart(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Native wheel handler (non-passive) to enable preventDefault on macOS trackpads
  useEffect(() => {
    const inCanvas = (target: EventTarget | null) => {
      const c = containerRef.current;
      const o = overlayRef.current;
      if (!c && !o) return false;
      const node = (target as Node) ?? null;
      return (c?.contains(node as Node) || o?.contains(node as Node)) ?? false;
    };

    const wheelHandler = (e: WheelEvent) => {
      if (!inCanvas(e.target)) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const rect = canvas.getBoundingClientRect();
        const centerX = e.clientX - rect.left;
        const centerY = e.clientY - rect.top;
        const zoomDelta = e.deltaY > 0 ? 1 / 1.1 : 1.1;
        zoomBy(zoomDelta, { x: centerX, y: centerY });
      } else {
        e.preventDefault();
        e.stopPropagation();
        panBy(e.deltaX, e.deltaY);
      }
    };

    // Safari pinch gestures
    const gestureHandler = (e: any) => {
      if (!inCanvas(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const centerX = (e as any).clientX ? (e as any).clientX - rect.left : rect.width / 2;
      const centerY = (e as any).clientY ? (e as any).clientY - rect.top : rect.height / 2;
      const scale = (e as any).scale ?? 1;
      if (scale && scale !== 1) {
        zoomBy(scale, { x: centerX, y: centerY });
      }
    };

    window.addEventListener('wheel', wheelHandler, { passive: false, capture: true });
    overlayRef.current?.addEventListener('wheel', wheelHandler, { passive: false });
    containerRef.current?.addEventListener('wheel', wheelHandler, { passive: false });
    window.addEventListener('gesturechange', gestureHandler as EventListener, { passive: false, capture: true } as any);
    window.addEventListener('gesturestart', gestureHandler as EventListener, { passive: false, capture: true } as any);
    window.addEventListener('gestureend', gestureHandler as EventListener, { passive: false, capture: true } as any);
    return () => {
      window.removeEventListener('wheel', wheelHandler, { capture: true } as any);
      overlayRef.current?.removeEventListener('wheel', wheelHandler as EventListener);
      containerRef.current?.removeEventListener('wheel', wheelHandler as EventListener);
      window.removeEventListener('gesturechange', gestureHandler as EventListener, { capture: true } as any);
      window.removeEventListener('gesturestart', gestureHandler as EventListener, { capture: true } as any);
      window.removeEventListener('gestureend', gestureHandler as EventListener, { capture: true } as any);
    };
  }, [zoomBy, panBy]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Prevent text selection and native gestures
    e.preventDefault();
    
    // Default: left-drag pans. Hold Shift/Cmd/Ctrl to selection. Also support middle/right, Alt+left, or Space+left for panning.
    const wantsSelection = e.button === 0 && (e.shiftKey || e.metaKey || e.ctrlKey) && !spacePan && !e.altKey;
    if (e.button === 1 || e.button === 2 || (e.button === 0 && (spacePan || e.altKey)) || (e.button === 0 && !wantsSelection)) {
      // Pan mode
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (e.button === 0) {
      // Selection mode
      setIsSelecting(true);
      setSelectionBox({ start: { x, y }, end: { x, y } });
      
      if (!e.shiftKey) {
        clearSelection();
      }
    }
  }, [viewport, clearSelection, spacePan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update connection cursor for draft connections
  // Track cursor in screen-space for overlay rendering
  updateConnectionCursor({ x, y });
    
  if (isDragging && dragStart) {
      // Pan the canvas
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      panBy(dx, dy);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isSelecting && selectionBox) {
      // Update selection box
      setSelectionBox(prev => prev ? { ...prev, end: { x, y } } : null);
    } else if (draggingNodes && lastMouse) {
      // Drag selected nodes by mouse delta (convert to canvas space)
      const dxScreen = x - lastMouse.x;
      const dyScreen = y - lastMouse.y;
      // Apply a small threshold to avoid accidental drags
      if (dragPending) {
        const dist2 = dxScreen * dxScreen + dyScreen * dyScreen;
        if (dist2 < 9) {
          return;
        }
        setDragPending(false);
      }
      const dxCanvas = dxScreen / viewport.zoom;
      const dyCanvas = dyScreen / viewport.zoom;
      useFlowStore.getState().moveNodes(draggingNodes, dxCanvas, dyCanvas);
      setLastMouse({ x, y });
    }
  }, [isDragging, dragStart, isSelecting, selectionBox, viewport, panBy, updateConnectionCursor, draggingNodes, lastMouse, dragPending]);

  const handleMouseUp = useCallback(() => {
    if (isSelecting && selectionBox) {
      // Select nodes within selection box (selection in screen space)
      const { start, end } = selectionBox;
      const left = Math.min(start.x, end.x);
      const right = Math.max(start.x, end.x);
      const top = Math.min(start.y, end.y);
      const bottom = Math.max(start.y, end.y);

      const selectedNodeIds = nodes
        .filter((n) => {
          const r = getNodeScreenRect(n);
          const nodeRight = r.x + r.w;
          const nodeBottom = r.y + r.h;
          return r.x < right && nodeRight > left && r.y < bottom && nodeBottom > top;
        })
        .map((n) => n.id);

      if (selectedNodeIds.length > 0) {
        setSelection(selectedNodeIds, []);
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setIsSelecting(false);
    setSelectionBox(null);
    setDraggingNodes(null);
    setLastMouse(null);
    setDragPending(false);
  }, [isSelecting, selectionBox, nodes, setSelection, viewport]);

  // React onWheel not used; native listener above ensures passive: false on macOS

  // Helper: screen-space rect of a node for selection hit test
  const getNodeScreenRect = (node: typeof nodes[number]) => {
    const x = node.position.x * viewport.zoom + viewport.offset.x;
    const y = node.position.y * viewport.zoom + viewport.offset.y;
    const w = node.size.width * viewport.zoom;
    const h = node.size.height * viewport.zoom;
    return { x, y, w, h };
  };

  return (
    <div 
      ref={containerRef}
  className="relative w-full h-full overflow-hidden bg-background"
  onMouseEnter={() => { isPointerOverCanvas.current = true; }}
  onMouseLeave={() => { isPointerOverCanvas.current = false; }}
      onDragOver={(e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        e.preventDefault();
        try {
          const json = e.dataTransfer?.getData('application/json') || e.dataTransfer?.getData('text/plain');
          if (!json) return;
          const payload = JSON.parse(json);
          if (payload?.type !== 'node-template' || !payload?.nodeTemplate) return;
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          const cx = (sx - viewport.offset.x) / viewport.zoom;
          const cy = (sy - viewport.offset.y) / viewport.zoom;
          const grid = 20;
          const snap = (v: number) => Math.round(v / grid) * grid;
          useFlowStore.getState().addNode({
            kind: payload.nodeTemplate.kind,
            label: payload.nodeTemplate.label,
            description: payload.nodeTemplate.description,
            position: { x: snap(cx), y: snap(cy) },
            size: payload.nodeTemplate.size || { width: 200, height: 100 },
            ports: payload.nodeTemplate.ports || [
              { id: `${payload.nodeTemplate.kind}-input`, name: 'Input', direction: 'in', kind: 'data' },
              { id: `${payload.nodeTemplate.kind}-output`, name: 'Output', direction: 'out', kind: 'data' },
            ],
            icon: payload.nodeTemplate.icon,
            color: payload.nodeTemplate.color,
          });
        } catch (err) {
          console.warn('Drop error', err);
        }
      }}
      style={{
        WebkitOverflowScrolling: 'touch',
        touchAction: 'none',
      }}
    >
      {/* Background grid canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* Interactive overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 cursor-grab"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{ 
          cursor: isDragging || spacePan ? 'grabbing' : isSelecting ? 'crosshair' : 'grab',
          overscrollBehavior: 'contain',
          touchAction: 'none',
          userSelect: 'none'
        }}
      >
        {/* Nodes */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${viewport.offset.x}px, ${viewport.offset.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0'
          }}
        >
        {nodes.map(node => (
          <FlowNode
            key={node.id}
            node={node}
            zoom={viewport.zoom}
            screenPosition={{ x: node.position.x, y: node.position.y }}
            screenSize={{ width: node.size.width, height: node.size.height }}
            onMouseDown={(nodeId, event) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (rect) {
                // Selection behavior
                if (event.shiftKey || event.metaKey || event.ctrlKey) {
                  selectNode(nodeId, true);
                } else if (!selectedNodes.includes(nodeId)) {
                  setSelection([nodeId], []);
                }
                setDraggingNodes(
                  selectedNodes.length && selectedNodes.includes(nodeId)
                    ? selectedNodes
                    : [nodeId]
                );
                setLastMouse({ x: event.clientX - rect.left, y: event.clientY - rect.top });
                setDragPending(true);
              }
            }}
            onPortMouseDown={(port, event) => {
              // TODO: Implement port mouse down
              console.log('Port mouse down:', port);
            }}
            onPortMouseUp={(port, event) => {
              // TODO: Implement port mouse up
              console.log('Port mouse up:', port);
            }}
            onDoubleClick={(nodeId) => {
              // TODO: Implement node double click
              console.log('Node double click:', nodeId);
            }}
          />
        ))}
        
        {/* Edges in world coordinates (inherit pan/zoom via parent transform) */}
        <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
          {edges.map(edge => {
            const fromNode = nodes.find(n => n.id === edge.from.nodeId);
            const toNode = nodes.find(n => n.id === edge.to.nodeId);
            if (!fromNode || !toNode) return null;
            const startPoint = {
              x: fromNode.position.x + fromNode.size.width,
              y: fromNode.position.y + fromNode.size.height / 2
            };
            const endPoint = {
              x: toNode.position.x,
              y: toNode.position.y + toNode.size.height / 2
            };
            return (
              <FlowEdge
                key={edge.id}
                edge={edge}
                startPoint={startPoint}
                endPoint={endPoint}
                onEdgeClick={(edgeId) => {
                  console.log('Edge click:', edgeId);
                }}
                onEdgeDoubleClick={(edgeId) => {
                  console.log('Edge double click:', edgeId);
                }}
              />
            );
          })}
          {/* Connection draft (convert screen cursor to world coords) */}
          {connectionDraft && connectionDraft.from && connectionDraft.cursor && (() => {
            const worldCursor = {
              x: (connectionDraft.cursor.x - viewport.offset.x) / viewport.zoom,
              y: (connectionDraft.cursor.y - viewport.offset.y) / viewport.zoom
            };
            return (
              <FlowEdge
                edge={{ id: 'draft', from: connectionDraft.from, to: { nodeId: 'cursor', portId: 'cursor' }, kind: connectionDraft.from.kind, isDraft: true }}
                startPoint={{ x: worldCursor.x - 50 / viewport.zoom, y: worldCursor.y }}
                endPoint={worldCursor}
              />
            );
          })()}
        </svg>
        </div>
        
        {/* Selection box */}
  {isSelecting && selectionBox && (
          <SelectionBox
            startPoint={selectionBox.start}
            currentPoint={selectionBox.end}
            isVisible={true}
          />
        )}
      </div>
      
      
      
      {/* Minimap */}
      <div className="absolute bottom-4 right-4 z-10">
        <Minimap
          nodes={nodes}
          viewport={viewport}
          canvasSize={{
            width: containerRef.current?.clientWidth || 800,
            height: containerRef.current?.clientHeight || 600
          }}
          onViewportChange={(newViewport) => {
            // TODO: Implement viewport change
            console.log('Viewport change:', newViewport);
          }}
        />
      </div>
    </div>
  );
});
