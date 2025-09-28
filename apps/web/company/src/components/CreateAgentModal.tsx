'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ChevronRight, Sparkles, Plus } from 'lucide-react';
import { templates as sharedTemplates, AgentTemplate as SharedAgentTemplate } from '@/data/templates';
import { getSupabaseClient } from '@/lib/supabase.client';

// Use the same-origin proxy so Authorization can be attached from HttpOnly cookies
const API_PROXY = '/api/company';

export type AgentTemplate = SharedAgentTemplate;

type CreateAgentModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefillTemplate?: AgentTemplate | null;
};

export default function CreateAgentModal({ open, onOpenChange, prefillTemplate }: CreateAgentModalProps) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [seedPrompt, setSeedPrompt] = useState('');
  const [stage, setStage] = useState<'detail' | 'form'>('form');
  const templates: AgentTemplate[] = sharedTemplates;

  useEffect(() => {
  if (open) {
      setSelectedTemplate(prefillTemplate ?? null);
      if (prefillTemplate) {
        setName(prefillTemplate.title);
        setDescription(prefillTemplate.description ?? '');
  // Only show detail stage if template has any descriptive fields
  const hasDetail = !!(prefillTemplate.trigger || prefillTemplate.detailsMarkdown || (prefillTemplate.actions && prefillTemplate.actions.length));
  setStage(hasDetail ? 'detail' : 'form');
      } else {
        setName('');
        setDescription('');
    setStage('form');
      }
      setSeedPrompt('');
    }
  }, [open, prefillTemplate]);

  const mutation = useMutation({
    mutationFn: async () => {
      // Attach Authorization header proactively using Supabase token
      let authHeader: Record<string, string> = {}
      try {
        const supabase = getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (token) authHeader = { Authorization: `Bearer ${token}` }
      } catch {}

      const res = await fetch(`${API_PROXY}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          name,
          description,
          seedPrompt: seedPrompt || undefined,
          templateId: selectedTemplate?.id,
          companyId: 'demo-company-123',
        }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to create agent');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      onOpenChange(false);
    },
  });

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullscreen" className="overflow-hidden">
        {/* Accessibility title for screen readers */}
        <DialogTitle className="sr-only">Create agent</DialogTitle>
        <DialogDescription className="sr-only">Create a new agent from scratch or start with a template and customize its details.</DialogDescription>
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border px-4 md:px-6 h-14">
          <div className="flex items-center gap-2 text-foreground">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">Create agent</span>
            {selectedTemplate && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{selectedTemplate.title}</span>
              </>
            )}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent theme-transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - two-pane layout */}
        <div className="grid grid-rows-[1fr_auto] md:grid-rows-1 md:grid-cols-[360px_1fr] h-[calc(100vh-56px)]">
          {/* Left: templates list */}
          <div className="border-r border-border overflow-y-auto">
            <div className="p-4 md:p-5">
              <div className="space-y-3">
                <div>
                  <div className="text-[13px] font-medium text-foreground mb-2">Start from scratch</div>
                  <button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setName('');
                      setDescription('');
                      setStage('form');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md border theme-transition flex items-center gap-2 ${
                      selectedTemplate === null
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                      <Plus className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">Create a custom agent</div>
                      <div className="text-xs text-muted-foreground">Blank agent</div>
                    </div>
                  </button>
                </div>

                <div className="pt-1">
                  <div className="text-[13px] font-medium text-foreground mb-2">Use a template</div>
                  <div className="rounded-md border border-border overflow-hidden bg-card">
                    <ul className="divide-y divide-border">
                      {templates.map((t) => {
                        const selected = selectedTemplate?.id === t.id;
                        return (
                          <li key={t.id}>
                            <button
                              onClick={() => {
                                setSelectedTemplate(t);
                                setName(t.title);
                                setDescription(t.description ?? '');
                                const hasDetail = !!(t.trigger || t.detailsMarkdown || (t.actions && t.actions.length));
                                setStage(hasDetail ? 'detail' : 'form');
                              }}
                              className={`w-full text-left px-3 py-2 flex items-center gap-3 theme-transition ${
                                selected
                                  ? 'bg-primary/10'
                                  : 'hover:bg-accent'
                              }`}
                            >
                              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-base">
                                {t.icon ?? '🤖'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-card-foreground truncate">{t.title}</div>
                                {t.description && (
                                  <div className="text-xs text-muted-foreground truncate">{t.description}</div>
                                )}
                              </div>
                              {t.integrations && t.integrations.length > 0 && (
                                <div className="hidden sm:flex items-center gap-1 text-lg opacity-80">
                                  {t.integrations.slice(0, 4).map((ic, idx) => (
                                    <span key={idx} aria-hidden>{ic}</span>
                                  ))}
                                </div>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: conditional pane */}
          <div className="overflow-y-auto">
            {stage === 'detail' && selectedTemplate ? (
              <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                      {selectedTemplate.icon && <span className="text-lg" aria-hidden>{selectedTemplate.icon}</span>}
                      {selectedTemplate.title}
                    </h2>
                    {selectedTemplate.description && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedTemplate.description}</p>
                    )}
                  </div>
                </div>

                {selectedTemplate.trigger && (
                  <div className="border border-border rounded-md p-3 bg-card">
                    <div className="text-xs font-medium text-muted-foreground mb-2">{selectedTemplate.triggerLabel || 'Trigger'}:</div>
                    <div className="inline-flex items-center gap-2 text-sm px-2 py-1 rounded border border-border bg-muted">
                      {selectedTemplate.trigger}
                    </div>
                  </div>
                )}

                {selectedTemplate.detailsMarkdown && (
                  <div className="border border-border rounded-md p-4 bg-card text-sm whitespace-pre-wrap leading-relaxed break-words">
                    {selectedTemplate.detailsMarkdown}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.actions?.map((a) => (
                    <span key={a} className="text-xs border border-border rounded-md px-2 py-1 bg-muted">
                      {a}
                    </span>
                  ))}
                </div>

                {selectedTemplate.referenceMaterials && selectedTemplate.referenceMaterials.length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="font-medium uppercase tracking-wide">Reference Materials</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {selectedTemplate.referenceMaterials.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 pb-8">
                  <Button
                    className="w-full md:w-auto"
                    onClick={() => {
                      setStage('form');
                    }}
                  >
                    Use this template
                  </Button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canCreate) mutation.mutate();
                }}
                className="max-w-3xl mx-auto p-4 md:p-8 space-y-6"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-semibold text-foreground">{selectedTemplate ? 'Customize your agent' : 'Create a custom agent'}</h2>
                    {selectedTemplate && (selectedTemplate.trigger || selectedTemplate.detailsMarkdown || (selectedTemplate.actions && selectedTemplate.actions.length)) && (
                      <button
                        type="button"
                        onClick={() => setStage('detail')}
                        className="text-xs text-muted-foreground hover:text-foreground underline theme-transition"
                      >
                        View template details
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Give your agent a clear name and describe its purpose. Optionally add a seed prompt to guide behavior.
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., IT Helpdesk" required />
                  </div>

                  <div className="grid gap-1">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this agent do?" />
                  </div>

                  <div className="grid gap-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="seed">Seed prompt (optional)</Label>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline theme-transition"
                        onClick={() => setSeedPrompt('')}
                      >
                        Skip this step
                      </button>
                    </div>
                    <Textarea
                      id="seed"
                      value={seedPrompt}
                      onChange={(e) => setSeedPrompt(e.target.value)}
                      placeholder="Provide initial instructions, goals, or examples to guide your agent."
                      className="min-h-32"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="text-xs text-muted-foreground">
                    You can configure tools, knowledge sources, and guardrails after creation.
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!canCreate || mutation.isPending}>
                      {mutation.isPending ? 'Creating…' : 'Create agent'}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
