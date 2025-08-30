"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Save,
  Play,
  Pause,
  PanelLeft,
  PanelRight,
  PanelBottomClose,
  PanelBottomOpen,
  Focus
} from "lucide-react";
import { useFlowStore } from "@/store/flowStore";

interface ToolbarPanelProps {
  className?: string;
}

export function ToolbarPanel({ className }: ToolbarPanelProps) {
  const {
    viewport,
    zoomBy,
  zoomToFit,
    resetZoom,
    undo,
    redo,
    history,
    redoStack,
    saveWorkflow,
    executeWorkflow,
    stopExecution,
  isExecuting,
  ui,
  toggleLeftPanel,
  toggleRightPanel,
  toggleBottomPanel,
  setFocusMode
  } = useFlowStore();

  const handleZoomIn = () => {
    zoomBy(1.2);
  };

  const handleZoomOut = () => {
    zoomBy(0.8);
  };

  const canUndo = history.length > 0;
  const canRedo = redoStack.length > 0;

  return (
    <div className={cn(
      "flex items-center gap-1 px-4 py-2 bg-card border-b border-border",
      className
    )}>
      {/* Execute + Save */}
      <div className="flex items-center gap-1 mr-4">
        {!isExecuting ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={executeWorkflow}
            className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Play className="w-4 h-4 mr-1" />
            Run
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={stopExecution}
            className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Pause className="w-4 h-4 mr-1" />
            Stop
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={saveWorkflow}
          className="h-8 px-3"
        >
          <Save className="w-4 h-4 mr-1" />
          Save
        </Button>
      </div>

  {/* History Controls */}
  <div className="flex items-center gap-1 mr-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          className="h-8 px-2"
          title="Undo"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          className="h-8 px-2"
          title="Redo"
        >
          <RotateCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 mr-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          className="h-8 px-2"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        
        <div className="px-2 py-1 text-xs font-medium text-muted-foreground min-w-[60px] text-center">
          {Math.round(viewport.zoom * 100)}%
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          className="h-8 px-2"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

    {/* Fit / Reset */}
    <div className="flex items-center gap-1 mr-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomToFit}
      className="h-8 px-2"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetZoom}
          className="h-8 px-2"
          title="Reset Zoom"
        >
          <Minimize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Panel Toggles + Focus */}
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant={ui?.focusMode ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 px-2"
          title="Focus Mode (hide panels)"
          onClick={() => setFocusMode(!(ui?.focusMode ?? false))}
        >
          <Focus className="w-4 h-4" />
        </Button>
        <Button
          variant={ui?.leftPanel ? 'ghost' : 'secondary'}
          size="sm"
          className="h-8 px-2"
          title={ui?.leftPanel ? 'Hide Node Library' : 'Show Node Library'}
          onClick={toggleLeftPanel}
        >
          <PanelLeft className="w-4 h-4" />
        </Button>
        <Button
          variant={ui?.rightPanel ? 'ghost' : 'secondary'}
          size="sm"
          className="h-8 px-2"
          title={ui?.rightPanel ? 'Hide Properties' : 'Show Properties'}
          onClick={toggleRightPanel}
        >
          <PanelRight className="w-4 h-4" />
        </Button>
        <Button
          variant={ui?.bottomPanel ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 px-2"
          title={ui?.bottomPanel ? 'Hide Bottom Panel' : 'Show Bottom Panel'}
          onClick={toggleBottomPanel}
        >
          {ui?.bottomPanel ? (
            <PanelBottomClose className="w-4 h-4" />
          ) : (
            <PanelBottomOpen className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
