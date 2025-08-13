'use client';

import { useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import AgentList from '../../components/AgentList';
import AgentTable from '../../components/AgentTable';
import ExploreAgents from '../../components/ExploreAgents';
import LearningResources from '../../components/LearningResources';
import { CreateAgentDialog } from '../../components/CreateAgentDialog';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Filter, SortAsc, Search, Sparkles, ShieldCheck } from 'lucide-react';

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'templates' | 'mine'>('all');
  const [view, setView] = useState<'grid' | 'table'>('table');

  return (
    <DashboardLayout>
      <div className="min-h-screen overflow-x-hidden">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>Workspace</span>
                <span>/</span>
                <span className="text-slate-700 dark:text-slate-200">Agents</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Agents
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  Preview
                </span>
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                Build, manage, and scale enterprise-grade AI agents. Keep your design language consistent while iterating fast.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <ShieldCheck className="w-4 h-4" /> Governance
              </Button>
              <CreateAgentDialog />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 md:p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Tabs */}
            <div className="flex items-center rounded-md bg-slate-100 dark:bg-slate-800 p-1 w-fit">
              {([
                { key: 'all', label: 'All' },
                { key: 'templates', label: 'Templates' },
                { key: 'mine', label: 'My agents' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    activeTab === key
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agents by name or description"
                className="pl-9"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" /> Filters
              </Button>
              <Button variant="outline" className="gap-2">
                <SortAsc className="w-4 h-4" /> Sort
              </Button>
              <div className="md:hidden">
                <CreateAgentDialog />
              </div>
            </div>
          </div>
        </div>

        {/* Content: minimal single-column layout */}
        <div className="space-y-6">
          {/* All agents */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">All agents</h2>
              <div className="flex items-center gap-3">
                <div className="hidden text-xs text-slate-500 dark:text-slate-400 md:block">Auto-refresh enabled</div>
                <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <button
                    className={`px-3 py-1.5 text-sm ${view === 'grid' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
                    onClick={() => setView('grid')}
                    aria-pressed={view === 'grid'}
                  >
                    Grid
                  </button>
                  <button
                    className={`px-3 py-1.5 text-sm border-l border-slate-200 dark:border-slate-800 ${view === 'table' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
                    onClick={() => setView('table')}
                    aria-pressed={view === 'table'}
                  >
                    Table
                  </button>
                </div>
              </div>
            </div>
            {view === 'grid' ? (
              <AgentList search={search} />
            ) : (
              <AgentTable search={search} />
            )}
          </div>

          {/* Agent Template (landscape) */}
          <ExploreAgents
            onSelectTemplate={() => { /* seed create dialog in future */ }}
            title="Agent Template"
            variant="landscape"
          />

          {/* Learning resources (landscape) */}
          <LearningResources variant="landscape" />
        </div>
      </div>
    </DashboardLayout>
  );
}
