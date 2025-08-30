import React, { memo } from "react";
import { cn } from "@/lib/utils";
import type { EdgeModel, Point } from "@/types/flow";

interface FlowEdgeProps {
  edge: EdgeModel;
  startPoint: Point;
  endPoint: Point;
  onEdgeClick?: (edgeId: string) => void;
  onEdgeDoubleClick?: (edgeId: string) => void;
}

// Generate Bezier curve path for smooth connections
function generateBezierPath(start: Point, end: Point): string {
  const dx = end.x - start.x;
  const controlOffset = Math.abs(dx) * 0.5;
  
  const controlPoint1: Point = {
    x: start.x + Math.max(controlOffset, 50),
    y: start.y
  };
  
  const controlPoint2: Point = {
    x: end.x - Math.max(controlOffset, 50),
    y: end.y
  };
  
  return `M ${start.x} ${start.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${end.x} ${end.y}`;
}

// Edge type configuration for visual styling
const EDGE_CONFIG: Record<string, { color: string; strokeWidth: number; dashArray?: string }> = {
  data: {
    color: "stroke-purple-400",
    strokeWidth: 2
  },
  control: {
    color: "stroke-blue-400", 
    strokeWidth: 2
  },
  error: {
    color: "stroke-red-400",
    strokeWidth: 2,
    dashArray: "5,5"
  }
};

export const FlowEdge = memo(({
  edge,
  startPoint,
  endPoint,
  onEdgeClick,
  onEdgeDoubleClick
}: FlowEdgeProps) => {
  const config = EDGE_CONFIG[edge.kind] || EDGE_CONFIG.data;
  const path = generateBezierPath(startPoint, endPoint);
  
  // Calculate label position (midpoint of curve)
  const labelPosition: Point = {
    x: (startPoint.x + endPoint.x) / 2,
    y: (startPoint.y + endPoint.y) / 2
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdgeClick?.(edge.id);
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdgeDoubleClick?.(edge.id);
  };

  return (
    <g>
      {/* Main edge path */}
      <path
        d={path}
        className={cn(
          "fill-none cursor-pointer transition-all duration-200",
          config.color,
          edge.selected && "stroke-primary drop-shadow-lg",
          edge.animated && "animate-pulse"
        )}
        strokeWidth={config.strokeWidth}
        strokeDasharray={config.dashArray}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />
      
      {/* Invisible thicker path for easier selection */}
      <path
        d={path}
        className="fill-none stroke-transparent cursor-pointer"
        strokeWidth={12}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />
      
      {/* Arrow marker */}
      <defs>
        <marker
          id={`arrow-${edge.id}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="3"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
          className={config.color}
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            className={cn(
              "fill-current",
              edge.selected && "fill-primary"
            )}
          />
        </marker>
      </defs>
      
      {/* Apply arrow marker to main path */}
      <path
        d={path}
        className={cn(
          "fill-none pointer-events-none",
          config.color,
          edge.selected && "stroke-primary"
        )}
        strokeWidth={config.strokeWidth}
        strokeDasharray={config.dashArray}
        markerEnd={`url(#arrow-${edge.id})`}
      />
      
      {/* Edge label */}
      {edge.label && (
        <g transform={`translate(${labelPosition.x}, ${labelPosition.y})`}>
          <rect
            x="-20"
            y="-8"
            width="40"
            height="16"
            rx="8"
            className="fill-background stroke-border"
            strokeWidth="1"
          />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            className="text-xs fill-foreground font-medium pointer-events-none"
          >
            {edge.label}
          </text>
        </g>
      )}
      
      {/* Selection indicator */}
      {edge.selected && (
        <path
          d={path}
          className="fill-none stroke-primary pointer-events-none"
          strokeWidth={config.strokeWidth + 2}
          strokeDasharray="3,3"
          opacity={0.5}
        />
      )}
      
      {/* Draft edge styling */}
      {edge.isDraft && (
        <path
          d={path}
          className="fill-none stroke-muted-foreground pointer-events-none"
          strokeWidth={1}
          strokeDasharray="2,2"
          opacity={0.5}
        />
      )}
    </g>
  );
});

FlowEdge.displayName = "FlowEdge";
