# MyRA AI Trial Management Dashboard

Internal dashboard for MyRA AI's sales and support teams to manage trial organizations, track user engagement, plan product roadmap, and handle support tickets.

## Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5.9
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **Data fetching**: React Query (`@tanstack/react-query`)
- **Validation**: Zod 4
- **Styling**: Tailwind CSS 3
- **Charts**: Recharts (use for all new charts; Nivo exists only for Sankey diagrams)
- **Testing**: Jest (unit), Playwright (E2E)

## Project Structure
```
app/                    # Next.js App Router pages + API routes
components/             # React components (shared/ for reusable UI)
lib/                    # Domain logic organized by feature (bulkImport/, ai/, validation/, users/, organizations/)
hooks/                  # Custom React hooks
supabase/migrations/    # Database migrations
e2e/                    # Playwright tests
```

## Commands
```bash
npm run dev       # Start dev server
npm run build     # Production build (includes typecheck)
npm run lint      # ESLint
npm test          # Jest unit tests
npm run test:e2e  # Playwright E2E
```

## Critical Rules

1. **Never expose `SUPABASE_SERVICE_ROLE_KEY` client-side** — use `lib/supabase/server.ts` for server components
2. **Never bypass RLS** — use proper Supabase policies
3. **Never use useState/useEffect for data fetching** — use existing React Query hooks first, check `hooks/` and `lib/*/` for patterns like `useTrialOrganizations`
4. **Next.js 16 uses `proxy.ts` not `middleware.ts`** — don't create middleware files

## Before Starting Work

For unfamiliar areas, read the relevant doc first:

| Question | Read |
|----------|------|
| Overall architecture | `docs/COMPLETE_PROJECT_SUMMARY.md` |
| Bulk import functionality | `docs/BULK_IMPORT_FRAMEWORK.md` |
| Database schema | `supabase/migrations/` |
| Validation patterns | `lib/validation/schemas/` |

## Development Philosophy

- **Early stage, no backwards compatibility concerns** — Do things RIGHT: clean, organized, zero tech debt. Never create compatibility shims.
- **No workarounds** — Always implement FULL solutions that are long-term sustainable for 100+ users. No half-baked solutions.
- **Preserve UX surface** — Never remove, hide, or rename existing features or UI options unless explicitly asked. If something isn't fully wired, keep the UX intact and stub/annotate instead of deleting.

## Patterns to Follow

- Check existing implementations before creating new ones
- Match the coding style of surrounding files
- Batch Supabase operations (batch size 50 is optimal)
- Zod schemas use `message:` syntax (e.g., `{ message: "Error text" }`)
