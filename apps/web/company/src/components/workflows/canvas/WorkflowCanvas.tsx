import { useRef, useEffect, useCallback, useState } from 'react';
import { WorkflowNode } from './WorkflowNode';
import { WorkflowConnection } from './WorkflowConnection';
import { Button } from '@/components/ui/button';
import { Plus, Zap } from 'lucide-react';

interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: any;
}

interface Connection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface WorkflowCanvasProps {
  selectedTool: string;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onCanvasClick: () => void;
  onAddNode: () => void;
}

export function WorkflowCanvas({ selectedTool, selectedNode, onNodeSelect, onCanvasClick, onAddNode }: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionDraft, setConnectionDraft] = useState<{ source: string; position: { x: number; y: number } } | null>(null);

  // Grid rendering
  const renderGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      ctx.clearRect(0, 0, rect.width, rect.height);

      // Grid settings
      const gridSize = 20 * viewport.zoom;
      const gridColor = 'rgba(148, 163, 184, 0.1)';
      const majorGridColor = 'rgba(148, 163, 184, 0.2)';

      if (gridSize > 5 && rect.width > 0 && rect.height > 0) {
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;

        // Vertical lines
        const startX = (viewport.x % gridSize);
        for (let x = startX; x < rect.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, rect.height);
          ctx.stroke();
        }

        // Horizontal lines
        const startY = (viewport.y % gridSize);
        for (let y = startY; y < rect.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(rect.width, y);
          ctx.stroke();
        }

        // Major grid lines every 5 units
        if (gridSize > 10) {
          ctx.strokeStyle = majorGridColor;
          ctx.lineWidth = 1;

          const majorGridSize = gridSize * 5;
          const majorStartX = (viewport.x % majorGridSize);
          for (let x = majorStartX; x < rect.width; x += majorGridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, rect.height);
            ctx.stroke();
          }

          const majorStartY = (viewport.y % majorGridSize);
          for (let y = majorStartY; y < rect.height; y += majorGridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(rect.width, y);
            ctx.stroke();
          }
        }
      }
    } catch (error) {
      console.warn('Error rendering grid:', error);
    }
  }, [viewport]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      renderGrid();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [renderGrid]);

  // Render grid when viewport changes
  useEffect(() => {
    renderGrid();
  }, [renderGrid]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only handle canvas clicks if the click is on the container itself or canvas elements
    // This prevents interference with buttons and other interactive elements
    const target = e.target as HTMLElement;
    const isCanvasClick = target === containerRef.current || target.tagName === 'CANVAS' || target.closest('[data-empty-state]') == null;

    // Left-drag on canvas background, middle-click, or Alt+Left starts panning
    const shouldStartPan =
      (e.button === 0 && isCanvasClick) || // left click on background
      e.button === 1 || // middle click
      e.altKey; // alt+left

    if (selectedTool === 'hand' || shouldStartPan) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      return;
    }

    if (isCanvasClick) {
      // Only call onCanvasClick for actual canvas clicks (non-panning)
      onCanvasClick();
    }
  }, [selectedTool, viewport, onCanvasClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (isDragging) {
      setViewport(prev => ({
        ...prev,
        x: (e as MouseEvent).clientX - dragStart.x,
        y: (e as MouseEvent).clientY - dragStart.y
      }));
    }

    if (connectionDraft) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setConnectionDraft(prev => prev ? {
          ...prev,
          position: {
            x: ((e as MouseEvent).clientX - rect.left - viewport.x) / viewport.zoom,
            y: ((e as MouseEvent).clientY - rect.top - viewport.y) / viewport.zoom
          }
        } : null);
      }
    }
  }, [isDragging, dragStart, connectionDraft, viewport]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setConnectionDraft(null);
  }, []);

  // Ensure drag continues even if cursor leaves the canvas
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => handleMouseMove(e);
    const onUp = () => handleMouseUp();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = e.clientX - rect.left;
        const centerY = e.clientY - rect.top;
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(3, viewport.zoom * zoomDelta));
        
        setViewport(prev => ({
          zoom: newZoom,
          x: centerX - (centerX - prev.x) * (newZoom / prev.zoom),
          y: centerY - (centerY - prev.y) * (newZoom / prev.zoom)
        }));
      }
    } else {
      // Pan
      setViewport(prev => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  }, [viewport]);

  const handleNodeDrag = useCallback((nodeId: string, deltaX: number, deltaY: number) => {
    if (!nodeId || typeof deltaX !== 'number' || typeof deltaY !== 'number') {
      console.warn('Invalid node drag parameters:', { nodeId, deltaX, deltaY });
      return;
    }
    
    setNodes(prev => prev.map(node => 
      node && node.id === nodeId && node.position
        ? { ...node, position: { x: node.position.x + deltaX, y: node.position.y + deltaY } }
        : node
    ));
  }, []);

  const handleStartConnection = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setConnectionDraft({ source: nodeId, position });
  }, []);

  const handleEndConnection = useCallback((targetNodeId: string) => {
    if (connectionDraft) {
      const newConnection: Connection = {
        id: `connection-${Date.now()}`,
        source: connectionDraft.source,
        target: targetNodeId
      };
      setConnections(prev => [...prev, newConnection]);
      setConnectionDraft(null);
    }
  }, [connectionDraft]);

  const handleAddNodeFromType = useCallback((nodeType: string) => {
    if (!nodeType || !containerRef.current) {
      console.warn('Invalid node type or container ref:', { nodeType, containerRef: containerRef.current });
      return;
    }
    
    try {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        // Place new node in center of viewport
        const x = (rect.width / 2 - viewport.x) / viewport.zoom;
        const y = (rect.height / 2 - viewport.y) / viewport.zoom;
        
        const newNode: Node = {
          id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: nodeType,
          position: { x: Math.round(x / 20) * 20, y: Math.round(y / 20) * 20 },
          size: { width: 200, height: 100 },
          data: { label: nodeType === 'trigger' ? 'Customer Request' : 'New Step' }
        };
        
        setNodes(prev => [...prev, newNode]);
      }
    } catch (error) {
      console.error('Error adding node:', error);
    }
  }, [viewport]);

  // Empty state with initial call-to-action
  const renderEmptyState = () => (
  <div className="absolute inset-0 flex items-center justify-center" data-empty-state>
      <div className="text-center space-y-4 pointer-events-auto">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Zap className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Start Building Your Workflow</h3>
        <p className="text-muted-foreground mb-6">
          Create your first workflow by adding a trigger component
        </p>
        <Button onClick={onAddNode} size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          Add Trigger
        </Button>
      </div>
    </div>
  );

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden bg-background ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Grid Canvas */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Empty State */}
      {nodes.length === 0 && renderEmptyState()}

      {/* World Container */}
      <div 
        className="absolute inset-0"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {/* Connections */}
        <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
          {connections.filter(connection => connection && connection.id).map(connection => {
            const sourceNode = nodes.find(n => n && n.id === connection.source);
            const targetNode = nodes.find(n => n && n.id === connection.target);
            
            if (!sourceNode || !targetNode || !sourceNode.position || !targetNode.position || !sourceNode.size || !targetNode.size) {
              return null;
            }
            
            return (
              <WorkflowConnection
                key={connection.id}
                connection={connection}
                sourcePosition={{
                  x: sourceNode.position.x + sourceNode.size.width,
                  y: sourceNode.position.y + sourceNode.size.height / 2
                }}
                targetPosition={{
                  x: targetNode.position.x,
                  y: targetNode.position.y + targetNode.size.height / 2
                }}
              />
            );
          })}
          
          {/* Draft Connection */}
          {connectionDraft && (
            <WorkflowConnection
              connection={{ id: 'draft', source: '', target: '' }}
              sourcePosition={{
                x: 0, // Will be set by the source node
                y: 0
              }}
              targetPosition={connectionDraft.position}
              isDraft
            />
          )}
        </svg>

        {/* Nodes */}
        {nodes.filter(node => node && node.id && node.position && node.size).map(node => (
          <WorkflowNode
            key={node.id}
            node={node}
            isSelected={selectedNode === node.id}
            onSelect={() => onNodeSelect(node.id)}
            onDrag={handleNodeDrag}
            onStartConnection={handleStartConnection}
            onEndConnection={handleEndConnection}
          />
        ))}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1 text-sm text-muted-foreground">
        {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
}
