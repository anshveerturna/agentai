import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Square, GitBranch, Type, Group, Table, Monitor, MessageCircle, Bot, Sparkles } from 'lucide-react';

interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: any;
}

interface WorkflowNodeProps {
  node: Node;
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (nodeId: string, deltaX: number, deltaY: number) => void;
  onStartConnection: (nodeId: string, position: { x: number; y: number }) => void;
  onEndConnection: (nodeId: string) => void;
}

const nodeStyles = {
  default: { color: 'bg-blue-500', icon: Square },
  split: { color: 'bg-orange-500', icon: GitBranch },
  text: { color: 'bg-gray-500', icon: Type },
  group: { color: 'bg-purple-500', icon: Group },
  table: { color: 'bg-green-500', icon: Table },
  interface: { color: 'bg-cyan-500', icon: Monitor },
  chatbot: { color: 'bg-pink-500', icon: MessageCircle },
  agent: { color: 'bg-indigo-500', icon: Bot },
  codie: { color: 'bg-gradient-to-r from-purple-500 to-pink-500', icon: Sparkles },
};

export function WorkflowNode({ 
  node, 
  isSelected, 
  onSelect, 
  onDrag, 
  onStartConnection, 
  onEndConnection 
}: WorkflowNodeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  const style = nodeStyles[node.type as keyof typeof nodeStyles] || nodeStyles.default;
  const Icon = style.icon;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    onSelect();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = (e.clientX - dragStart.x);
      const deltaY = (e.clientY - dragStart.y);
      onDrag(node.id, deltaX, deltaY);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleConnectionStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = nodeRef.current?.getBoundingClientRect();
    if (rect) {
      onStartConnection(node.id, {
        x: node.position.x + node.size.width,
        y: node.position.y + node.size.height / 2
      });
    }
  };

  const handleConnectionEnd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEndConnection(node.id);
  };

  return (
    <div
      ref={nodeRef}
      className={`absolute cursor-move select-none rounded-xl shadow-lg border-2 transition-all duration-200 ${
        isSelected ? 'border-primary shadow-xl' : 'border-border/20 hover:border-border/40'
      }`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.size.width,
        height: node.size.height,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Node Header */}
      <div className={`h-10 rounded-t-xl flex items-center px-3 text-white font-medium ${style.color}`}>
        <Icon className="w-4 h-4 mr-2" />
        <span className="flex-1 truncate">{node.data.label || 'Untitled'}</span>
        {node.type === 'codie' && (
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        )}
      </div>

      {/* Node Body */}
      <div className="flex-1 bg-background/95 rounded-b-xl p-3 border-t border-border/10">
        <div className="text-sm text-muted-foreground">
          {node.data.description || 'Configure this step...'}
        </div>
      </div>

      {/* Connection Points */}
      <div 
        className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-background cursor-pointer hover:scale-125 transition-transform"
        onMouseDown={handleConnectionEnd}
        title="Input"
      />
      <div 
        className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full border-2 border-background cursor-pointer hover:scale-125 transition-transform"
        onMouseDown={handleConnectionStart}
        title="Output"
      />

      {/* Resize Handle */}
      <div className="absolute bottom-1 right-1 w-3 h-3 cursor-se-resize opacity-50 hover:opacity-100">
        <div className="w-full h-full bg-muted-foreground/50 rounded" />
      </div>
    </div>
  );
}
