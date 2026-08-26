# examples — framework integration examples

**Job: integration proof, for frameworks with no smoke app of their own.** Each is a minimal app wiring the SDK the way a user of that framework would.

| Example | Why it exists | Gate |
| --- | --- | --- |
| `astro/` | Astro SSRs its own HTML, so the Vite plugin's `index.html` connect-injection never fires — it connects from a bundled client script instead. That difference is worth keeping honest. | `pnpm test:integration` (pre-instrumented fixture) and `pnpm gate:install` (pristine scaffold) |
| `remix/` | Only Remix coverage. `SKILL.md` offers Remix to users. | `pnpm test:integration` |

`remix/` is still integration-only. `astro/` is now also in the install gate: the fixture proves a wired app still connects; the scaffold proves `init` can apply that wiring from scratch. Tracked in `packages/server/src/tools/integration-coverage.test.ts`.

`examples/next` and `examples/react` were deleted: they duplicated wiring `next-smoke` and `bench-app` already prove, no doc linked to them, and no gate ran them.
