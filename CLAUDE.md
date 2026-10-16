# CLAUDE.md

## ⚠️ Working rule: backend is hand-written by the owner

This project is a **backend learning project**.

- **`apps/api` (backend): do NOT write code unless explicitly asked.** The owner designs and writes the
  backend by hand: architecture, DB schema, migrations, modules, auth, validation, library choices.
  - Do not create, edit or refactor files in `apps/api` on your own initiative.
  - Do not add backend dependencies or make backend design decisions (schema, endpoints, auth strategy, etc.).
  - When asked backend questions: explain, review, point at docs, give hints or small illustrative
    snippets in chat, but let the owner type the real code. Prefer teaching over doing.
  - Only write backend code when the owner explicitly asks for that specific code.
- **`apps/web` (frontend): can be fully vibe-coded.** Build features freely. Consume the API as the owner
  designs it; if a needed endpoint doesn't exist yet, say so and don't invent it in `apps/api`.
- **`packages/shared`**: holds API contracts and types. Since these are backend design decisions, the owner
  defines them. Ask before adding to or changing them.

## Monorepo layout

pnpm workspaces (`pnpm-workspace.yaml`):

```
apps/
  web/        Angular 22 + Angular Material (standalone components, SCSS, Vitest)
  api/        NestJS 12 (ESM, "type": "module") + Knex query builder + PostgreSQL (pg)
packages/
  shared/     @dw/shared: shared TS types/contracts, compiled to dist/ with tsc
```

## Commands (run from repo root)

```bash
pnpm install          # install all workspaces
pnpm dev              # build shared, then run shared (watch) + web + api in parallel
pnpm dev:web          # Angular dev server → http://localhost:4200
pnpm dev:api          # Nest in watch mode → http://localhost:3000
pnpm build            # build shared, then web + api
pnpm test             # run tests in all workspaces
pnpm --filter <web|api|@dw/shared> <script>   # run a script in one workspace
pnpm --filter web ng generate component <path> # Angular CLI
```

Database: a locally installed PostgreSQL (no Docker), database `document_workflow` on `localhost:5432`.
Connection settings live in `apps/api/.env` (gitignored); `.env.example` documents the variables.

## Conventions

- Node ≥ 24, pnpm 12. Always use `pnpm`, never npm/yarn. Quote workspace specs in zsh: `'@dw/shared@workspace:*'`.
- `apps/api` is ESM with `nodenext` resolution: relative imports need the `.js` extension (`./app.module.js`).
- `@dw/shared` is consumed from `dist/`, so rebuild it (or run `pnpm dev`) after changing it.
- Frontend: standalone components, signals, new control flow (`@if`, `@for`), Angular Material components
  and theming (`src/styles.scss`). Keep UI in Material; avoid adding other UI libraries.

## Domain: Document Workflow App

Original requirements are in Uzbek. Glossary: **hujjat/dokument** = document, **bayonnoma** = protocol
(minutes), **rahbar** = head of organization, **xodim** = employee, **kelishuvchi** = approver,
**ijrochi** = assignee/executor, **tashkilot** = organization, **imzo** = signature.

### Roles
- **Super admin**: manages organizations and users, creates protocols and tasks, accepts or rejects task answers.
- **Head (rahbar)**: head of an organization. Signs or rejects documents and protocols.
- **Employee (xodim)**: employee of an organization. Creates documents.
- **Approver** and **assignee** are *not* separate roles. They are regular employees assigned per document/task.

### 1. Login
Users log in with login + password.

### 2. Organizations (CRUD)
Super admin creates, edits, deletes and lists organizations. Each organization has exactly one head.

### 3. Users (CRUD)
Super admin creates, edits, deletes and lists users. Fields: full name (F.I.Sh), login, password,
organization, role (head or employee).

### 4. Document
1. Employee creates a document and selects approvers (one or more).
2. The document is sent to all approvers **at the same time** (parallel approval).
3. Each approver approves or rejects. **Comment is required on rejection.**
4. If all approve, the document automatically goes to the head for signature.
5. If any one rejects, the whole document is rejected and returned to the author. The author edits and
   resubmits, and approval **restarts from the beginning**.
6. Head signs, or rejects with a comment. If rejected, the document returns to the author.

### 5. Protocol (bayonnoma)
Based on a **signed** document, super admin creates a protocol and selects approvers. The protocol goes
through the same approval + signature flow as a document (steps 2–6 above).

### 6. Task
1. After a protocol is signed, super admin creates a task with an assignee and a deadline.
2. The assignee answers the task.
3. Super admin accepts the answer, or rejects it with a comment.
4. If accepted, the task is closed.
5. If rejected, the assignee answers again. This loop repeats until an answer is accepted.
