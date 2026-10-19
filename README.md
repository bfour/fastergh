# FasterGH

A fast GitHub mirror UI backed by Convex as a real-time cache/sync layer. GitHub is the source of truth; Convex is the low-latency read model.

## What It Does

- Streams GitHub webhook events into Convex for real-time updates
- Backfills historical data from GitHub REST API on repo onboarding
- Maintains normalized domain tables and denormalized projection views for fast reads
- Provides a read-optimized UI that never hits the GitHub API on page load
- Supports write operations (create issues, comments, merge PRs) via optimistic mutations backed by GitHub API

## Architecture

```
GitHub Webhooks/API  ->  Convex Ingestion  ->  Normalized Tables  ->  Projection Views  ->  Next.js UI
```

### Sync Modes

1. **Bootstrap Backfill** - Initial hydration when a repo is connected
2. **Realtime Webhooks** - Ongoing incremental updates via repo-level webhooks
3. **Periodic Reconciliation** - Drift and gap repair on a schedule
4. **Async Processing** - Queued webhook processing with retry/backoff and dead-letter handling

### Data Pipeline

- **Raw ingestion layer** - Webhook events stored verbatim for audit and replay
- **Normalized domain tables** - Canonical entities (repos, PRs, issues, users, branches, commits, check runs, reviews, comments, PR files)
- **Projection views** - Pre-computed read views for UI (repo overview, PR list, issue list, activity feed)

## Tech Stack

