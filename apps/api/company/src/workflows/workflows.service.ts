import { Injectable } from '@nestjs/common';
import {
  PrismaClient,
  type Workflow as WorkflowModel,
  type WorkflowVersion as WorkflowVersionModel,
  type WorkflowRun as WorkflowRunModel,
} from '@prisma/client';
import { diffAndScore, semanticHash } from './semantic';

const prisma = new PrismaClient();

export interface WorkflowDTO {
  id?: string;
  name: string;
  description?: string | null;
  graph: unknown; // stored as Json
  nodeOverrides?: Record<string, unknown>;
  version?: number;
  status?: string;
}

@Injectable()
export class WorkflowsService {
  // --- Base CRUD ---
  async create(data: WorkflowDTO): Promise<WorkflowModel> {
    return prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        graph: data.graph as any,
        nodeOverrides: (data.nodeOverrides ?? {}) as any,
        status: data.status ?? 'draft',
        updatedAt: new Date(),
      },
    });
  }

  async findOne(id: string): Promise<WorkflowModel | null> {
    return prisma.workflow.findUnique({ where: { id } });
  }

  async update(id: string, data: Partial<WorkflowDTO>): Promise<WorkflowModel> {
    const shouldIncrement = Boolean(
      data.name || data.description || data.graph || data.nodeOverrides,
    );
    return prisma.workflow.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description ?? undefined,
        graph: (data.graph ?? undefined) as any,
        nodeOverrides: (data.nodeOverrides ?? undefined) as any,
        status: data.status,
        updatedAt: new Date(),
        ...(shouldIncrement ? { version: { increment: 1 } } : {}),
      },
    });
  }

  async list(): Promise<WorkflowModel[]> {
    return prisma.workflow.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async duplicate(id: string): Promise<WorkflowModel | undefined> {
    const src = await this.findOne(id);
    if (!src) return undefined;
    return prisma.workflow.create({
      data: {
        name: `${src.name} Copy`,
        description: src.description ?? undefined,
        graph: src.graph as any,
        nodeOverrides: src.nodeOverrides as any,
        status: src.status ?? 'draft',
        updatedAt: new Date(),
      },
    });
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    // Delete all related versions and working copies first (cascade)
    await prisma.workflowVersion.deleteMany({ where: { workflowId: id } });
    await prisma.workflowWorkingState.deleteMany({ where: { workflowId: id } });
    await prisma.workflowRun.deleteMany({ where: { workflowId: id } });
    await prisma.workflow.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Versions (legacy-style snapshot APIs; kept for compatibility) ---
  async listVersions(
    workflowId: string,
  ): Promise<Array<Pick<WorkflowVersionModel, 'id' | 'createdAt' | 'label'>>> {
    // Return explicit commits (exclude autosave and restore entries)
    // @ts-ignore - name and description fields available post-migration
    return (prisma as any).workflowVersion.findMany({
      where: {
        workflowId,
        // Exclude autosave and restore entries
        NOT: [
          { label: { contains: 'autosave', mode: 'insensitive' } },
          { label: { contains: 'auto-save', mode: 'insensitive' } },
          { label: { startsWith: 'Revert', mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        label: true,
        name: true,
        description: true,
        versionNumber: true,
        semanticHash: true,
      },
    });
  }
  async createVersion(
    workflowId: string,
    label?: string,
  ): Promise<{ id: string } | undefined> {
    const wf = await this.findOne(workflowId);
    if (!wf) return undefined;
    // Compute semantic versionNumber and metadata
    // Cast prisma to any for fields added by pending migration
    // @ts-ignore - versionNumber ordering requires regenerated prisma types
    const last = await (prisma as any).workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { versionNumber: 'desc' },
    });
    // @ts-ignore - versionNumber added by migration
    const versionNumber = ((last?.versionNumber as number) ?? 0) + 1;
    const hash = semanticHash(wf.graph);
    // @ts-ignore - extra fields supported after migration
    const rec = await (prisma as any).workflowVersion.create({
      data: {
        workflowId,
        label,
        name: wf.name,
        description: wf.description ?? undefined,
        graph: wf.graph as any,
        versionNumber,
        semanticHash: hash,
        diffSummary: label || undefined,
        // @ts-ignore - defaultBranch exists after migration
        branch:
          (
            (await prisma.workflow.findUnique({
              where: { id: workflowId },
              select: { defaultBranch: true },
            })) as any
          )?.defaultBranch || 'main',
      },
    });
    return { id: rec.id };
  }
  // Non-destructive revert: creates a new version whose graph equals selected version
  async restoreVersion(
    workflowId: string,
    versionId: string,
  ): Promise<{ restored: string } | undefined> {
    const v = await prisma.workflowVersion.findUnique({
      where: { id: versionId },
    });
    if (!v || v.workflowId !== workflowId) return undefined;
    const wf = await this.findOne(workflowId);
    if (!wf) return undefined;
    // Create a new version identical to 'v'
    // @ts-ignore - order by versionNumber available post-migration
    const last = await (prisma as any).workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { versionNumber: 'desc' },
    });
    // @ts-ignore - field exists post-migration
    const versionNumber = ((last?.versionNumber as number) ?? 0) + 1;
    // @ts-ignore - extra fields available post-migration
    const rec = await (prisma as any).workflowVersion.create({
      data: {
        workflowId,
        // @ts-ignore
        label: `Revert to ${(v as any).versionNumber}`,
        name: v.name,
        description: v.description ?? undefined,
        graph: v.graph as any,
        versionNumber,
        // @ts-ignore
        semanticHash: (v as any).semanticHash,
        // @ts-ignore
        diffSummary: `Reverted to v${(v as any).versionNumber}`,
        // @ts-ignore
        branch: (v as any).branch,
      },
    });
    // Update active pointer and current workflow graph to match reverted spec
    // @ts-ignore - activeVersionId exists post-migration
    await (prisma as any).workflow.update({
      where: { id: workflowId },
      data: { graph: v.graph as any, activeVersionId: rec.id },
    });
    return { restored: rec.id };
  }

  async deleteVersion(
    workflowId: string,
    versionId: string,
  ): Promise<{ deleted: boolean } | undefined> {
    const v = await prisma.workflowVersion.findUnique({
      where: { id: versionId },
    });
    if (!v || v.workflowId !== workflowId) return undefined;
    const wf = await this.findOne(workflowId);
    if (!wf) return undefined;
    // If this version is active, clear the pointer first
    if ((wf as any).activeVersionId === versionId) {
      // @ts-ignore - activeVersionId exists post-migration
      await (prisma as any).workflow.update({
        where: { id: workflowId },
        data: { activeVersionId: null },
      });
    }
    await prisma.workflowVersion.delete({ where: { id: versionId } });
    return { deleted: true };
  }

  // Run history
  async listRuns(workflowId: string): Promise<WorkflowRunModel[]> {
    return prisma.workflowRun.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
  async addRun(
    workflowId: string,
    record: { status: string; input?: unknown; result?: unknown },
  ): Promise<{ id: string }> {
    const rec = await prisma.workflowRun.create({
      data: {
        workflowId,
        status: record.status,
        input: record.input as any,
        result: record.result as any,
      },
    });
    return { id: rec.id };
  }

  // Workflow Templates: return a static catalog for now; can be moved to DB later
  getTemplates() {
    // icon values are keys understood by the frontend to map to lucide icons
    return [
      {
        id: 'customer-support-automation',
        name: 'Customer Support Automation',
        description:
          'Automatically route and respond to customer inquiries with AI',
        category: 'Customer Service',
        complexity: 'Beginner',
        estimatedTime: '10 min',
        icon: 'MessageCircle',
        color: 'bg-blue-500',
        features: ['AI Chatbot', 'Ticket Routing', 'Auto-responses'],
      },
      {
        id: 'data-pipeline-analytics',
        name: 'Data Pipeline & Analytics',
        description: 'Extract, transform, and load data from multiple sources',
        category: 'Data Processing',
        complexity: 'Advanced',
        estimatedTime: '30 min',
        icon: 'Database',
        color: 'bg-green-500',
        features: ['ETL Pipeline', 'Data Validation', 'Reporting'],
      },
      {
        id: 'social-media-automation',
        name: 'Social Media Automation',
        description: 'Schedule posts and monitor engagement across platforms',
        category: 'Marketing',
        complexity: 'Intermediate',
        estimatedTime: '20 min',
        icon: 'Globe',
        color: 'bg-purple-500',
        features: ['Content Scheduling', 'Analytics', 'Multi-platform'],
      },
      {
        id: 'document-processing',
        name: 'Document Processing',
        description: 'Extract and process information from documents using AI',
        category: 'Document Management',
        complexity: 'Intermediate',
        estimatedTime: '15 min',
        icon: 'FileText',
        color: 'bg-orange-500',
        features: ['OCR', 'AI Extraction', 'Validation'],
      },
      {
        id: 'ecommerce-order-flow',
        name: 'E-commerce Order Flow',
        description: 'Complete order processing from payment to fulfillment',
        category: 'E-commerce',
        complexity: 'Advanced',
        estimatedTime: '45 min',
        icon: 'Zap',
        color: 'bg-indigo-500',
        features: ['Payment Processing', 'Inventory', 'Shipping'],
      },
      {
        id: 'ai-content-generator',
        name: 'AI Content Generator',
        description: 'Generate and publish content using advanced AI models',
        category: 'Content Creation',
        complexity: 'Beginner',
        estimatedTime: '5 min',
        icon: 'Sparkles',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500',
        features: ['GPT Integration', 'Auto Publishing', 'SEO Optimization'],
      },
    ];
  }

  // --- Working Copy + Semantic Commit APIs ---
  async getWorkingCopy(
    workflowId: string,
  ): Promise<{ graph: any } | undefined> {
    // @ts-ignore - model exists post-migration
    const ws = await (prisma as any).workflowWorkingState.findUnique({
      where: { workflowId },
    });
    if (ws) return { graph: ws.graph };
    const wf = await this.findOne(workflowId);
    if (!wf) return undefined;
    // Initialize from current workflow.graph
    // @ts-ignore - model exists post-migration
    const created = await (prisma as any).workflowWorkingState.create({
      data: { workflowId, graph: wf.graph as any, updatedAt: new Date() },
    });
    return { graph: created.graph };
  }

  async updateWorkingCopy(
    workflowId: string,
    graph: any,
  ): Promise<{ semanticHash: string }> {
    const hash = semanticHash(graph);
    // @ts-ignore - model exists post-migration
    await (prisma as any).workflowWorkingState.upsert({
      where: { workflowId },
      update: { graph: graph, updatedAt: new Date() },
      create: { workflowId, graph: graph, updatedAt: new Date() },
    });
    return { semanticHash: hash };
  }

  async maybeCommit(
    workflowId: string,
    opts?: { minIntervalSec?: number; threshold?: number },
  ): Promise<{ committed: boolean; versionId?: string; summary?: string }> {
    // Feature flag: disable backend auto-commits unless explicitly enabled
    if (process.env.WORKFLOW_AUTOCOMMIT_ENABLED !== 'true') {
      return { committed: false };
    }
    const { minIntervalSec = 120, threshold = 5 } = opts || {};
    const wf = await this.findOne(workflowId);
    if (!wf) return { committed: false };
    // @ts-ignore - model exists post-migration
    const ws = await (prisma as any).workflowWorkingState.findUnique({
      where: { workflowId },
    });
    if (!ws) return { committed: false };
    // @ts-ignore - order by versionNumber available post-migration
    const head = await (prisma as any).workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { versionNumber: 'desc' },
    });
    const headGraph = head?.graph ?? wf.graph;
    const { score, summary } = diffAndScore(headGraph, ws.graph);
    if (score < threshold) return { committed: false };
    // time gate
    if (head?.createdAt) {
      const elapsed = (Date.now() - new Date(head.createdAt).getTime()) / 1000;
      if (elapsed < minIntervalSec) return { committed: false };
    }
    const newHash = semanticHash(ws.graph);
    // @ts-ignore - semanticHash exists post-migration
    if (newHash === head?.semanticHash) return { committed: false };
    // @ts-ignore - versionNumber exists post-migration
    const versionNumber = ((head?.versionNumber as number) ?? 0) + 1;
    // @ts-ignore - extra fields available post-migration
    const rec = await (prisma as any).workflowVersion.create({
      data: {
        workflowId,
        label: undefined,
        name: wf.name,
        description: wf.description ?? undefined,
        graph: ws.graph,
        versionNumber,
        semanticHash: newHash,
        diffSummary: summary,
        // @ts-ignore - defaultBranch exists post-migration
        branch: (wf as any).defaultBranch ?? 'main',
      },
    });
    // Do not auto-promote active by default; keep policy flexible. For now, set active to latest.
    // @ts-ignore - activeVersionId exists post-migration
    await (prisma as any).workflow.update({
      where: { id: workflowId },
      data: { activeVersionId: rec.id, graph: ws.graph, updatedAt: new Date() },
    });
    return { committed: true, versionId: rec.id, summary };
  }

  async commitExplicit(
    workflowId: string,
    name?: string,
    description?: string,
  ): Promise<{ id: string }> {
    const wf = await this.findOne(workflowId);
    if (!wf) throw new Error('workflow not found');
    // @ts-ignore - model exists post-migration
    const ws = await (prisma as any).workflowWorkingState.findUnique({
      where: { workflowId },
    });
    const graph = ws?.graph ?? wf.graph;
    // @ts-ignore - order by versionNumber available post-migration
    const head = await (prisma as any).workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { versionNumber: 'desc' },
    });
    // @ts-ignore - versionNumber exists post-migration
    const versionNumber = ((head?.versionNumber as number) ?? 0) + 1;
    const hash = semanticHash(graph);
    // @ts-ignore - extra fields available post-migration
    const rec = await (prisma as any).workflowVersion.create({
      data: {
        workflowId,
        label: name,
        name: name ?? wf.name,
        description: description ?? wf.description ?? undefined,
        graph,
        versionNumber,
        semanticHash: hash,
        diffSummary: description,
        // @ts-ignore
        branch: (wf as any).defaultBranch ?? 'main',
      },
    });
    // @ts-ignore - activeVersionId exists post-migration
    await (prisma as any).workflow.update({
      where: { id: workflowId },
      data: { activeVersionId: rec.id, graph, updatedAt: new Date() },
    });
    return { id: rec.id };
  }
}
