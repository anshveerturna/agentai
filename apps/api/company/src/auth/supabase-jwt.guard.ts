import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
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

    // Derive the JWKS URL for Supabase/GoTrue correctly.
    // Prefer env-provided project ref if available.
    const explicitJwks = process.env.SUPABASE_JWKS_URL;
    if (explicitJwks) {
      try {
        const url = new URL(explicitJwks);
        this.logger.log(`Using explicit SUPABASE_JWKS_URL: ${url.toString()}`);
        const jwks = createRemoteJWKSet(url);
        this.jwksCache.set(iss, jwks);
        return jwks;
      } catch (e) {
        this.logger.error(`Invalid SUPABASE_JWKS_URL: ${explicitJwks}`);
      }
    }

    const projectRef = process.env.SUPABASE_PROJECT_REF;
    let jwksUrl: URL | null = null;

    if (projectRef) {
      // Hosted Supabase JWKS endpoint
      jwksUrl = new URL(`https://${projectRef}.supabase.co/auth/v1/keys`);
    } else {
      const trimmed = iss.replace(/\/$/, '');
      try {
        const u = new URL(trimmed);
        // If issuer already includes /auth/v1, use the canonical /keys endpoint
        if (u.pathname.includes('/auth/v1')) {
          u.pathname = '/auth/v1/keys';
          u.search = '';
          u.hash = '';
          jwksUrl = u;
        } else {
          // Fallback to a well-known path
          u.pathname = '/.well-known/jwks.json';
          u.search = '';
          u.hash = '';
          jwksUrl = u;
        }
      } catch {
        // As an absolute last resort, construct from the string (may still fail later)
        jwksUrl = new URL(`${trimmed}/.well-known/jwks.json`);
      }
    }

    this.logger.log(`Using JWKS URL: ${jwksUrl.toString()}`);
    const jwks = createRemoteJWKSet(jwksUrl);
    this.jwksCache.set(iss, jwks);
    return jwks;
  }

  private getAlternateJwks(iss: string) {
    // Try the alternate known endpoint if the first one fails.
    try {
      const trimmed = iss.replace(/\/$/, '');
      const u = new URL(trimmed);
      const alt = new URL(u.toString());
      if (u.pathname.includes('/auth/v1')) {
        alt.pathname = '/.well-known/jwks.json';
      } else {
        alt.pathname = '/auth/v1/keys';
      }
      alt.search = '';
      alt.hash = '';
      this.logger.log(`Trying alternate JWKS URL: ${alt.toString()}`);
      return createRemoteJWKSet(alt);
    } catch (e) {
      return null;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const authHeader = req.headers['authorization'];
    const cookieToken = (req as any).cookies?.['sb-access-token'];
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : cookieToken;

    // DEBUG: Log what we received
    this.logger.debug(
      `[AUTH] authHeader: ${authHeader ? authHeader.substring(0, 40) + '...' : 'NONE'}`,
    );
    this.logger.debug(
      `[AUTH] cookieToken: ${cookieToken ? cookieToken.substring(0, 40) + '...' : 'NONE'}`,
    );
    this.logger.debug(
      `[AUTH] final token: ${token ? token.substring(0, 40) + '...' : 'NONE'}`,
    );

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

      (req as any).user = {
        sub: payload.sub,
        email: (payload as any).email ?? null,
        ...payload,
      };
      this.logger.log(`Verified via JWKS for user: ${payload.sub}`);
      return true;
    } catch (err: any) {
      this.logger.warn(
        `JWT verify (JWKS) failed: ${err?.message || String(err)}`,
      );

      // 1b) Try alternate JWKS endpoint before giving up on RS256 verification
      try {
        const raw = ((): string | undefined => {
          try {
            return decodeJwt(token).iss;
          } catch {
            return undefined;
          }
        })();
        if (raw) {
          const alt = this.getAlternateJwks(raw);
          if (alt) {
            const { payload } = await jwtVerify(token, alt, {
              issuer: raw,
              audience: 'authenticated',
              clockTolerance: 5,
            });
            (req as any).user = {
              sub: payload.sub,
              email: (payload as any).email ?? null,
              ...payload,
            };
            this.logger.log(
              `Verified via alternate JWKS for user: ${payload.sub}`,
            );
            return true;
          }
        }
      } catch (errAlt: any) {
        this.logger.warn(
          `JWT verify (alternate JWKS) failed: ${errAlt?.message || String(errAlt)}`,
        );
      }

      // 2) Optional HS256 fallback (for self-hosted Supabase or legacy tokens) only if explicit secret provided
      const secret = process.env.SUPABASE_JWT_SECRET;
      if (secret && secret !== 'replace_me' && secret.length > 10) {
        try {
          const key = new TextEncoder().encode(secret);
          const { payload } = await jwtVerify(token, key, {
            // In HS256 fallback, skip strict audience checks to support anon/service keys in dev
            clockTolerance: 5,
          });
          (req as any).user = {
            sub: payload.sub,
            email: (payload as any).email ?? null,
            ...payload,
          };
          this.logger.log(
            `Verified via HS256 fallback for user: ${payload.sub}`,
          );
          return true;
        } catch (err2: any) {
          this.logger.error(
            `JWT verify (HS256 fallback) failed: ${err2?.message || String(err2)}`,
          );
        }
      }

      // 3) Dev-only: allow unverified tokens if explicitly enabled (do NOT use in prod)
      if (
        process.env.NODE_ENV !== 'production' &&
        process.env.AUTH_DEV_ALLOW_UNVERIFIED === 'true'
      ) {
        try {
          const decoded = decodeJwt(token);
          // Use a valid UUID for dev to satisfy Prisma's UUID column filtering
          const sub =
            (decoded.sub as string) ||
            (decoded as any).user_id ||
            '00000000-0000-0000-0000-000000000001';
          (req as any).user = {
            sub,
            email: (decoded as any).email ?? null,
            ...decoded,
          };
          this.logger.warn(
            'DEV MODE: Accepted token without signature verification. Disable AUTH_DEV_ALLOW_UNVERIFIED in production.',
          );
          return true;
        } catch (e) {
          // Not a JWT? Still allow with a dummy user in dev
          (req as any).user = {
            sub: '00000000-0000-0000-0000-000000000001',
            email: null,
          };
          this.logger.warn('DEV MODE: No JWT decode; injected dummy user.');
          return true;
        }
      }

      throw new UnauthorizedException('Invalid token');
    }
  }
}

export interface SupabaseUserPayload extends JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

export type AuthenticatedRequest = { user: SupabaseUserPayload } & Request;
