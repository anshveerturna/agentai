import React, { memo } from "react";
import { cn } from "@/lib/utils";
import type { NodeModel, Port, Point } from "@/types/flow";

interface FlowNodeProps {
  node: NodeModel;
  zoom: number;
  onMouseDown: (nodeId: string, event: React.MouseEvent) => void;
  onPortMouseDown: (port: Port, event: React.MouseEvent) => void;
  onPortMouseUp: (port: Port, event: React.MouseEvent) => void;
  onDoubleClick?: (nodeId: string) => void;
}

// Node kind configuration for visual styling
const NODE_CONFIG: Record<string, { color: string; icon: string; title: string }> = {
  trigger: {
    color: "bg-green-500",
    icon: "⚡",
    title: "Trigger"
  },
  action: {
    color: "bg-blue-500", 
    icon: "⚙️",
    title: "Action"
  },
  condition: {
    color: "bg-yellow-500",
    icon: "❓",
    title: "Condition"
  },
  loop: {
    color: "bg-purple-500",
    icon: "🔄",
    title: "Loop"
  },
  delay: {
    color: "bg-orange-500",
    icon: "⏱️",
    title: "Delay"
  },
  "error-handler": {
    color: "bg-red-500",
    icon: "❌",
    title: "Error Handler"
  },
  webhook: {
    color: "bg-indigo-500",
    icon: "🔗",
    title: "Webhook"
  },
  schedule: {
    color: "bg-cyan-500",
    icon: "📅",
    title: "Schedule"
  },
  event: {
    color: "bg-blue-600",
    icon: "📧",
    title: "Event"
  },
  "api-call": {
    color: "bg-gray-600",
    icon: "🌐",
    title: "API Call"
  },
  "data-transform": {
    color: "bg-green-600",
    icon: "🗃️",
    title: "Data Transform"
  },
  "ai-operation": {
    color: "bg-teal-500",
    icon: "🤖",
    title: "AI Operation"
  },
  "logic-gate": {
    color: "bg-amber-500",
    icon: "🔍",
    title: "Logic Gate"
  },
  "ai-decision": {
    color: "bg-violet-500",
    icon: "🧠",
    title: "AI Decision"
  },
  "data-validation": {
    color: "bg-pink-500",
    icon: "✓",
    title: "Data Validation"
  },
  "sub-workflow": {
    color: "bg-slate-600",
    icon: "📋",
    title: "Sub-workflow"
  },
  "for-each": {
    color: "bg-emerald-600",
    icon: "�",
    title: "For Each"
  },
  while: {
    color: "bg-sky-600",
    icon: "⭕",
    title: "While"
  },
  parallel: {
    color: "bg-stone-600",
    icon: "⫲",
    title: "Parallel"
  },
  "time-delay": {
    color: "bg-rose-500",
    icon: "⏰",
    title: "Time Delay"
  },
  "event-delay": {
    color: "bg-fuchsia-500",
    icon: "⏳",
    title: "Event Delay"
  },
  "ai-delay": {
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    icon: "�⏳",
    title: "AI Delay"
  },
  retry: {
    color: "bg-yellow-600",
    icon: "↻",
    title: "Retry"
  },
  fallback: {
    color: "bg-red-600",
    icon: "🔄",
    title: "Fallback"
  },
  "ai-monitor": {
    color: "bg-purple-600",
    icon: "👁️",
    title: "AI Monitor"
  },
  custom: {
    color: "bg-neutral-500",
    icon: "🧩",
    title: "Custom"
  }
};

const PORT_CONFIG: Record<string, { color: string; label: string }> = {
  data: { color: "bg-purple-400", label: "Data" },
  control: { color: "bg-blue-400", label: "Control" },
  error: { color: "bg-red-400", label: "Error" }
};

interface PortProps {
  port: Port;
  position: "left" | "right";
  onMouseDown: (port: Port, event: React.MouseEvent) => void;
  onMouseUp: (port: Port, event: React.MouseEvent) => void;
}

