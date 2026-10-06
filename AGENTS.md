# AGENTS.md

## Project conventions

- Use Next.js App Router and keep server data access in server components, route handlers, server actions, or `src/server/`.
- Keep feature contracts together under `src/features/<domain>/`; use Zod at every external input boundary.
- Use `requireUser` and `requirePermission` for server authorization. Do not rely on sidebar visibility or proxy redirects as authorization.
- Keep public configuration in `src/config/app-config.ts`; never expose credentials through `NEXT_PUBLIC_*` variables.
- Run `npm run typecheck` and `npm run build` after significant changes. Update matching living docs and add an implementation report under `docs/reports/YYYY/MM/DD/`.

<!-- ## Documentation

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

Read `docs/governance/ARCHITECTURE_BLUEPRINT.md` and `docs/governance/DESIGN.md` before structural or UI work. Keep the former portable and free of product-domain rules. Record product requirements separately instead of treating examples as requirements. -->

## PRD Management

### PRD Versioning and Lifecycle

For MEDIUM and LARGE work, manage PRDs through **Task Management Lifecycle → PRD Resolution**.

Store PRDs in:

`docs/products/PRD/PRD_<NNN>_<feature-name>.md`

Example:

`docs/products/PRD/PRD_001_ai-assistant.md`

Rules:

- Create a PRD only after briefing is confirmed and the task is classified as MEDIUM or LARGE.
- Before creating a PRD, check for an active PRD with the same scope.
- If one exists, reuse and update it.
- If none exists, create the next sequential PRD: `001`, `002`, `003`, and so on.
- Save the PRD before task decomposition and implementation.
- Never overwrite an unrelated existing PRD.
- Do not create another PRD for the same active scope.
- Requirement changes within the same scope must update the active PRD.
- A new PRD is allowed only when the current PRD is `COMPLETED` or the new scope is clearly different.
- PRD status must be recorded inside the PRD.

Status:

`DRAFT → IN PROGRESS → COMPLETED`

## Tasks Management Lifecycle

### Purpose

Work systematically, keep implementation trackable, and adapt execution based on task complexity.

Always inspect relevant existing code before making changes.

---

### Briefing Detection

When the user is still explaining, discussing, refining, or adding requirements, treat the conversation as **BRIEFING MODE**.

In BRIEFING MODE:

- do not start implementation
- do not create task execution details yet
- keep gathering and consolidating requirements
- resolve contradictions or missing critical details when necessary
- summarize the understood scope briefly when the requirements appear complete

When Codex determines the task is sufficiently clear, ask:

**"Briefing sudah cukup jelas. Apakah semua requirement sudah benar dan saya boleh lanjut menyusun Task Execution?"**

Only after the user confirms, proceed to:

`Task Classification → PRD Resolution → Planning → Task Execution`

If the user adds or changes requirements instead of confirming, remain in BRIEFING MODE and update the understood scope.

Do not repeatedly ask whether the briefing is complete while the user is clearly still adding requirements.

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

`Inspect → Resolve PRD → Decompose → Present Plan → Execute One Task → Verify → Report → Ask`

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

`Inspect Architecture → Resolve PRD → Decompose → Present Plan → Execute One Task → Verify → Report → Ask`

Rules:

- Read the confirmed briefing, request, existing PRD, or specification.
- Resolve the active PRD according to **PRD Resolution**.
- Inspect repository structure, architecture, database patterns, dependencies, and conventions.

---

### PRD Resolution

After briefing is confirmed and task classification is determined:

- `SMALL` → no PRD required.
- `MEDIUM / LARGE` → check for an active PRD with the same scope.
- If found, reuse and update the existing PRD.
- If not found, create one according to **PRD Management**.
- PRD must exist before task decomposition and implementation begin.
- Do not create another PRD for the same scope until the active PRD is `COMPLETED`.

---

### Planning Format

For MEDIUM and LARGE tasks, show:

```text
Classification: MEDIUM / LARGE
Reason: ...

PRD:
- <active PRD path or source>
- Status: DRAFT / IN PROGRESS

Implementation Plan:
- Task 1 — ...
- Task 2 — ...
- Task 3 — ...

Execution Order:
Task 1 → Task 2 → Task 3
```

Rules:

- Use the confirmed briefing/request and active PRD as the planning source.
- Keep tasks small, ordered, and independently verifiable.
- Do not start implementation before the full plan is shown.
- Start only with Task 1.
- If subtasks are inserted later, update the existing plan instead of recreating it.

