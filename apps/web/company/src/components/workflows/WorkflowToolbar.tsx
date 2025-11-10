"use client";
import { Button } from '@/components/ui/button';
import { 
  MousePointer2, 
  Hand, 
  ArrowRight, 
  Square, 
  GitBranch, 
  Type, 
  Group, 
  Table, 
  Monitor, 
  MessageCircle, 
  Bot,
  Sparkles
} from 'lucide-react';

interface WorkflowToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
}

const tools = [
  { id: 'cursor', label: 'Cursor', icon: MousePointer2, shortcut: 'V', type: 'mode' as const },
  { id: 'hand', label: 'Hand Tool', icon: Hand, shortcut: 'H', type: 'mode' as const },
  { id: 'connector', label: 'Connector', icon: ArrowRight, shortcut: 'C', type: 'mode' as const },
  { id: 'step', label: 'Default Step', icon: Square, shortcut: 'S', type: 'mode' as const },
  { id: 'split', label: 'Split Step', icon: GitBranch, shortcut: 'D', type: 'mode' as const },
  { id: 'text', label: 'Text', icon: Type, shortcut: 'T', type: 'mode' as const },
  { id: 'group', label: 'Group', icon: Group, shortcut: 'G', type: 'action' as const },
  { id: 'table', label: 'Table', icon: Table, shortcut: 'B', type: 'mode' as const },
  { id: 'interface', label: 'Interface', icon: Monitor, shortcut: 'I', type: 'mode' as const },
  { id: 'chatbot', label: 'Chatbot', icon: MessageCircle, shortcut: 'M', type: 'mode' as const },
  { id: 'agent', label: 'Agent', icon: Bot, shortcut: 'A', type: 'mode' as const },
  { id: 'codie', label: 'Codie', icon: Sparkles, shortcut: 'X', type: 'action' as const },
];

export function WorkflowToolbar({ selectedTool, onToolSelect }: WorkflowToolbarProps) {
  return (
    <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-20">
      <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-lg px-3 py-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          // Action buttons (group, codie) don't stay selected - they trigger and return to cursor
          const isSelected = tool.type === 'mode' && selectedTool === tool.id;
          return (
            <Button
              key={tool.id}
              variant={isSelected ? 'default' : 'ghost'}
              size="default"
              onClick={() => onToolSelect(tool.id)}
              className="relative group"
              title={`${tool.label} (${tool.shortcut})`}
            >
              {/* Use size-* to bypass button base styles that force svg size-4 */}
              <Icon className="size-5" />
            </Button>
          );
        })}
      </div>
    </div>
  );
}
