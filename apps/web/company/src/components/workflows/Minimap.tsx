import React, { memo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { NodeModel, Viewport, Point } from "@/types/flow";

interface MinimapProps {
  nodes: NodeModel[];
  viewport: Viewport;
  canvasSize: { width: number; height: number };
  onViewportChange: (viewport: Viewport) => void;
  className?: string;
}

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;
const MINIMAP_SCALE = 0.1;

export const Minimap = memo(({ 
  nodes, 
  viewport, 
  canvasSize, 
  onViewportChange,
  className 
}: MinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Calculate bounds of all nodes
  const getBounds = () => {
    if (nodes.length === 0) {
      return { 
        minX: 0, 
        minY: 0, 
        maxX: canvasSize.width, 
        maxY: canvasSize.height 
      };
    }
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + node.size.width);
      maxY = Math.max(maxY, node.position.y + node.size.height);
    });
    
    // Add padding
    const padding = 100;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding
    };
  };
  
  // Render minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);
    
    const bounds = getBounds();
    const worldWidth = bounds.maxX - bounds.minX;
    const worldHeight = bounds.maxY - bounds.minY;
    
    // Calculate scale to fit content
    const scaleX = MINIMAP_WIDTH / worldWidth;
    const scaleY = MINIMAP_HEIGHT / worldHeight;
    const scale = Math.min(scaleX, scaleY, MINIMAP_SCALE);
    
    // Transform function
    const transform = (point: Point): Point => ({
      x: (point.x - bounds.minX) * scale,
      y: (point.y - bounds.minY) * scale
    });
    
    // Draw nodes
    nodes.forEach(node => {
      const pos = transform(node.position);
      const size = {
        width: node.size.width * scale,
        height: node.size.height * scale
      };
      
      // Node background
      ctx.fillStyle = node.selected ? "#3B82F6" : "#6B7280";
      ctx.fillRect(pos.x, pos.y, size.width, size.height);
      
      // Node border
      ctx.strokeStyle = node.selected ? "#1D4ED8" : "#374151";
      ctx.lineWidth = 1;
      ctx.strokeRect(pos.x, pos.y, size.width, size.height);
    });
    
    // Draw viewport indicator
    const viewportTopLeft = transform({
      x: -viewport.offset.x / viewport.zoom,
      y: -viewport.offset.y / viewport.zoom
    });
    
    const viewportSize = {
      width: (canvasSize.width / viewport.zoom) * scale,
      height: (canvasSize.height / viewport.zoom) * scale
    };
    
    ctx.strokeStyle = "#EF4444";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      viewportTopLeft.x,
      viewportTopLeft.y,
      viewportSize.width,
      viewportSize.height
    );
    
    // Fill viewport with semi-transparent overlay
    ctx.fillStyle = "rgba(239, 68, 68, 0.1)";
    ctx.fillRect(
      viewportTopLeft.x,
      viewportTopLeft.y,
      viewportSize.width,
      viewportSize.height
    );
    
  }, [nodes, viewport, canvasSize]);
  
  // Handle minimap clicks to navigate
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const bounds = getBounds();
    const worldWidth = bounds.maxX - bounds.minX;
    const worldHeight = bounds.maxY - bounds.minY;
    
    const scaleX = MINIMAP_WIDTH / worldWidth;
    const scaleY = MINIMAP_HEIGHT / worldHeight;
    const scale = Math.min(scaleX, scaleY, MINIMAP_SCALE);
    
    // Convert minimap coordinates to world coordinates
    const worldX = (x / scale) + bounds.minX;
    const worldY = (y / scale) + bounds.minY;
    
    // Center viewport on clicked point
    const newOffset = {
      x: -(worldX - canvasSize.width / 2 / viewport.zoom) * viewport.zoom,
      y: -(worldY - canvasSize.height / 2 / viewport.zoom) * viewport.zoom
    };
    
    onViewportChange({
      ...viewport,
      offset: newOffset
    });
  };
  
  return (
    <div className={cn(
      "bg-card border border-border rounded-lg p-2 shadow-sm",
      className
    )}>
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Overview
      </div>
      <canvas
        ref={canvasRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        className="cursor-pointer border border-border rounded"
        onClick={handleClick}
      />
      <div className="mt-2 text-xs text-muted-foreground">
        Zoom: {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
});

Minimap.displayName = "Minimap";
