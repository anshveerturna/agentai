import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, Square, GitBranch, Type, Group, Table, Monitor, MessageCircle, Bot, Sparkles, Zap, Database, Globe, FileText } from 'lucide-react';
import { useState } from 'react';

const nodeCategories = [
  {
    title: 'Basic',
    nodes: [
      { id: 'step', label: 'Default Step', icon: Square, description: 'A basic workflow step' },
      { id: 'split', label: 'Split Step', icon: GitBranch, description: 'Conditional logic and branching' },
      { id: 'text', label: 'Text', icon: Type, description: 'Add text and annotations' },
      { id: 'group', label: 'Group', icon: Group, description: 'Group related steps' },
    ]
  },
  {
    title: 'Data',
    nodes: [
      { id: 'table', label: 'Table', icon: Table, description: 'Data table and spreadsheet' },
      { id: 'database', label: 'Database', icon: Database, description: 'Database operations' },
      { id: 'api', label: 'API Call', icon: Globe, description: 'HTTP requests and API calls' },
      { id: 'file', label: 'File', icon: FileText, description: 'File operations' },
    ]
  },
  {
    title: 'Interface',
    nodes: [
      { id: 'interface', label: 'Interface', icon: Monitor, description: 'UI components and forms' },
      { id: 'chatbot', label: 'Chatbot', icon: MessageCircle, description: 'Conversational interfaces' },
    ]
  },
  {
    title: 'AI & Automation',
    nodes: [
      { id: 'agent', label: 'Agent', icon: Bot, description: 'Autonomous AI agents' },
      { id: 'codie', label: 'Codie', icon: Sparkles, description: 'Dynamic AI-powered component' },
      { id: 'trigger', label: 'Trigger', icon: Zap, description: 'Workflow triggers and events' },
    ]
  }
];

export function NodeLibrary() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = nodeCategories.map(category => ({
    ...category,
    nodes: category.nodes.filter(node => 
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.nodes.length > 0);

  const handleDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'workflow-node',
      nodeType,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h2 className="font-semibold mb-3">Node Library</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Node Categories */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {filteredCategories.map((category) => (
            <div key={category.title}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                {category.title}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {category.nodes.map((node) => {
                  const Icon = node.icon;
                  return (
                    <div
                      key={node.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, node.id)}
                      className="group flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-all duration-200"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        node.id === 'codie' 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                          : 'bg-primary'
                      } text-primary-foreground`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center">
                          {node.label}
                          {node.id === 'codie' && (
                            <div className="ml-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {node.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
