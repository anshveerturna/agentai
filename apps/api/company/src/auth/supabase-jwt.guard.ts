import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { jwtVerify, createRemoteJWKSet, decodeJwt, JWTPayload } from 'jose';

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseJwtGuard.name);
  private jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

  private getJwks(iss: string) {
    if (this.jwksCache.has(iss)) {
      return this.jwksCache.get(iss)!;
    }
    
    // Use project ref from env if available, otherwise extract from issuer
    const projectRef = process.env.SUPABASE_PROJECT_REF;
    let jwksUrl: URL;
    
    if (projectRef) {
      jwksUrl = new URL(`https://${projectRef}.supabase.co/auth/v1/jwks`);
    } else {
      jwksUrl = new URL(`${iss.replace(/\/$/, '')}/jwks`);
    }
    
    this.logger.log(`Using JWKS URL: ${jwksUrl.toString()}`);
    const jwks = createRemoteJWKSet(jwksUrl);
    this.jwksCache.set(iss, jwks);
    return jwks;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const authHeader = req.headers['authorization'];
    const cookieToken = (req as any).cookies?.['sb-access-token'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : cookieToken;

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      // 1) Verify via JWKS from the token's issuer (works for hosted Supabase RS256)
      const decoded = decodeJwt(token);
      const iss = typeof decoded.iss === 'string' ? decoded.iss : undefined;
      if (!iss) {
        this.logger.error('Token is missing "iss" claim');
        throw new UnauthorizedException('Invalid token: missing issuer');
      }

      const JWKS = this.getJwks(iss);

      const { payload } = await jwtVerify(token, JWKS, {
        issuer: iss,
        audience: 'authenticated',
        clockTolerance: 5, // 5 seconds
      });

      (req as any).user = { sub: payload.sub, email: (payload as any).email ?? null, ...payload };
      this.logger.log(`Verified via JWKS for user: ${payload.sub}`);
      return true;
    } catch (err: any) {
      this.logger.warn(`JWT verify (JWKS) failed: ${err?.message || String(err)}`);

      // 2) Optional HS256 fallback (for self-hosted Supabase or legacy tokens)
      const secret = process.env.SUPABASE_JWT_SECRET;
      if (secret && secret !== 'replace_me' && secret.length > 10) {
        try {
          const key = new TextEncoder().encode(secret);
          const { payload } = await jwtVerify(token, key, {
            audience: 'authenticated',
            clockTolerance: 5,
          });
          (req as any).user = { sub: payload.sub, email: (payload as any).email ?? null, ...payload };
          this.logger.log(`Verified via HS256 fallback for user: ${payload.sub}`);
          return true;
        } catch (err2: any) {
          this.logger.error(`JWT verify (HS256 fallback) failed: ${err2?.message || String(err2)}`);
        }
      } else {
        // For hosted Supabase, use the anon key as HS256 secret for JWT verification
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (anonKey) {
          try {
            const key = new TextEncoder().encode(anonKey);
            const { payload } = await jwtVerify(token, key, {
              audience: 'authenticated',
              clockTolerance: 5,
            });
            (req as any).user = { sub: payload.sub, email: (payload as any).email ?? null, ...payload };
            this.logger.log(`Verified via anon key HS256 for user: ${payload.sub}`);
            return true;
          } catch (err3: any) {
            this.logger.error(`JWT verify (anon key HS256) failed: ${err3?.message || String(err3)}`);
          }
        }
      }

      throw new UnauthorizedException('Invalid token');
    }
  }
}

export interface SupabaseUserPayload extends JWTPayload {
  sub: string
  email?: string
  role?: string
  [key: string]: any
}

export type AuthenticatedRequest = { user: SupabaseUserPayload } & Request;
