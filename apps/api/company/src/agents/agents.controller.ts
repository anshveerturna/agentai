import { Controller, Get, Post, Body } from '@nestjs/common'
import { AgentsService } from './agents.service'

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  findAll() {
    return this.agentsService.findAll()
  }

  @Post()
  create(@Body() body: { name: string; description?: string; companyId: string }) {
    return this.agentsService.create(body)
  }
}