const Port = memo(({ port, position, onMouseDown, onMouseUp }: PortProps) => {
  const config = PORT_CONFIG[port.kind] || PORT_CONFIG.data;
  const portIndex = 0; // Would be calculated based on port order in real implementation
  
  return (
    <div
      className={cn(
        "absolute w-3 h-3 rounded-full border-2 border-white cursor-pointer",
        "hover:scale-125 transition-transform duration-200",
        "shadow-sm",
        config.color,
        position === "left" ? "-left-1.5" : "-right-1.5"
      )}
      style={{
        top: `${(portIndex * 24) + 12}px`
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown(port, e);
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        onMouseUp(port, e);
      }}
      title={`${port.name} (${config.label})`}
    />
  );
});

Port.displayName = "Port";

export const FlowNode = memo(({ 
  node, 
  zoom, 
  onMouseDown, 
  onPortMouseDown, 
  onPortMouseUp,
  onDoubleClick 
}: FlowNodeProps) => {
  const config = NODE_CONFIG[node.kind] || NODE_CONFIG.custom;
  const inputPorts = node.ports?.filter(p => p.direction === "in") || [];
  const outputPorts = node.ports?.filter(p => p.direction === "out") || [];
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMouseDown(node.id, e);
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.(node.id);
  };

  return (
    <div
      className={cn(
        "absolute select-none cursor-move",
        "bg-card border border-border rounded-lg shadow-sm",
        "hover:shadow-md transition-shadow duration-200",
        node.selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.size?.width || 200,
        height: node.size?.height || 100,
        transform: `scale(${Math.max(0.5, Math.min(1, zoom))})`,
        transformOrigin: "top left"
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Node Header */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-t-lg text-white text-sm font-medium",
        config.color
      )}>
        <span className="text-base">{node.icon || config.icon}</span>
        <span className="flex-1 truncate">{node.label}</span>
        
        {node.status && (
          <div className={cn(
            "w-2 h-2 rounded-full",
            node.status === "running" && "bg-yellow-300 animate-pulse",
            node.status === "success" && "bg-green-300",
            node.status === "error" && "bg-red-300",
            node.status === "idle" && "bg-gray-300",
            node.status === "warning" && "bg-orange-300"
          )} />
        )}
      </div>
      
      {/* Node Body */}
      <div className="px-3 py-2 bg-background rounded-b-lg relative min-h-[60px]">
        {node.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {node.description}
          </p>
        )}
        
        {/* Node Configuration Preview */}
        {node.config && Object.keys(node.config).length > 0 && (
          <div className="text-xs text-muted-foreground">
            {Object.entries(node.config).slice(0, 2).map(([key, value]) => (
              <div key={key} className="truncate">
                <span className="font-medium">{key}:</span> {String(value)}
              </div>
            ))}
            {Object.keys(node.config).length > 2 && (
              <div className="text-xs text-muted-foreground/70">
                +{Object.keys(node.config).length - 2} more...
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Input Ports */}
      {inputPorts.map((port, index) => (
        <Port
          key={port.id}
          port={port}
          position="left"
          onMouseDown={onPortMouseDown}
          onMouseUp={onPortMouseUp}
        />
      ))}
      
      {/* Output Ports */}
      {outputPorts.map((port, index) => (
        <Port
          key={port.id}
          port={port}
          position="right"
          onMouseDown={onPortMouseDown}
          onMouseUp={onPortMouseUp}
        />
      ))}
      
      {/* Resize Handle */}
      <div
        className={cn(
          "absolute bottom-0 right-0 w-3 h-3",
          "cursor-se-resize opacity-0 hover:opacity-100",
          "bg-muted-foreground/50 rounded-tl"
        )}
        onMouseDown={(e) => {
          e.stopPropagation();
          // TODO: Implement resize functionality
        }}
      />
    </div>
  );
});

FlowNode.displayName = "FlowNode";
