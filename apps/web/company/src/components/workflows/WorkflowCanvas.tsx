import React, { useState, useEffect } from 'react';
import { WorkflowToolbar } from './WorkflowToolbar';
import ReactFlowCanvas, { type AddNodeFn } from './flow/ReactFlowCanvas';
import { WorkflowCodeEditor } from './WorkflowCodeEditor';
import { CommandPalette } from '@/components/workflows/CommandPalette';
import { PropertiesPanel } from './PropertiesPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Code2, Play, Save } from 'lucide-react';
import type { Node } from '@xyflow/react';

interface WorkflowCanvasProps {
  onBack: () => void;
  isCodeView: boolean;
  onToggleCodeView: () => void;
}

export function WorkflowCanvas({ onBack, isCodeView, onToggleCodeView }: WorkflowCanvasProps) {
  const [selectedTool, setSelectedTool] = useState('cursor');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [addNodeApi, setAddNodeApi] = useState<AddNodeFn | null>(null);
  const [flowApi, setFlowApi] = useState<{
    zoomIn: () => void; zoomOut: () => void; fitView: () => void; toggleMinimap: () => void; toggleGrid: () => void; updateNodeData: (id: string, data: Record<string, any>) => void;
  } | null>(null);

  // Handle ESC key to dismiss panels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
  setSelectedNode(null);
        setShowPropertiesPanel(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show properties panel when node is selected
  useEffect(() => {
  setShowPropertiesPanel(!!selectedNode);
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

  if (isCodeView) {
    return <WorkflowCodeEditor onToggleView={onToggleCodeView} />;
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
          <h1 className="text-lg font-semibold">Customer Support Automation</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isCodeView ? "default" : "outline"}
            size="sm"
            onClick={onToggleCodeView}
          >
            {isCodeView ? <Eye className="w-4 h-4 mr-2" /> : <Code2 className="w-4 h-4 mr-2" />}
            {isCodeView ? "Visual" : "Code"}
          </Button>
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button size="sm">
            <Play className="w-4 h-4 mr-2" />
            Run Workflow
          </Button>
        </div>
      </div>

      {/* Full-Screen Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlowCanvas 
          mode={selectedTool === 'hand' ? 'pan' : 'select'}
          onNodeSelect={setSelectedNode}
          onAddNodeRequest={handleAddNode}
          onReady={({ addNode, zoomIn, zoomOut, fitView, toggleMinimap, toggleGrid, updateNodeData }) => {
            setAddNodeApi(() => addNode);
            setFlowApi({ zoomIn, zoomOut, fitView, toggleMinimap, toggleGrid, updateNodeData });
          }}
        />
        
        {/* Floating Toolbar */}
        <WorkflowToolbar
          selectedTool={selectedTool}
          onToolSelect={(tool) => {
            setSelectedTool(tool);
            // Quick actions: open palette or invoke flow controls for special IDs
            if (tool === 'codie') {
              setShowCommandPalette(true);
            }
          }}
        />

        {/* Command Palette Modal */}
        {showCommandPalette && (
          <CommandPalette
            onClose={() => setShowCommandPalette(false)}
            onNodeCreated={handleNodeCreated}
          />
        )}

        {/* Contextual Properties Panel */}
        <PropertiesPanel 
          selectedNode={selectedNode} 
          isVisible={showPropertiesPanel}
          onClose={() => {
            setSelectedNode(null);
            setShowPropertiesPanel(false);
          }}
          onApply={applyProperties}
        />

        {/* Bottom-left Zoom Controls */}
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
      </div>
    </div>
  );
}
