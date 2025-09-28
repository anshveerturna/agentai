import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface WorkflowDTO {
  id?: string;
  name: string;
  description?: string;
  graph: any;
  nodeOverrides?: Record<string, any>;
  version?: number;
  status?: string;
}

@Injectable()
export class WorkflowsService {
  async create(data: WorkflowDTO) {
    return prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        graph: data.graph,
        nodeOverrides: data.nodeOverrides || {},
      }
    });
  }

  async findOne(id: string) {
    return prisma.workflow.findUnique({ where: { id } });
  }

  async update(id: string, data: Partial<WorkflowDTO>) {
    return prisma.workflow.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        graph: data.graph as any,
        nodeOverrides: data.nodeOverrides as any,
        version: { increment: 1 }
      }
    });
  }

  async list() {
    return prisma.workflow.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  // Versions
  async listVersions(workflowId: string) {
    const p: any = prisma as any;
    return p.workflowVersion.findMany({ where: { workflowId }, orderBy: { createdAt: 'desc' }, select: { id: true, createdAt: true, label: true } });
  }
  async createVersion(workflowId: string, label?: string) {
    const wf = await this.findOne(workflowId);
    if (!wf) return undefined;
    const p: any = prisma as any;
    const rec = await p.workflowVersion.create({ data: { workflowId, label, name: wf.name, description: wf.description || undefined, graph: (wf as any).graph } });
    return { id: rec.id };
  }
  async restoreVersion(workflowId: string, versionId: string) {
    const p: any = prisma as any;
    const v = await p.workflowVersion.findUnique({ where: { id: versionId } });
    if (!v || v.workflowId !== workflowId) return undefined;
    await prisma.workflow.update({ where: { id: workflowId }, data: { name: v.name, description: v.description || undefined, graph: v.graph } });
    return { restored: versionId };
  }

  // Run history
  async listRuns(workflowId: string) {
    const p: any = prisma as any;
    return p.workflowRun.findMany({ where: { workflowId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
  async addRun(workflowId: string, record: { status: string; input?: any; result?: any }) {
    const p: any = prisma as any;
    const rec = await p.workflowRun.create({ data: { workflowId, status: record.status, input: record.input as any, result: record.result as any } });
    return { id: rec.id };
  }

  // Workflow Templates: return a static catalog for now; can be moved to DB later
  getTemplates() {
    // icon values are keys understood by the frontend to map to lucide icons
    return [
      {
        id: 'customer-support-automation',
        name: 'Customer Support Automation',
        description: 'Automatically route and respond to customer inquiries with AI',
        category: 'Customer Service',
        complexity: 'Beginner',
        estimatedTime: '10 min',
        icon: 'MessageCircle',
        color: 'bg-blue-500',
        features: ['AI Chatbot', 'Ticket Routing', 'Auto-responses']
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
        features: ['ETL Pipeline', 'Data Validation', 'Reporting']
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
        features: ['Content Scheduling', 'Analytics', 'Multi-platform']
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
        features: ['OCR', 'AI Extraction', 'Validation']
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
        features: ['Payment Processing', 'Inventory', 'Shipping']
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
        features: ['GPT Integration', 'Auto Publishing', 'SEO Optimization']
      }
    ];
  }
}
