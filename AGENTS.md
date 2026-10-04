# AGENTS.md

## Project conventions

- Use Next.js App Router and keep server data access in server components, route handlers, server actions, or `src/server/`.
- Keep feature contracts together under `src/features/<domain>/`; use Zod at every external input boundary.
- Use `requireUser` and `requirePermission` for server authorization. Do not rely on sidebar visibility or proxy redirects as authorization.
- Keep public configuration in `src/config/app-config.ts`; never expose credentials through `NEXT_PUBLIC_*` variables.
- Run `npm run typecheck` and `npm run build` after significant changes. Update matching living docs and add an implementation report under `docs/reports/YYYY/MM/DD/`.

## Documentation
All significant changes must keep `/docs` synchronized with the current implementation.

Documentation is required when a change affects:

- architecture,
- database schema,
- API,
- WebSocket events,
- feature behavior,
- authentication or authorization,
- deployment,
- infrastructure,
- configuration,
- security,
- data flow,
- external integration.

Rules:

1. Update the relevant existing document when behavior changes.
2. Create a new document only when the topic does not already exist.
3. Avoid duplicate documentation.
4. Update `docs/README.md` when adding a new documentation file.
5. Documentation must describe the current implementation, not an outdated plan.
6. Database changes must document affected tables, columns, indexes, constraints, and migrations.
7. API changes must document endpoints, payloads, responses, errors, and authorization.
8. WebSocket changes must document event names, payloads, direction, and behavior.
9. Deployment changes must update installation or upgrade instructions when applicable.
10. Significant architectural decisions should be recorded before or together with implementation.

Read `docs/governance/ARCHITECTURE_BLUEPRINT.md` and `docs/governance/DESIGN.md` before structural or UI work. Keep the former portable and free of product-domain rules. Record product requirements separately instead of treating examples as requirements.

## PRD Versioning
Setiap PRD yang akan diimplementasikan wajib disimpan di `docs/products/PRD/` dengan format `PRD_<NNN>_<nama-fitur>.md`, contoh `PRD_001_ai-assistant.md`. Sebelum implementasi, cek nomor PRD terakhir lalu gunakan nomor berikutnya secara berurutan (`001`, `002`, `003`, dst.). Jangan overwrite PRD lama dan simpan versi PRD terlebih dahulu sebelum mulai implementasi.

## Tasks Management

### Purpose

Work systematically, keep implementation trackable, and adapt execution based on task complexity.

Always inspect relevant existing code before making changes.

---

### Task Classification

Classify every request as SMALL, MEDIUM, or LARGE.

#### SMALL

Examples:
- text/style changes
- isolated bug fixes
- small validation/config changes
- one field/component/query change
- limited refactor

Workflow:

`Understand → Plan → Implement → Verify → Report`

Rules:
- Briefly explain the plan first.
- Do not create task decomposition.
- Implement directly.
- Verify and report the result.
- No approval is required between steps.

---

#### MEDIUM

Examples:
- one complete feature
- several related files
- API + UI integration
- moderate workflow changes
- database changes limited to one feature

Workflow:

`Inspect → Decompose → Present Plan → Execute One Task → Verify → Report → Ask`

Rules:
- Inspect the existing implementation first.
- Break the work into small, ordered, verifiable tasks.
- Present the full task plan before implementation.
- Execute only one task at a time.
- After each task:
  - verify it,
  - report completed changes,
  - show remaining tasks,
  - stop and ask whether to continue.

---

#### LARGE

Examples:
- PRD implementation
- new module
- architecture changes
- multi-feature or system-wide changes
- database + backend + frontend + integration
- major refactor

Workflow:

`Inspect Architecture → Decompose → Present Plan → Execute One Task → Verify → Report → Ask`

Rules:
- Read the full request, PRD, or specification.
- Inspect repository structure, architecture, database patterns, dependencies, and conventions.
- Break work into small, ordered, independently verifiable tasks.
- Present the full plan before modifying code.
- Execute only one task at a time.
- Never continue to the next task without explicit user confirmation.

