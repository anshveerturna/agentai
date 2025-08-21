import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose'

// Environment variables expected:
// SUPABASE_JWT_AUDIENCE (usually 'authenticated')
// NEXT_PUBLIC_SUPABASE_URL (used to derive JWKS URL)

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (!jwks) {
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!projectUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for Supabase JWKS')
    const jwksUrl = new URL('/auth/v1/keys', projectUrl).toString()
    jwks = createRemoteJWKSet(new URL(jwksUrl))
  }
  return jwks
}

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: any = context.switchToHttp().getRequest()
    const authHeader = req.headers['authorization'] || req.headers['Authorization']
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token')
    }
    const token = authHeader.slice('Bearer '.length).trim()
    try {
      const audience = process.env.SUPABASE_JWT_AUDIENCE || 'authenticated'
      const { payload } = await jwtVerify(token, getJwks(), { audience })
      req.user = mapPayload(payload)
      return true
    } catch (e: any) {
      throw new UnauthorizedException('Invalid token')
    }
  }
}

interface SupabaseUserPayload {
  sub: string
  email?: string
  role?: string
  [key: string]: any
}

function mapPayload(p: JWTPayload): SupabaseUserPayload {
  return {
    sub: p.sub as string,
    email: p.email as string | undefined,
    role: (p as any).role,
    ...p
  }
}

export type AuthenticatedRequest = { user: SupabaseUserPayload } & Request
