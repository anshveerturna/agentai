import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class AgentsService {
  async findAll(userId: string, companyId?: string) {
    // Phase 1: company isolation + templates.
    // Back-compat: if companyId is missing, return user-owned + global demo (zero UUID) + templates.
    const GLOBAL_USER_ID = '00000000-0000-0000-0000-000000000000';
    const where = companyId
      ? { OR: [{ userId, companyId }, { isTemplate: true }] }
      : { OR: [{ userId }, { userId: GLOBAL_USER_ID }, { isTemplate: true }] };

    try {
      const list = await prisma.agent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      if (
        list.length === 0 &&
        process.env.NODE_ENV !== 'production' &&
        process.env.DEV_FAKE_DATA === 'true'
      ) {
        // Dev-only seedless fallback so the UI isn't empty
        return [
          {
            id: 'tmpl-1',
            userId: GLOBAL_USER_ID,
            companyId: null,
            name: 'Welcome Agent',
            description: 'Sample template agent',
            isTemplate: true,
            isPublished: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
        ];
      }
      return list;
    } catch (e) {
      if (
        process.env.NODE_ENV !== 'production' &&
        process.env.DEV_FAKE_DATA === 'true'
      ) {
        return [
          {
            id: 'dev-1',
            userId,
            companyId: companyId ?? null,
            name: 'Dev Agent',
            description: 'Returned without DB',
            isTemplate: false,
            isPublished: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
        ];
      }
      throw e;
    }
  }

  async create(data: {
    name: string;
    description?: string;
    companyId: string;
    userId: string;
    isTemplate?: boolean;
    isPublished?: boolean;
  }) {
    return prisma.agent.create({ data });
  }
}
