# AgentAI Platform Roadmap

This document outlines the current capabilities and the features we plan to add across the platform. It will be kept up-to-date as we implement changes.

## Editor & Workflow Builder

- Visual canvas powered by @xyflow/react with:
  - Drag-to-connect, arrowheads, and smooth edges
  - Selection and deletion of nodes/edges
  - Split/branch tool support with labeled branches (true/false/cases)
  - Keyboard shortcuts: Create (C), Split/Condition (T), Escape to cancel
- Code editor (Monaco) with YAML representation of the workflow:
  - CSP/SSR-safe loading, local ESM bundles
  - Two-way sync: visual ↔ YAML
  - Scroll-aware parsing (pause while scrolling) and rAF-throttled cursor updates
  - Diagnostics: YAML syntax and JSON Schema validation (Ajv) with red/yellow squiggles and hover tooltips
- Planned:
  - Problems panel UI with filter and click-to-jump
  - Schema-aware autocompletion and hover docs
  - Monaco YAML worker integration for richer language features
  - Snap-to-grid and auto-layout tools

## Workflow Model & Persistence

- ExecutionSpec contract with nodes, flow edges (control/data/error), optional branches and schema types
- Serializer/hydrator with validation
- Planned:
  - Stronger typing for node configs and data schemas
  - Versioned schema evolution and migration scripts
  - Graph-level invariants and lints (e.g., unreachable nodes)

## Autosave & Versioning

- Autosave gated by validateExecutionSpec to prevent invalid snapshots
- Version restore via backend API
- Planned:
  - Snapshot diffs and visual compare
  - Named versions and tags

## Backend (API / NestJS)

- NestJS service with workflows CRUD and versions
- Prisma for persistence; Supabase auth integration
- CORS/Helmet configured; dev port probing with fallback
- Planned:
  - WebSocket or SSE for live updates across sessions
  - Background execution orchestration and logs
  - Fine-grained RBAC and audit trails

## Auth & Security

- Supabase JWT guard for protected routes
- CSP-compliant frontend bundles
- Planned:
  - Organization/team roles, SSO (SAML/OIDC)
  - Secret management via environment/Vault integration
  - Security matrix enforcement and checks

## Testing & Quality

- Playwright e2e for web app smoke paths
- Jest e2e for API
- Planned:
  - Unit tests for serializer/validator and editor behaviors
  - Contract tests between frontend and backend

## Developer Experience

- Turborepo workspace with Next.js app and NestJS API
- Local dev scripts and port probing to reduce collisions
- Planned:
  - Unified dev runner to start API on an available port and auto-configure proxy
  - Pre-commit checks and CI with build, lint, tests
  - Storybook or isolated component playground

## Deployment

- Planned:
  - Containerization, environment configuration, and blue/green deployments
  - Cloud database migrations and backups
  - Observability: tracing, metrics, and centralized logs
