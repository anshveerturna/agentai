import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code, Download, Upload, Eye, EyeOff } from 'lucide-react';

interface WorkflowCodeEditorProps {
  onToggleView?: () => void;
}

export function WorkflowCodeEditor({ onToggleView }: WorkflowCodeEditorProps) {
  const [code, setCode] = useState(`# Workflow Configuration
name: "Untitled Workflow"
description: "A new workflow"

# Triggers
triggers:
  - type: webhook
    name: "webhook_trigger"
    config:
      path: "/webhook"
      method: "POST"

# Steps
steps:
  - id: "step_1"
    type: "default"
    name: "Process Data"
    position:
      x: 100
      y: 100
    config:
      action: "transform"
      script: |
        function transform(data) {
          return {
            ...data,
            processed: true,
            timestamp: new Date().toISOString()
          };
        }

  - id: "step_2"
    type: "agent"
    name: "AI Analysis"
    position:
      x: 400
      y: 100
    config:
      model: "gpt-4"
      prompt: "Analyze the following data and provide insights"
      temperature: 0.7

# Connections
connections:
  - source: "webhook_trigger"
    target: "step_1"
  - source: "step_1"
    target: "step_2"

# Configuration
config:
  timeout: 300
  retry_count: 3
  error_handling: "continue"
`);

  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Editor Header */}
      <div className="h-12 border-b border-border/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleView}
            className="text-muted-foreground hover:text-foreground"
          >
            <Eye className="w-4 h-4 mr-2" />
            Back to Visual
          </Button>
          <div className="h-6 w-px bg-border mx-2" />
          <Code className="w-4 h-4" />
          <span className="font-medium">Workflow Code</span>
          <span className="text-xs text-muted-foreground">YAML</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex">
        {/* Code Editor */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} flex flex-col`}>
          <div className="flex-1 relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full p-4 bg-background border-none outline-none font-mono text-sm resize-none"
              placeholder="Enter your workflow configuration..."
              spellCheck={false}
            />
          </div>
          
          {/* Status Bar */}
          <div className="h-6 bg-muted/30 border-t border-border/50 flex items-center justify-between px-3 text-xs text-muted-foreground">
            <span>YAML • Line 1, Column 1</span>
            <span>UTF-8</span>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/2 border-l border-border/50 flex flex-col">
            <div className="h-10 border-b border-border/50 flex items-center px-4 text-sm font-medium">
              Visual Preview
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Workflow Info */}
                <div className="p-3 rounded-lg border border-border/50">
                  <h3 className="font-medium mb-2">Workflow Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><strong>Name:</strong> Untitled Workflow</div>
                    <div><strong>Description:</strong> A new workflow</div>
                    <div><strong>Steps:</strong> 2</div>
                    <div><strong>Connections:</strong> 2</div>
                  </div>
                </div>

                {/* Triggers */}
                <div className="p-3 rounded-lg border border-border/50">
                  <h3 className="font-medium mb-2">Triggers</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Webhook Trigger</span>
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div className="p-3 rounded-lg border border-border/50">
                  <h3 className="font-medium mb-2">Steps</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Process Data</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm">AI Analysis</span>
                    </div>
                  </div>
                </div>

                {/* Validation Status */}
                <div className="p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Configuration Valid
                    </span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
