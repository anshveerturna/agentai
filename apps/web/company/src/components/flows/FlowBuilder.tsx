"use client";

import React, { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search,
  Sparkles,
  Play,
  Pause,
  Save,
  Share
} from "lucide-react";

import { FlowCanvas } from "./canvas/FlowCanvas";
import { NodeLibrary } from "./nodes/NodeLibrary";
import { PropertiesPanel } from "./panels/PropertiesPanel";
import { ToolbarPanel } from "./panels/ToolbarPanel";
import { BottomPanel } from "./panels/BottomPanel";
import { useFlowStore } from "@/store/flowStore";

export function FlowBuilder() {
  const [searchNodes, setSearchNodes] = useState("");
  const { 
    workflow,
    saveWorkflow,
    executeWorkflow,
    isExecuting,
    ui,
    toggleBottomPanel
  } = useFlowStore();

  const handleSave = useCallback(() => {
    saveWorkflow();
  }, [saveWorkflow]);

  const handleExecute = useCallback(() => {
    executeWorkflow();
  }, [executeWorkflow]);

  return (
    <DashboardLayout fullBleed contentClassName="!p-0">
  <div className="h-full flex flex-col overflow-hidden bg-background">
        {/* Page Header */}
        <div className="flex-none bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <span>Workspace</span>
                <span>/</span>
                <span className="text-foreground">Flows</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                {workflow.name || "Untitled Flow"}
                <span className="inline-flex items-center gap-1 text-xs font-medium text-sidebar-primary bg-sidebar-primary/10 px-2 py-0.5 rounded-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  Enterprise
                </span>
              </h1>
            </div>
            
            {/* Top Actions removed to avoid duplication with toolbar */}
          </div>
        </div>

        {/* Main Content Area */}
  <div className="flex-1 flex overflow-hidden bg-muted/20">
          {/* Left Sidebar - Node Library */}
          {!ui?.focusMode && ui?.leftPanel && (
            <div className="flex-none w-80 border-r border-border bg-card flex flex-col">
            <div className="flex-none p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground mb-3">Node Library</h2>
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchNodes}
                  onChange={(e) => setSearchNodes(e.target.value)}
                  placeholder="Search nodes..."
                  className="pl-9"
                />
              </div>
            </div>
               <div className="flex-1 overflow-y-auto">
                 <NodeLibrary />
               </div>
            </div>
          )}

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex-none border-b border-border bg-card px-4 py-2">
              <ToolbarPanel />
            </div>

            {/* Canvas */}
            <div className="flex-1 relative overflow-hidden bg-background">
              <FlowCanvas />
            </div>

            {/* Bottom Panel */}
            {!ui?.focusMode && ui?.bottomPanel && (
              <div className="flex-none border-t border-border bg-card h-80">
                <BottomPanel />
              </div>
            )}
          </div>

          {/* Right Sidebar - Properties */}
          {!ui?.focusMode && ui?.rightPanel && (
            <div className="flex-none w-80 border-l border-border bg-card">
              <PropertiesPanel />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
