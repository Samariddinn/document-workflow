# Document signature (head)

Head side of the document workflow (requirements §4, step 6): once every approver approved, the
document waits for the head's signature. The head signs it, or rejects it with a comment and it
goes back to the author.

> Backend (`apps/api`) is written by the owner; this plan is the agreed design. Frontend is built on top of it.

## Already in place

- `document_signatures` table: `id`, `document_id`, `signer_id`, `attempt`, `status`
  (`PENDING` / `SIGNED` / `REJECTED`), `comment`, `decided_at`, `created_at`;
  `unique (document_id, attempt)`, "reject needs a comment" check, "`decided_at` set iff not `PENDING`" check.
- `AgreementsService.approve`: on the last approval it inserts the `PENDING` signature row for the
  org's head and moves the document to `AWAITING_SIGNATURE`.

## Module

New `modules/signatures/` (controller + service), role `HEAD`, registered in `AppModule`.
Same shape as `modules/agreements/`.

| method | path | does |
|---|---|---|
| GET | `/signatures` | inbox: my `PENDING` rows of the **current attempt** of documents that are `AWAITING_SIGNATURE` and not deleted; paginated `{ list, total }` |
| GET | `/signatures/:id` | the signature + document + author + MAIN/ADDITIONAL files + `can_decide` (+ optional: the approvers who approved this round) |
| POST | `/signatures/:id/sign` | sign, 200, no body |
| POST | `/signatures/:id/reject` | reject, 200, body `{ reject_reason }` (same validation as agreements: non-blank, max 1000, saved trimmed) |

Inbox row: signature `id`, `created_at as sent_at` + document `id`, `document_number`, `description`,
`kind`, author name (same fields as the agreements inbox).

## Rules for sign / reject

Same pattern as approve / reject, in one transaction:
1. find the signature → 404; `signer_id = me` → else 403
2. lock the document row `FOR UPDATE`, then re-read the signature
3. document not deleted, `status = 'AWAITING_SIGNATURE'`, `signature.attempt = document.current_attempt`,
   `signature.status = 'PENDING'` → else 409

### Sign
1. signature → `SIGNED`, `decided_at = now()`
2. document → `SIGNED`, `updated_at = now()`
3. return `{ id, status: 'SIGNED', document_status: 'SIGNED' }`

### Reject
1. signature → `REJECTED`, `comment = reject_reason.trim()`, `decided_at = now()`
2. document → `RETURNED`, `updated_at = now()`
3. return `{ id, status: 'REJECTED', document_status: 'RETURNED' }`

The author edits and resubmits → `current_attempt + 1` → new agreements → on the last approval a new
signature row for the new attempt (`unique (document_id, attempt)` allows one per round).

Decision: **signing is a click** (no signed-file upload, no digital signature) in this version.
`document_files.kind = 'SIGNED'` stays reserved for a later "attach the signed scan" step.

## Changes in other modules

- `FilesService.download`: also allow the head, i.e. the user has a `document_signatures` row
  (`signer_id = me`) on a document the file is linked to (next to the existing agreements check).
- `DocumentsService.detail` → `rejection`: when no approver rejected the current attempt, look for a
  `REJECTED` row in `document_signatures` for that attempt. Same fields (`comment`, `decided_at`, name),
  so the author's "Returned by X" banner works unchanged.

## Frontend (after each endpoint exists)

- Home toolbar for `HEAD`: "To sign" → `/signatures` inbox (table, paginator in URL, empty state)
- `/signatures/:id`: document, author, files with download, who approved; Sign / Reject
- Sign: confirm dialog → snackbar → back to inbox. Reject: dialog with required reason → snackbar → back
- My documents: `Signed` status; edit page shows "Returned by the head: reason"

## Known limitation

The signer is fixed when the signature row is created. If the org's head changes while a document
is `AWAITING_SIGNATURE`, the old head's row stays `PENDING`. Out of scope for now.

## Progress

- [x] Module skeleton (module, controller with `AuthGuard` + `RoleGuard` + `@Roles(HEAD)`, empty service), registered in `AppModule`
- [x] `GET /signatures` (same row shape as `GET /agreements`)
- [x] Frontend inbox `/signatures` ("To sign" in the home toolbar for `HEAD`); read-only until the detail and sign endpoints exist
- [ ] `GET /signatures/:id` + frontend detail
- [ ] `POST /signatures/:id/sign` + frontend Sign
- [ ] `POST /signatures/:id/reject` + frontend Reject
- [ ] Files download for the head
- [ ] `rejection` in `GET /documents/:id` also covers the head's rejection
