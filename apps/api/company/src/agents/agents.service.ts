import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

@Injectable()
export class AgentsService {
  async findAll(userId: string) {
  // NOTE: After adding userId to schema, run `npx prisma generate` so that AgentWhereInput includes userId
    return prisma.agent.findMany({ where: { userId } })
  }

  async create(data: { name: string; description?: string; companyId: string; userId: string }) {
    return prisma.agent.create({ data })
  }
}
