# AGENTS.md

## Project conventions

- Use Next.js App Router and keep server data access in server components, route handlers, server actions, or `src/server/`.
- Keep feature contracts together under `src/features/<domain>/`; use Zod at every external input boundary.
- Use `requireUser` and `requirePermission` for server authorization. Do not rely on sidebar visibility or proxy redirects as authorization.
- Keep public configuration in `src/config/app-config.ts`; never expose credentials through `NEXT_PUBLIC_*` variables.
- Run `npm run typecheck` and `npm run build` after significant changes. Update matching living docs and add an implementation report under `docs/reports/YYYY/MM/DD/`.

## Documentation

Read `docs/governance/ARCHITECTURE_BLUEPRINT.md` and `docs/governance/DESIGN.md` before structural or UI work. Keep the former portable and free of product-domain rules. Record product requirements separately instead of treating examples as requirements.
