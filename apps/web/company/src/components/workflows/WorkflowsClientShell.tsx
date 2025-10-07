"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, Grid3X3, List } from 'lucide-react';
import WorkflowListClient from '@/components/workflows/WorkflowListClient';
import dynamic from 'next/dynamic';
import { WorkflowTemplates } from '@/components/workflows/WorkflowTemplates';

// Client-only heavy canvas (avoids SSR). Using dynamic without ssr inside a client component is fine.
const WorkflowCanvas = dynamic(() => import('@/components/workflows/WorkflowCanvas').then(m => m.WorkflowCanvas), { ssr: false });

interface WorkflowsClientShellProps { initialWorkflows: any[] }

export default function WorkflowsClientShell({ initialWorkflows }: WorkflowsClientShellProps) {
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCodeView, setIsCodeView] = useState(false);

  const handleCreateWorkflow = () => setView('editor');
  const handleBackToDashboard = () => setView('dashboard');

  if (view === 'editor') {
    return (
      <div className="h-screen w-full bg-background overflow-hidden">
        <WorkflowCanvas
          onBack={handleBackToDashboard}
          isCodeView={isCodeView}
          onToggleCodeView={() => setIsCodeView(v => !v)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Workflows</h1>
              <p className="text-muted-foreground mt-1">Create, manage, and deploy automated workflows with visual design and code flexibility</p>
            </div>
            <Button
              onClick={handleCreateWorkflow}
              size="lg"
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Workflow
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Quick Actions & Search */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>

          {/* Filter & View Controls */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none border-l"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Templates Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Quick Start Templates</h2>
            <Button variant="ghost" size="sm">View All Templates</Button>
          </div>
          <WorkflowTemplates onSelectTemplate={handleCreateWorkflow} />
        </div>

        {/* Workflows List */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Your Workflows</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Auto-sync enabled
            </div>
          </div>
          <WorkflowListClient
            initialWorkflows={initialWorkflows as any}
            searchQuery={searchQuery}
            viewMode={viewMode}
            onEditWorkflow={() => handleCreateWorkflow()}
          />
        </div>
      </div>
    </div>
  );
}
