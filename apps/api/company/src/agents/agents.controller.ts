import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common'
import { AgentsService } from './agents.service'
import { SupabaseJwtGuard, AuthenticatedRequest } from '../auth/../auth/supabase-jwt.guard'

@Controller('agents')
@UseGuards(SupabaseJwtGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    // Phase 1: detect companyId from header or claim (fallback). Replace with proper tenancy mapping later.
    const companyId = (req as any).headers['x-company-id'] as string | undefined || (req.user as any).companyId
    return this.agentsService.findAll(req.user.sub, companyId)
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: { name: string; description?: string; companyId: string }) {
    return this.agentsService.create({ ...body, userId: req.user.sub })
  }
}
