import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common'
import { AgentsService } from './agents.service'
import { SupabaseJwtGuard, AuthenticatedRequest } from '../auth/../auth/supabase-jwt.guard'

@Controller('agents')
@UseGuards(SupabaseJwtGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.agentsService.findAll(req.user.sub)
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: { name: string; description?: string; companyId: string }) {
    return this.agentsService.create({ ...body, userId: req.user.sub })
  }
}
