import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

@Injectable()
export class AgentsService {
  async findAll(userId: string, companyId?: string) {
    // Phase 1: company isolation + templates.
    // Back-compat: if companyId is missing, return user-owned + global demo (zero UUID) + templates.
    const GLOBAL_USER_ID = '00000000-0000-0000-0000-000000000000'
    const where = companyId
      ? { OR: [{ userId, companyId }, { isTemplate: true }] }
      : { OR: [{ userId }, { userId: GLOBAL_USER_ID }, { isTemplate: true }] }
    return prisma.agent.findMany({ where, orderBy: { createdAt: 'desc' } })
  }

  async create(data: { name: string; description?: string; companyId: string; userId: string; isTemplate?: boolean; isPublished?: boolean }) {
    return prisma.agent.create({ data })
  }
}
