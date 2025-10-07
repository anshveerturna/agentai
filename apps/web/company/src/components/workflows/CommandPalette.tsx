"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Zap, 
  Database, 
  Globe, 
  MessageSquare, 
  Split, 
  Filter, 
  Upload,
  Download,
  Mail,
  Calendar,
  FileText,
  Settings,
  Bot,
  Code,
  X
} from 'lucide-react';

interface CommandPaletteProps {
  onClose: () => void;
  onNodeCreated: (nodeType: string) => void;
}

interface NodeType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: string;
  keywords: string[];
}

const nodeTypes: NodeType[] = [
  {
    id: 'trigger',
    name: 'Trigger',
    description: 'Start your workflow with a trigger event',
    icon: Zap,
    category: 'Basic',
    keywords: ['start', 'begin', 'trigger', 'webhook', 'http', 'event']
  },
  {
    id: 'split',
    name: 'Split Step',
    description: 'Branch your workflow into multiple paths',
    icon: Split,
    category: 'Basic',
    keywords: ['split', 'branch', 'condition', 'if', 'logic', 'decision']
  },
  {
    id: 'filter',
    name: 'Filter',
    description: 'Filter data based on conditions',
    icon: Filter,
    category: 'Basic',
    keywords: ['filter', 'condition', 'where', 'match', 'criteria']
  },
  {
    id: 'table',
    name: 'Table',
    description: 'Display and manage data in a table format',
    icon: Database,
    category: 'Data',
    keywords: ['table', 'data', 'database', 'rows', 'columns', 'spreadsheet']
  },
  {
    id: 'upload',
    name: 'File Upload',
    description: 'Upload files and documents',
    icon: Upload,
    category: 'Data',
    keywords: ['upload', 'file', 'document', 'attachment', 'import']
  },
  {
    id: 'download',
    name: 'Download',
    description: 'Download or export data',
    icon: Download,
    category: 'Data',
    keywords: ['download', 'export', 'file', 'save', 'output']
  },
  {
    id: 'http',
    name: 'HTTP Request',
    description: 'Make API calls and HTTP requests',
    icon: Globe,
    category: 'Interface',
    keywords: ['http', 'api', 'request', 'webhook', 'rest', 'get', 'post']
  },
  {
    id: 'email',
    name: 'Send Email',
    description: 'Send emails and notifications',
    icon: Mail,
    category: 'Interface',
    keywords: ['email', 'mail', 'send', 'notification', 'message']
  },
  {
    id: 'schedule',
    name: 'Schedule',
    description: 'Schedule and time-based actions',
    icon: Calendar,
    category: 'Interface',
    keywords: ['schedule', 'time', 'delay', 'cron', 'timer', 'wait']
  },
  {
    id: 'agent',
    name: 'Agent',
    description: 'AI agent for intelligent processing',
    icon: Bot,
    category: 'AI',
    keywords: ['agent', 'ai', 'assistant', 'intelligent', 'process', 'analyze']
  },
  {
    id: 'codie',
    name: 'Codie',
    description: 'AI coding assistant for custom logic',
    icon: Code,
    category: 'AI',
    keywords: ['codie', 'code', 'custom', 'script', 'function', 'ai', 'assistant']
  },
  {
    id: 'chat',
    name: 'Chat Interface',
    description: 'Interactive chat and messaging',
    icon: MessageSquare,
    category: 'AI',
    keywords: ['chat', 'message', 'conversation', 'interactive', 'bot']
  }
];

export function CommandPalette({ onClose, onNodeCreated }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNodes, setFilteredNodes] = useState(nodeTypes);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when palette opens
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Filter nodes based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNodes(nodeTypes);
      setSelectedIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = nodeTypes.filter(node => 
      node.name.toLowerCase().includes(query) ||
      node.description.toLowerCase().includes(query) ||
      node.keywords.some(keyword => keyword.includes(query))
    );
    
    setFilteredNodes(filtered);
    setSelectedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredNodes.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredNodes[selectedIndex]) {
            handleNodeSelect(filteredNodes[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredNodes, selectedIndex, onClose]);

  const handleNodeSelect = (node: NodeType) => {
    onNodeCreated(node.id);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Basic': return 'bg-blue-500';
      case 'Data': return 'bg-green-500';
      case 'Interface': return 'bg-purple-500';
      case 'AI': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search for workflow components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredNodes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="text-lg font-medium mb-2">No components found</div>
              <div className="text-sm">Try searching for "trigger", "data", or "ai"</div>
            </div>
          ) : (
            <div className="p-2">
              {filteredNodes.map((node, index) => {
                const Icon = node.icon;
                const isSelected = index === selectedIndex;
                
                return (
                  <button
                    key={node.id}
                    onClick={() => handleNodeSelect(node)}
                    className={`
                      w-full flex items-center gap-4 p-3 rounded-lg text-left transition-colors
                      ${isSelected 
                        ? 'bg-accent text-accent-foreground' 
                        : 'hover:bg-accent/50'
                      }
                    `}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${getCategoryColor(node.category)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{node.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {node.description}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                      {node.category}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-muted/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">Enter</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
