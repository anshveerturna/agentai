import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Settings, Zap, Database, Globe, MessageSquare } from 'lucide-react';
import type { Node } from '@xyflow/react';

interface PropertiesPanelProps {
  selectedNode: Node | null;
  isVisible: boolean;
  onClose: () => void;
  onApply?: (data: Record<string, any>) => void;
}

export function PropertiesPanel({ selectedNode, isVisible, onClose, onApply }: PropertiesPanelProps) {
  if (!selectedNode) return null;

  const nodeType = (selectedNode.type as string) || 'component';

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'trigger': return Zap;
      case 'table': return Database;
      case 'http': return Globe;
      case 'chat': return MessageSquare;
      default: return Settings;
    }
  };

  const getNodeName = (nodeType: string) => {
    switch (nodeType) {
      case 'trigger': return 'Trigger';
      case 'table': return 'Table';
      case 'http': return 'HTTP Request';
      case 'chat': return 'Chat Interface';
      default: return 'Component';
    }
  };

  const renderNodeProperties = () => {
    switch (nodeType) {
      case 'trigger':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="trigger-name">Trigger Name</Label>
              <Input
                id="trigger-name"
                placeholder="Enter trigger name"
                defaultValue={String((selectedNode.data as any)?.label ?? 'Customer Request')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="trigger-type">Trigger Type</Label>
              <Select value="webhook">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="schedule">Schedule</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://api.example.com/webhook"
                defaultValue="/api/support/incoming"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Enabled</Label>
              <Switch id="enabled" checked />
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="table-name">Table Name</Label>
              <Input
                id="table-name"
                placeholder="Enter table name"
                defaultValue={String((selectedNode.data as any)?.label ?? 'Customer Data')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="data-source">Data Source</Label>
              <Select value="manual">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="csv">CSV File</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="columns">Columns</Label>
              <Textarea
                id="columns"
                placeholder="Define table columns..."
                defaultValue="Name, Email, Issue Type, Priority, Status"
                rows={3}
              />
            </div>
          </div>
        );

      case 'http':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="http-method">HTTP Method</Label>
              <Select value="post">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="get">GET</SelectItem>
                  <SelectItem value="post">POST</SelectItem>
                  <SelectItem value="put">PUT</SelectItem>
                  <SelectItem value="delete">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="http-url">URL</Label>
              <Input
                id="http-url"
                placeholder="https://api.example.com/endpoint"
                defaultValue="https://api.slack.com/chat.postMessage"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="headers">Headers</Label>
              <Textarea
                id="headers"
                placeholder="Authorization: Bearer token..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Request Body</Label>
              <Textarea
                id="body"
                placeholder="JSON request body..."
                rows={4}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="component-name">Component Name</Label>
              <Input
                id="component-name"
                placeholder="Enter component name"
                defaultValue={String((selectedNode.data as any)?.label ?? '')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this component does..."
                rows={3}
              />
            </div>
          </div>
        );
    }
  };

  const Icon = getNodeIcon(nodeType);

  return (
    <>
      {/* Backdrop */}
      {isVisible && (
        <div 
          className="fixed inset-0 bg-black/20 z-30"
          onClick={onClose}
        />
      )}
      
      {/* Sliding Panel */}
      <div 
        className={`
          fixed top-0 right-0 h-full w-96 bg-background border-l border-border z-40
          transform transition-transform duration-300 ease-out
          ${isVisible ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">{getNodeName(nodeType)}</h2>
              <p className="text-sm text-muted-foreground">Configure component settings</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {renderNodeProperties()}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => {
                // Minimal apply: update node label based on visible name field
                let label = (selectedNode.data as any)?.label ?? '';
                const triggerName = (document.getElementById('trigger-name') as HTMLInputElement | null)?.value;
                const tableName = (document.getElementById('table-name') as HTMLInputElement | null)?.value;
                const componentName = (document.getElementById('component-name') as HTMLInputElement | null)?.value;
                label = triggerName ?? tableName ?? componentName ?? label;
                onApply?.({ label });
                onClose();
              }}>
                Apply Changes
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
