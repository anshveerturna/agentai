import { Body, Controller, Get, Param, Post, Put, NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import type { WorkflowDTO } from './workflows.service';

interface NodeUpsertDTO { node: any }
interface EdgeUpsertDTO { edge: any }

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  // P5: Persistence moved to Prisma (see WorkflowsService)

  @Get()
  list() { return this.workflows.list(); }

  // --- P6: Workflow Templates (static path must be above dynamic :id) ---
  @Get('templates')
  getTemplates() {
    return this.workflows.getTemplates();
  }

  @Get(':id')
  get(@Param('id') id: string) { return this.workflows.findOne(id); }

  @Post()
  create(@Body() dto: WorkflowDTO) { return this.workflows.create(dto); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<WorkflowDTO>) { return this.workflows.update(id, dto); }

  // Duplicate a workflow
  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string) {
    const dup = await this.workflows.duplicate(id);
    if (!dup) throw new NotFoundException('Workflow not found');
    return dup;
  }

  // Update only status (does not bump version unless structural fields provided)
  @Post(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    if (!body?.status) throw new BadRequestException('Missing status');
    const wf = await this.workflows.update(id, { status: body.status });
    if (!wf) throw new NotFoundException('Workflow not found');
    return { id: wf.id, status: (wf as any).status };
  }

  // Optimistic granular additions (mutate graph JSON)
  @Post(':id/nodes')
  async addNode(@Param('id') id: string, @Body() dto: NodeUpsertDTO) {
    if (!dto?.node) throw new BadRequestException('Missing node');
    const wf = await this.workflows.findOne(id);
    if (!wf) throw new NotFoundException('Workflow not found');
    const graph = (wf as any).graph || { nodes: [], edges: [], viewport: {}, meta: {} };
    graph.nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    // Assign server id if temp
    if (!dto.node.id || String(dto.node.id).startsWith('tmp_')) dto.node.id = crypto.randomUUID();
    // Basic de-dupe
    if (graph.nodes.find((n: any) => n.id === dto.node.id)) return { id: dto.node.id };
    graph.nodes.push(dto.node);
    await this.workflows.update(id, { graph });
    return { id: dto.node.id };
  }

  @Post(':id/edges')
  async addEdge(@Param('id') id: string, @Body() dto: EdgeUpsertDTO) {
    if (!dto?.edge) throw new BadRequestException('Missing edge');
    const wf = await this.workflows.findOne(id);
    if (!wf) throw new NotFoundException('Workflow not found');
    const graph = (wf as any).graph || { nodes: [], edges: [], viewport: {}, meta: {} };
    graph.edges = Array.isArray(graph.edges) ? graph.edges : [];
    // Assign server id if temp
    if (!dto.edge.id || String(dto.edge.id).startsWith('tmp_')) dto.edge.id = crypto.randomUUID();
    // Validate node existence
    const nodeIds = new Set((graph.nodes || []).map((n: any) => n.id));
    if (!nodeIds.has(dto.edge.from?.nodeId) || !nodeIds.has(dto.edge.to?.nodeId)) {
      throw new BadRequestException('Edge references missing node');
    }
    if (graph.edges.find((e: any) => e.id === dto.edge.id)) return { id: dto.edge.id };
    graph.edges.push(dto.edge);
    await this.workflows.update(id, { graph });
    return { id: dto.edge.id };
  }

  // --- P3: Validation endpoint (re-run server-side lightweight structural checks) ---
  @Post(':id/validate')
  async validate(@Param('id') id: string) {
    const wf = await this.workflows.findOne(id);
    if (!wf) throw new NotFoundException('Workflow not found');
    const graph = (wf as any).graph || { nodes: [], edges: [] };
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const issues: any[] = [];
    const triggers = nodes.filter((n: any) => n.kind === 'trigger');
    if (triggers.length === 0) issues.push({ code: 'no-trigger', message: 'No trigger node present', severity: 'error' });
    if (triggers.length > 1) issues.push({ code: 'multiple-triggers', message: 'Multiple trigger nodes present', severity: 'error' });
    const nodeIds = new Set(nodes.map((n:any)=> n.id));
    edges.forEach((e:any)=>{ if(!nodeIds.has(e.from?.nodeId)||!nodeIds.has(e.to?.nodeId)) issues.push({ code:'dangling-edge', message:`Edge ${e.id} references missing node`, severity:'error' }); });
    return { issues };
  }

  // --- P3: Versions ---
  @Get(':id/versions')
  listVersions(@Param('id') id: string) { return this.workflows.listVersions(id); }
  @Post(':id/versions')
  async createVersion(@Param('id') id: string, @Body() body: { label?: string }) {
    const wf = await this.workflows.findOne(id);
    if (!wf) throw new NotFoundException('Workflow not found');
    return this.workflows.createVersion(id, body?.label);
  }
  @Post(':id/versions/:versionId/restore')
  async restoreVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    const res = await this.workflows.restoreVersion(id, versionId);
    if (!res) throw new NotFoundException('Version not found');
    return res;
  }

  // --- Working Copy + Semantic Commit ---
  @Get(':id/working-copy')
  getWorkingCopy(@Param('id') id: string) { return this.workflows.getWorkingCopy(id); }

  @Post(':id/working-copy')
  updateWorkingCopy(@Param('id') id: string, @Body() body: { graph: any }) {
    if (!body?.graph) throw new BadRequestException('Missing graph');
    return this.workflows.updateWorkingCopy(id, body.graph);
  }

  @Post(':id/maybe-commit')
  maybeCommit(@Param('id') id: string, @Body() body?: { minIntervalSec?: number; threshold?: number }) {
    return this.workflows.maybeCommit(id, body);
  }

  @Post(':id/commit')
  commitExplicit(@Param('id') id: string, @Body() body?: { message?: string }) {
    return this.workflows.commitExplicit(id, body?.message);
  }

  // --- P3: Run History ---
  @Get(':id/run-history')
  getRunHistory(@Param('id') id: string) { return this.workflows.listRuns(id); }
  @Post(':id/run-history')
  addRunHistory(@Param('id') id: string, @Body() body: { input?: any; status: string; result?: any }) {
    if (!body?.status) throw new BadRequestException('Missing status');
    return this.workflows.addRun(id, { status: body.status, input: body.input, result: body.result });
  }

}
