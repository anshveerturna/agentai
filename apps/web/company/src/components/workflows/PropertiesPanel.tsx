import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Settings, Zap, Database, Globe, MessageSquare } from 'lucide-react';
import type { Node } from '@xyflow/react';

interface PropertiesPanelProps {
  selectedNode: Node<Record<string, unknown>> | null;
  isVisible: boolean;
  onClose: () => void;
  onApply?: (data: Record<string, unknown>) => void;
}

export function PropertiesPanel({ selectedNode, isVisible, onClose, onApply }: PropertiesPanelProps) {
  if (!selectedNode) return null;

  // Prefer the semantic node type stored in node.data.nodeType (e.g., 'http', 'table')
  // Fall back to the XYFlow node.type only if a semantic type isn't provided
  const dataObj = (selectedNode.data ?? {}) as Record<string, unknown>;
  const dataNodeType = typeof dataObj.nodeType === 'string' ? (dataObj.nodeType as string) : undefined;
  const configType = typeof (dataObj.config as any)?.type === 'string' ? String((dataObj.config as any).type) : '';
  const derivedFromConfig = configType
    ? (configType.includes('http') ? 'http'
      : configType.includes('table') ? 'table'
      : configType.includes('chat') ? 'chat'
      : undefined)
    : undefined;
  const nodeType = dataNodeType || derivedFromConfig || ((selectedNode.type as string) || 'component');

  // ---------- Shared helpers ----------
  const data = dataObj;
  const initialLabel = typeof data.label === 'string' ? data.label : '';
  const [nameInput, setNameInput] = useState<string>(initialLabel);
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings' | 'code' | 'about'>('parameters');

  type KV = { key: string; value: string };
  type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  type RetryPolicy = 'Default' | 'None' | 'Linear' | 'Exponential';
  interface HttpSettings {
    concurrency: { enabled: boolean; limit: number };
    retryPolicy: RetryPolicy;
    secureInputs: boolean;
    secureOutputs: boolean;
  }
  interface HttpConfig {
    uri: string;
    method: HttpMethod;
    headers: KV[];
    queries: KV[];
    body?: string;
    cookie?: string;
    settings: HttpSettings;
  }

  const initialHttp: HttpConfig = useMemo(() => {
    // Support both old shape (data.http) and current shape (data.config.http)
    const cfg = (data.config as Record<string, unknown> | undefined) || {};
    const http = ((cfg.http as Record<string, unknown> | undefined) ?? (data.http as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
    const toKVArr = (v: unknown): KV[] => Array.isArray(v)
      ? v.filter((x) => x && typeof x === 'object').map((x) => ({
          key: typeof (x as Record<string, unknown>).key === 'string' ? (x as Record<string, unknown>).key as string : '',
          value: typeof (x as Record<string, unknown>).value === 'string' ? (x as Record<string, unknown>).value as string : '',
        }))
      : [];
    const methodRaw = typeof http.method === 'string' ? http.method.toUpperCase() : 'GET';
    const method: HttpMethod = ['GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS'].includes(methodRaw)
      ? (methodRaw as HttpMethod)
      : 'GET';
    const retryRaw = typeof (http.settings as Record<string, unknown> | undefined)?.retryPolicy === 'string'
      ? ((http.settings as Record<string, unknown>).retryPolicy as string)
      : 'Default';
    const retry: RetryPolicy = ['Default','None','Linear','Exponential'].includes(retryRaw) ? (retryRaw as RetryPolicy) : 'Default';
    const settingsObj = (http.settings as Record<string, unknown>) || {};
    const concObj = (settingsObj.concurrency as Record<string, unknown>) || {};
    return {
      uri: typeof http.uri === 'string' ? http.uri : '',
      method,
      headers: toKVArr(http.headers),
      queries: toKVArr(http.queries),
      body: typeof http.body === 'string' ? http.body : '',
      cookie: typeof http.cookie === 'string' ? http.cookie : '',
      settings: {
        concurrency: {
          enabled: typeof concObj.enabled === 'boolean' ? (concObj.enabled as boolean) : false,
          limit: typeof concObj.limit === 'number' ? (concObj.limit as number) : 1,
        },
        retryPolicy: retry,
        secureInputs: typeof settingsObj.secureInputs === 'boolean' ? (settingsObj.secureInputs as boolean) : false,
        secureOutputs: typeof settingsObj.secureOutputs === 'boolean' ? (settingsObj.secureOutputs as boolean) : false,
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode?.id]);

  const [httpState, setHttpState] = useState<HttpConfig>(initialHttp);

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
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
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
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
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
          <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-border px-1">
              {[
                { id: 'parameters', label: 'Parameters' },
                { id: 'settings', label: 'Settings' },
                { id: 'code', label: 'Code view' },
                { id: 'about', label: 'About' },
              ].map(({ id, label }) => (
                <Button key={id} variant={activeTab === id ? 'default' : 'ghost'} size="sm" className="rounded-none"
                  onClick={() => setActiveTab(id as typeof activeTab)}>
                  {label}
                </Button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'parameters' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>URI</Label>
                    <Input
                      placeholder="https://api.example.com/endpoint"
                      value={httpState.uri}
                      onChange={(e) => setHttpState((s) => ({ ...s, uri: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={httpState.method.toLowerCase()} onValueChange={(v) => setHttpState((s) => ({ ...s, method: v.toUpperCase() as HttpMethod }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS'] as const).map((m) => (
                          <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Headers</Label>
                    <div className="space-y-2">
                      {httpState.headers.map((h, idx) => (
                        <div key={`h-${idx}`} className="flex gap-2">
                          <Input placeholder="Enter key" value={h.key}
                            onChange={(e) => setHttpState((s) => { const a = [...s.headers]; a[idx] = { ...a[idx], key: e.target.value }; return { ...s, headers: a }; })} />
                          <Input placeholder="Enter value" value={h.value}
                            onChange={(e) => setHttpState((s) => { const a = [...s.headers]; a[idx] = { ...a[idx], value: e.target.value }; return { ...s, headers: a }; })} />
                          <Button variant="outline" size="sm" onClick={() => setHttpState((s) => ({ ...s, headers: s.headers.filter((_, i) => i !== idx) }))}>Remove</Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" onClick={() => setHttpState((s) => ({ ...s, headers: [...s.headers, { key: '', value: '' }] }))}>Add header</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Queries</Label>
                    <div className="space-y-2">
                      {httpState.queries.map((q, idx) => (
                        <div key={`q-${idx}`} className="flex gap-2">
                          <Input placeholder="Enter key" value={q.key}
                            onChange={(e) => setHttpState((s) => { const a = [...s.queries]; a[idx] = { ...a[idx], key: e.target.value }; return { ...s, queries: a }; })} />
                          <Input placeholder="Enter value" value={q.value}
                            onChange={(e) => setHttpState((s) => { const a = [...s.queries]; a[idx] = { ...a[idx], value: e.target.value }; return { ...s, queries: a }; })} />
                          <Button variant="outline" size="sm" onClick={() => setHttpState((s) => ({ ...s, queries: s.queries.filter((_, i) => i !== idx) }))}>Remove</Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" onClick={() => setHttpState((s) => ({ ...s, queries: [...s.queries, { key: '', value: '' }] }))}>Add query</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Body</Label>
                    <Textarea rows={4} placeholder="JSON or text body" value={httpState.body || ''}
                      onChange={(e) => setHttpState((s) => ({ ...s, body: e.target.value }))} />
                  </div>

                  <div className="space-y-2">
                    <Label>Cookie</Label>
                    <Input placeholder="Enter HTTP cookie" value={httpState.cookie || ''}
                      onChange={(e) => setHttpState((s) => ({ ...s, cookie: e.target.value }))} />
                  </div>

                  {/* Advanced parameters (collapsed style minimal) */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">Advanced parameters</p>
                    <p className="text-xs text-muted-foreground">Configure additional connector options in Settings.</p>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Concurrency control</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Run steps sequentially or in parallel</span>
                      <Switch checked={httpState.settings.concurrency.enabled}
                        onCheckedChange={(v) => setHttpState((s) => ({ ...s, settings: { ...s.settings, concurrency: { ...s.settings.concurrency, enabled: Boolean(v) } } }))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Limit</Label>
                      <Input type="number" className="w-24" min={1} value={httpState.settings.concurrency.limit}
                        disabled={!httpState.settings.concurrency.enabled}
                        onChange={(e) => setHttpState((s) => ({ ...s, settings: { ...s.settings, concurrency: { ...s.settings.concurrency, limit: Number(e.target.value || 1) } } }))} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Retry policy</Label>
                    <Select value={httpState.settings.retryPolicy} onValueChange={(v) => setHttpState((s) => ({ ...s, settings: { ...s.settings, retryPolicy: v as RetryPolicy } }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['Default','None','Linear','Exponential'] as const).map((rp) => (
                          <SelectItem key={rp} value={rp}>{rp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Security</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Secure inputs</span>
                      <Switch checked={httpState.settings.secureInputs}
                        onCheckedChange={(v) => setHttpState((s) => ({ ...s, settings: { ...s.settings, secureInputs: Boolean(v) } }))} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Secure outputs</span>
                      <Switch checked={httpState.settings.secureOutputs}
                        onCheckedChange={(v) => setHttpState((s) => ({ ...s, settings: { ...s.settings, secureOutputs: Boolean(v) } }))} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'code' && (
                <div className="space-y-2">
                  <Label>Definition (editable JSON)</Label>
                  <Textarea rows={16} value={JSON.stringify({ type: 'Http', inputs: { uri: httpState.uri, method: httpState.method }, headers: httpState.headers, queries: httpState.queries, body: httpState.body, cookie: httpState.cookie, settings: httpState.settings }, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value) as Record<string, unknown>;
                        const inputs = (parsed.inputs ?? {}) as Record<string, unknown>;
                        const headers = (parsed.headers ?? []) as unknown;
                        const queries = (parsed.queries ?? []) as unknown;
                        const settings = (parsed.settings ?? {}) as Record<string, unknown>;
                        setHttpState({
                          uri: typeof inputs.uri === 'string' ? inputs.uri : httpState.uri,
                          method: typeof inputs.method === 'string' ? (inputs.method.toUpperCase() as HttpMethod) : httpState.method,
                          headers: Array.isArray(headers) ? headers as KV[] : httpState.headers,
                          queries: Array.isArray(queries) ? queries as KV[] : httpState.queries,
                          body: typeof parsed.body === 'string' ? parsed.body : httpState.body,
                          cookie: typeof parsed.cookie === 'string' ? parsed.cookie : httpState.cookie,
                          settings: {
                            concurrency: {
                              enabled: typeof (settings.concurrency as Record<string, unknown> | undefined)?.enabled === 'boolean' ? ((settings.concurrency as Record<string, unknown>).enabled as boolean) : httpState.settings.concurrency.enabled,
                              limit: typeof (settings.concurrency as Record<string, unknown> | undefined)?.limit === 'number' ? ((settings.concurrency as Record<string, unknown>).limit as number) : httpState.settings.concurrency.limit,
                            },
                            retryPolicy: typeof settings.retryPolicy === 'string' ? (settings.retryPolicy as RetryPolicy) : httpState.settings.retryPolicy,
                            secureInputs: typeof settings.secureInputs === 'boolean' ? (settings.secureInputs as boolean) : httpState.settings.secureInputs,
                            secureOutputs: typeof settings.secureOutputs === 'boolean' ? (settings.secureOutputs as boolean) : httpState.settings.secureOutputs,
                          },
                        });
                      } catch {
                        // ignore JSON edits until valid
                      }
                    }} />
                </div>
              )}

              {activeTab === 'about' && (
                <div className="space-y-2 text-sm">
                  <div><span className="text-muted-foreground">Connector:</span> HTTP</div>
                  <div><span className="text-muted-foreground">Operation note:</span> Trigger an event based on a selected REST API.</div>
                  <div><span className="text-muted-foreground">Connector type:</span> Shared</div>
                  <div><span className="text-muted-foreground">Tags:</span> None</div>
                </div>
              )}
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
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
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
                // Build a config patch compatible with our NodeModel schema
                const payload: Record<string, unknown> = { label: nameInput };
                const config: Record<string, unknown> = {
                  nodeType,
                };
                if (nodeType === 'http') {
                  config.http = httpState;
                }
                (payload as any).config = config;
                onApply?.(payload);
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