---

### Task Execution

Before each task, show:

```text
Current Task: Task X — <task name>
Parent Task: <parent task if subtask, otherwise None>
PRD: <active PRD path, or None for SMALL>
```

Briefly explain what will change.

Show the planned impact before implementation:

```text
Planned File/Folder Changes

Create:
- path — <purpose>

Modify:
- path — <change>

Delete:
- path — <reason>

Move/Rename:
- old/path → new/path — <reason>
```

If applicable:

```text
Planned Database Changes

Tables:
- Create / Modify / Delete: <table> — <change>

Columns:
- Add / Modify / Delete: <table.column> — <change>

Indexes / Constraints / Relations:
- <change>
```

Also show meaningful architecture impact when applicable:

```text
Planned Architecture Changes

- <component/layer> — <change and purpose>
```

Rules:

- Use repository-relative paths.
- Use `None` when a category has no planned changes.
- Preserve existing files, folders, database structure, architecture, and behavior unless required by the current task.
- Do not modify unrelated scope or implement future tasks early.
- If implementation requires changes outside the presented plan, report them first.
- If the new change affects requirements or scope, update the active PRD and task plan before continuing.
- For subtasks, keep the parent task paused until the subtask is completed and verified.

During implementation:

- follow existing architecture and conventions
- keep changes scoped to the active task/subtask
- avoid unnecessary refactors

After each task:

- run relevant verification
- update task tracking
- generate the Implementation Report using the `Implementation Report` convention
- show remaining tasks
- ask whether to continue

<!-- After each task, run relevant verification such as:

- build
- typecheck
- lint
- tests
- database/API validation
- UI behavior checks -->

Then update task tracking and provide the Implementation Report using the project convention.

Show the remaining tasks and ask:

**Apakah ingin lanjut ke Task berikutnya, kembali ke Parent Task, atau ada bagian yang ingin diperbaiki terlebih dahulu?**

Do not continue automatically.

---

### Subtask Insertion

If additional work appears while a task is active, keep the original task and add the new work as a subtask.

Example:

```text
Task 1
Task 2
  Task 2a
  Task 2b
Task 3
```

Rules:

- Keep the parent task number unchanged.
- Add new work using suffixes: `a`, `b`, `c`, etc.
- Pause the parent task when the subtask must be completed first.
- Complete and verify the subtask before resuming the parent task.
- Update the task plan before executing the new subtask.
- Never renumber completed tasks.

Execution:

`Task 2 → discover Task 2a → pause Task 2 → execute Task 2a → verify → resume Task 2`

#### Subtask Lifecycle

New subtasks do not restart the full Task Management lifecycle.

When a subtask appears:

1. Check whether the subtask is clear enough to execute.
2. Confirm it still belongs to the active PRD/task scope.
3. Update the active PRD if the requirement changes.
4. Add the subtask to the current task plan.
5. Show its planned file/folder/database/architecture impact.
6. Execute and verify the subtask.
7. Report completion.
8. Resume the parent task after user confirmation.

Only return to **Briefing Detection** if the new subtask itself is unclear or requires additional requirement discussion.

If the new work is outside the active PRD scope, do not add it as a subtask; treat it as a separate request and run the normal Task Management lifecycle.

---

### Scope Control

Do not silently expand scope.

If new work is discovered:

1. Determine whether it belongs to the active PRD/task scope.
2. If yes, add it through **Subtask Insertion** and update the active PRD/task plan when required.
3. If no, report it as a separate scope and do not implement it automatically.
4. Only implement additional work automatically when required to make the current task functional.

---

### Core Execution Rule

Use the smallest reasonable classification.

`SMALL → plan briefly → implement → verify → report`

`MEDIUM → resolve PRD → plan tasks → execute one task → verify → report → ask`

`LARGE → resolve PRD → plan phases/tasks → execute one task → verify → report → ask`

For MEDIUM and LARGE tasks:

- Execute only one active task or subtask at a time.
- Never continue automatically without explicit user confirmation.
- If a subtask is inserted, complete it first, then return to the parent task.
- Do not restart the full lifecycle unless the new work is outside the active scope.

---

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

If a category has no changes, write `None`.

### Report Storage

Store reports under:

`docs/reports/<year>/<month>/<day>/`

Filename format:

`<feature>_<task-or-stage>_<short-description>.md`

---

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
