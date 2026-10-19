# AGENTS.md - packages/convex-test

Local guide for autonomous agents working in `packages/convex-test`.

## Design stance

- Treat this package as greenfield-first.
- Breaking changes are acceptable when they improve test harness correctness.
- Prefer best long-term behavior parity with Convex semantics.

## Commands

Run from `packages/convex-test` unless noted.

- Typecheck: `pnpm run typecheck`
- Test all: `pnpm run test`
- Watch tests: `pnpm run test:watch`
- Run once alias: `pnpm run test:once`
- Single test file: `pnpm run test convex/actions.test.ts`
- Single test by name: `pnpm run test -t "test name"`
- Debug tests: `pnpm run test:debug`
- Coverage: `pnpm run test:coverage`
- Root-filtered run (from repo root): `pnpm --filter @packages/convex-test run test convex/actions.test.ts`
- Lint (repo root): `pnpm run lint`

## Code style

- Formatting/linting are governed by root `biome.json`.
- Favor strict typing in new code.
- Avoid introducing new `any`/`unknown`/casts; legacy internals may contain historical exceptions.
- Keep mock behavior aligned with real Convex query/mutation/action semantics.

## Convex-specific notes

- Prefer explicit validators and schema-driven behavior in fixtures.
- Index and query semantics should match Convex behavior as closely as possible.
- Keep tests deterministic and isolate side effects.

## Rule sources to honor

- Root agent guide: `/home/rhys/quickhub/AGENTS.md`.
- Cursor rules exist in `/home/rhys/quickhub/.cursor/rules/*.mdc` and are mandatory.
- No `.cursorrules` file exists.
- No `.github/copilot-instructions.md` file exists.
