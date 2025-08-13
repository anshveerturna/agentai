import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

@Injectable()
export class AgentsService {
  async findAll() {
    return prisma.agent.findMany()
  }

  async create(data: { name: string; description?: string; companyId: string }) {
    return prisma.agent.create({ data })
  }
}