---

### Planning Format

For MEDIUM and LARGE tasks, show:

```text
Classification: MEDIUM / LARGE
Reason: ...

Implementation Plan:
- Task 1 — ...
- Task 2 — ...
- Task 3 — ...

Execution Order:
Task 1 → Task 2 → Task 3
```

Then start only with Task 1.

---

### Task Execution

Before each task:

```text
Current Task: Task X — <task name>
```

Briefly explain what will change.

During implementation:
- follow existing architecture and conventions
- keep changes scoped to the current task
- avoid unrelated refactors
- do not implement future tasks early

After each task, run relevant verification such as:
- build
- typecheck
- lint
- tests
- database/API validation
- UI behavior checks

Then report:

```text
Task X Completed

Changes:
- ...

Verification:
- ...

Remaining Tasks:
- Task X+1 — ...
- Task X+2 — ...
```

Then ask:

**Apakah ingin lanjut ke Task X+1, atau ada bagian dari Task X yang ingin diperbaiki terlebih dahulu?**

Do not continue automatically.

---

### Scope Control

Do not silently expand scope.

If new work is discovered:
1. finish the current task when possible
2. report the new requirement
3. add it to the remaining plan
4. ask whether it should be included

Only implement extra work automatically if required to make the current task functional.

---

### Core Execution Rule

Use the smallest reasonable classification.

`SMALL → plan briefly → implement → verify → report`

`MEDIUM → plan tasks → execute one task → verify → report → ask`

`LARGE → plan phases/tasks → execute one task → verify → report → ask`

For MEDIUM and LARGE tasks:

**Never execute multiple planned tasks in one turn unless the user explicitly asks to continue automatically.**

## Git and Commit Conventions

- Use Conventional Commits: `type(scope): short description`.
- Common scopes include `ftk` and `mutasi`.
- Valid types: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`, `perf`.
- Keep commits focused on one logical change; never mix unrelated work.
- Create a commit only after the related task is completed, reviewed, and validated.
- Commit messages must be concise, specific, lowercase, and use imperative wording.
- Match the surrounding file's Indonesian/English style for comments and identifiers.
- Never commit secrets, `.env`, database dumps, generated files, or unrelated changes. Double-check ignored files before committing.
- `config/database.php` may exist locally but must not contain secrets.
- Do not amend, squash, force-push, or rewrite Git history without explicit approval.
- After each completed and validated task, create one focused commit.

Examples:

`fix(mutasi): gunakan status disetujui untuk ekspor usulan`

`feat(ftk): set default ee sub group filters`

## Implementation Report

**Tanggal:** YYYY-MM-DD  
**Classification:** SMALL / MEDIUM / LARGE  
**Status:** NOT STARTED / IN PROGRESS / PARTIALLY COMPLETED / COMPLETED / BLOCKED

### Rencana dan Tracking
- Current Task:
- Progress:
- Next Task:

### Penyebab dan Perubahan
- Penyebab:
- Perubahan:

### File Change
- Created:
- Modified:
- Deleted:

### Database Change
- ...

### Architecture Change
- ...

Kalau tidak ada perubahan pada salah satu bagian, cukup isi None.

## Git and Commit Attribution

- When creating or amending Git commits, NEVER add Claude, Anthropic, or any AI assistant as a commit author, co-author, contributor, or attribution.
- NEVER add `Co-Authored-By` trailers for Claude, Anthropic, or any AI assistant.
- NEVER add `Signed-off-by`, `Generated-by`, `Assisted-by`, or similar attribution referring to Claude, Anthropic, or any AI assistant unless explicitly requested by the user.
- Do not modify the repository's Git `user.name` or `user.email`.
- All commits must use only the Git author identity already configured by the repository/user environment.
- Commit messages must contain only the Conventional Commit message required by this repository and relevant human-authored commit details.
- When committing or pushing changes, do not add any metadata intended to identify Claude or Anthropic as a contributor.
- Before committing, verify that the commit message does not contain AI co-author or attribution trailers.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
