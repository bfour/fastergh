# AGENTS.md - packages/ui

Local guide for autonomous agents working in `packages/ui`.

## Design stance

- Treat this package as greenfield-first.
- Breaking changes are acceptable when they improve component APIs and maintainability.
- Prefer long-term composability over compatibility hacks.

## Commands

Run from `packages/ui` unless noted.

- Typecheck (fast): `pnpm run typecheck`
- Typecheck (slow): `pnpm run typecheck:slow`
- Test all: `pnpm run test`
- Watch tests: `pnpm run test:watch`
- Single test file: `pnpm run test src/components/command.test.tsx`
- Single test by name: `pnpm run test -t "test name"`
- Root-filtered run (from repo root): `pnpm --filter @packages/ui run test src/components/command.test.tsx`
- Lint (repo root): `pnpm run lint`

## UI conventions

- Prefer primitives in this package over native controls in app code.
- In consuming code, use `@packages/ui/components/*` imports.
- Inside this package, do not import from `@packages/ui`; use relative imports.
- Prefer inline event handlers when clearer.
- Avoid generic names like `handleClick` when behavior-specific naming is clearer.
- Avoid non-semantic click targets like `<div onClick>`.
- Avoid unnecessary `useMemo`; use it only when measured and render-critical.
- In React 19 effects, use `useEffectEvent` when callback freshness is needed without retriggering.

## Type, formatting, and imports

- Formatting/linting are governed by root `biome.json` (tabs, double quotes).
- Do not use `any`, `unknown`, or type assertions.
- Prefer inference over verbose annotations.
- Cross-package imports must use workspace aliases.
- In Next.js consumers (`apps/main-site`), URL state should use `nuqs`.

## Tests

- Vitest environment: `happy-dom`.
- Prefer focused file or `-t` runs while iterating.

## Rule sources to honor

- Root agent guide: `/home/rhys/quickhub/AGENTS.md`.
- Cursor rules exist in `/home/rhys/quickhub/.cursor/rules/*.mdc` and are mandatory.
- No `.cursorrules` file exists.
- No `.github/copilot-instructions.md` file exists.