- **[Effect](https://effect.website)** - Type-safe functional programming with services, tagged errors, and structured concurrency
- **[Convex](https://convex.dev)** - Real-time backend with automatic reactivity
- **[Confect](packages/confect/)** - Effect + Convex integration (first-party package in this monorepo)
- **[Next.js](https://nextjs.org)** - React framework with App Router
- **[nuqs](https://nuqs.47ng.com)** - Type-safe URL query state management
- **[Tailwind CSS](https://tailwindcss.com)** + **[Radix UI](https://radix-ui.com)** - Styling and UI primitives
- **[Turbo](https://turbo.build)** - Monorepo build system
- **[Biome](https://biomejs.dev)** - Linter and formatter

## Project Structure

```
apps/
  main-site/              # Next.js frontend
packages/
  confect/                # Effect + Convex typed RPC layer
  convex-test/            # Convex testing utilities
  database/               # Convex backend (schema, RPC modules, sync pipeline)
    convex/
      rpc/                # RPC endpoint modules
        projectionQueries.ts   # Read queries (list repos, PRs, issues, activity)
        webhookProcessor.ts    # Webhook event dispatch + retry pipeline
        githubWrite.ts         # Write operations (create issue/comment, merge PR)
        githubActions.ts       # GitHub API actions (PR file sync, etc.)
        admin.ts               # Operational queries (health, status, table counts)
      shared/
        projections.ts         # Projection rebuild logic
        githubApi.ts           # GitHub API client (Effect service)
      schema.ts                # Full Convex schema (18 tables)
      http.ts                  # Webhook HTTP endpoint
      crons.ts                 # Scheduled jobs (process pending, promote retries, repair)
  observability/           # OpenTelemetry integration for Effect
  ui/                      # Shared React components (shadcn/ui based)
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 22 and [pnpm](https://pnpm.io) 10 (`corepack enable`)
- A [Convex](https://convex.dev) account
- A GitHub account or organization where you can create a GitHub App

### Telemetry

Turborepo and Next.js collect anonymous usage telemetry by default. CI turns it off; to turn it off on your machine, add this to your shell profile:

```bash
export DO_NOT_TRACK=1
export TURBO_TELEMETRY_DISABLED=1
export NEXT_TELEMETRY_DISABLED=1
```

### Setup

1. Install dependencies and create your env file:

```bash
pnpm install
cp .env.example .env
```

2. Create a Convex deployment. This logs you in, creates the project and writes `CONVEX_DEPLOYMENT` to `packages/database/.env.local`; stop it with Ctrl+C once it's running:

```bash
cd packages/database && pnpm exec convex dev
```

Copy `CONVEX_DEPLOYMENT` and the deployment's `.convex.cloud` / `.convex.site` URLs into `CONVEX_DEPLOYMENT`, `CONVEX_URL`, `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_SITE_URL` in the root `.env`.

3. Create your own GitHub App at **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App** (under the organization's settings for an org). One app handles both "Sign in with GitHub" and repository access:

| Field | Value |
| --- | --- |
| Homepage URL | `http://localhost:4007` (your `SITE_URL`) |
| Callback URL | `http://localhost:4007/api/auth/callback/github` |
| Setup URL | `http://localhost:4007/github/setup` (tick "Redirect on update") |
| Webhook URL | `https://<your-deployment>.convex.site/api/github/webhook` |
| Webhook secret | output of `openssl rand -hex 32` |
| Repository permissions | Read & write: Actions, Contents, Issues, Pull requests. Read-only: Checks, Metadata |
| Subscribe to events | Check run, Create, Delete, Issue comment, Issues, Pull request, Pull request review, Push, Workflow job, Workflow run |

Webhooks go to your Convex deployment, not to localhost, so this works during local development. After creating the app, note its slug (the last part of its URL), generate a client secret and a private key.

4. Fill in the root `.env`: `GITHUB_APP_SLUG`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`, and `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). If `GITHUB_APP_SLUG` is unset, the install button points at the public `fastergh` app, whose webhooks don't reach your deployment.

5. Set the backend's environment variables in Convex:

```bash
cd packages/database
pnpm exec convex env set SITE_URL "http://localhost:4007"
pnpm exec convex env set CONVEX_SITE_URL "https://<your-deployment>.convex.site"
pnpm exec convex env set GITHUB_CLIENT_ID "<client id>"
pnpm exec convex env set GITHUB_CLIENT_SECRET "<client secret>"
pnpm exec convex env set GITHUB_WEBHOOK_SECRET "<webhook secret>"
pnpm exec convex env set GITHUB_APP_PRIVATE_KEY "$(cat path/to/private-key.pem)"
```

6. Check the configuration, then start the app:

```bash
pnpm check:github
pnpm dev
```

### Connect a Repository

Open http://localhost:4007, sign in with GitHub and click **Install GitHub App** in the sidebar. On GitHub, choose the account and the repositories FasterGH may access. GitHub sends an installation webhook to your Convex deployment, which adds the repositories and starts their initial sync; you're redirected back to the app while that runs in the background.

To add or remove repositories later, change the app's repository access on GitHub (**Settings → Applications → Installed GitHub Apps → Configure**). FasterGH picks up the change from the `installation_repositories` webhook.

For production hosting (Vercel, a public `SITE_URL`, deploying Convex), see [`guides/hosting-setup.md`](guides/hosting-setup.md).

## Testing

Tests use `@packages/convex-test` with `@effect/vitest`:

```bash
# Run all tests
cd packages/database && pnpm exec vitest run --no-watch --pool=forks

# Run specific test suites
pnpm exec vitest run --no-watch --pool=forks githubMirror    # 52 integration tests
pnpm exec vitest run --no-watch --pool=forks smokeOnboarding # Full onboarding smoke test
```

### Test Coverage

- **52 integration tests** covering webhook processing, idempotency, out-of-order handling, projections, pagination, write operations, and all event types
- **1 smoke test** validating the full onboarding pipeline (repo setup, diverse event processing, projection verification, queue health)
- Event types tested: issues, pull_request, push, create/delete (branches), check_run, issue_comment (create/edit/delete), pull_request_review (submit/dismiss)

## Scripts

```bash
pnpm dev          # Start all apps in development
pnpm build        # Build all packages
pnpm typecheck    # Type check all packages (uses TypeScript Go)
pnpm lint         # Lint with Biome
pnpm lint:fix     # Fix lint issues
```

## License

[FSL-1.1-MIT](LICENSE.md) - Functional Source License with MIT future license.
