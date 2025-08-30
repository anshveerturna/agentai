"use client";

import { useFlowStore } from '@/store/flowStore';

const tools: Array<{ key: NonNullable<import('@/types/flow').FlowState['activeTool']>; label: string; icon?: string }>[] = [
  [
    { key: 'cursor', label: 'Cursor', icon: '🖱️' },
    { key: 'hand', label: 'Hand', icon: '🖐️' },
    { key: 'connector', label: 'Connector', icon: '🪢' },
  ],
  [
    { key: 'default', label: 'Step', icon: '▭' },
    { key: 'split', label: 'Split', icon: '⫷' },
    { key: 'text', label: 'Text', icon: 'T' },
    { key: 'group', label: 'Group', icon: '□+' },
    { key: 'table', label: 'Table', icon: '▦' },
    { key: 'interface', label: 'Interface', icon: '🧩' },
    { key: 'chatbot', label: 'Chatbot', icon: '💬' },
    { key: 'agent', label: 'Agent', icon: '🤖' },
    { key: 'codie', label: 'Codie', icon: '✨' },
  ]
];

export function BottomToolbar() {
  const activeTool = useFlowStore(s => s.activeTool) || 'cursor';
  const setActiveTool = useFlowStore(s => s.setActiveTool);

  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-lg px-3 py-2">
      <div className="flex items-stretch gap-3">
        {tools.map((group, i) => (
          <div key={i} className="flex items-center gap-1">
            {group.map(t => (
              <button
                key={t.key}
                className={`px-2.5 py-1.5 rounded-md border text-sm ${activeTool === t.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}
                onClick={() => setActiveTool(t.key)}
                draggable={['default','split','text','group','table','interface','chatbot','agent','codie'].includes(t.key)}
                onDragStart={(e) => {
                  if (!['default','split','text','group','table','interface','chatbot','agent','codie'].includes(t.key)) return;
                  const payload = { type: 'node-template', nodeTemplate: { kind: t.key === 'default' ? 'action' : t.key, label: t.label, size: { width: 200, height: 100 } } };
                  e.dataTransfer?.setData('application/json', JSON.stringify(payload));
                  e.dataTransfer!.effectAllowed = 'copy';
                }}
                title={t.label}
              >
                <span className="mr-1" aria-hidden>{t.icon}</span>
                <span className="hidden md:inline">{t.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
