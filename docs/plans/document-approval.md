# Document approval (agreements)

Approver side of the document workflow (requirements §4, steps 2–5): approvers see the documents
sent to them, approve or reject them, and the document moves on automatically.

> Backend (`apps/api`) is written by the owner; this plan is the agreed design. Frontend is built on top of it.

## Already done

- `POST /documents/:id/submit` (author): locks the document, checks owner + `DRAFT`/`RETURNED`,
  picks the attempt (`DRAFT` → current, `RETURNED` → current + 1), validates approvers
  (same org, `EMPLOYEE`, not deleted, not the author), inserts `PENDING` agreements, sets `IN_APPROVAL`.
- `GET /users/colleagues`: approver candidates for the picker.
- Frontend: "Send for approval" dialog on My documents.

Submit fixes done: `ParseUUIDPipe` on the route; `approver_ids` validated with `@IsUUID(each)`,
`@ArrayUnique()`, `@ArrayMaxSize(20)`.

## Module

New `modules/agreements/` (controller + service), role `EMPLOYEE`, registered in `AppModule`.

Progress:
- [x] `GET /agreements` (inbox) — note: `.offset(offset)` must stay after `.limit(limit)`
- [x] Frontend inbox page `/approvals` (read-only for now)
- [x] `GET /agreements/:id` (agreement + document + author + MAIN/ADDITIONAL files + `can_decide`)
- [x] Frontend: approval detail page `/approvals/:id` (files with download, Approve / Reject, decided/cancelled states);
      approve/reject flows shared via `ApprovalActions`
- [x] `POST /agreements/:id/approve` (200, returns `{ id, status, document_status }`, no body)
- [x] Frontend: Approve button in the inbox (confirm dialog → snackbar → reload)
- [x] `POST /agreements/:id/reject` (200, body `{ reject_reason }`, cancels other pending votes, document → `RETURNED`)
- [x] Frontend: Reject button + dialog with required reason (max 1000)
- [ ] File download permission for approvers (`FilesService.download`), see "Files" below.
      Currently the check is removed entirely, so any logged-in user can download any file by id. Must be restored
- [x] Reject: save `reject_reason.trim()`; 409 message fixed; unused DTO imports removed
- [ ] Optional: extract the shared lock/re-check steps of approve/reject into one helper
- [x] Author sees why a document was returned: `GET /documents/:id` returns `rejection`
      (the current attempt's `REJECTED` agreement + approver name, or `null`); the edit page shows
      "Returned by X on date" + the reason. When the head can reject, fill the same field from `document_signatures`

Works for protocols too without changes: a protocol is a `documents` row (`kind = 'PROTOCOL'`), and
agreements reference `documents.id`.

## Endpoints

| method | path | who | does |
|---|---|---|---|
| GET | `/agreements` | approver | my inbox: my `PENDING` rows of the **current attempt** of documents that are `IN_APPROVAL` and not deleted; paginated `{ list, total }` like `GET /documents` |
| GET | `/agreements/:id` | the approver of that row | the agreement + its document + the document's files (approvers cannot use `GET /documents/:id`, which is author-only) |
| POST | `/agreements/:id/approve` | the approver of that row | approve |
| POST | `/agreements/:id/reject` | the approver of that row | reject, body `{ comment }` (required, non-blank, max length) |

Inbox row: agreement `id`, `status`, `created_at` (sent at) + document `id`, `document_number`,
`description`, `kind`, author full name.

## Rules for approve / reject

Both run in one transaction and **lock the document row first** (`select ... from documents ... for update`).
Locking the document (not the agreement) serializes all approvers of the same document, which is what
prevents the parallel-approval race. Always lock `documents` before touching `document_agreements`.

Checks, in order:
1. agreement exists → else 404
2. `agreement.user_id = me` → else 403
3. document not deleted, `status = 'IN_APPROVAL'`, `agreement.attempt = document.current_attempt`,
   `agreement.status = 'PENDING'` → else 409 ("already decided" / "no longer waiting for approval")

### Approve
1. agreement → `APPROVED`, `decided_at = now()`
2. count `PENDING` agreements of this document's current attempt
3. if none left (nobody rejected, otherwise the document would be `RETURNED` and step 3 above fails):
   - find the head: `users where org_id = document.org_id and role = 'HEAD' and is_deleted = false`
   - insert `document_signatures` `{ document_id, attempt, signer_id: head.id, status: 'PENDING' }`
   - document → `AWAITING_SIGNATURE`
4. return the updated agreement + document status

Open decision: **organization without a head.** Proposed: fail the last approval with 409
"Organization has no head to sign" (transaction rolls back, approver can retry once a head exists).

### Reject
1. agreement → `REJECTED`, `comment`, `decided_at = now()` (DB check already requires a non-blank comment)
2. other `PENDING` agreements of the same attempt → `CANCELLED` (`decided_at` stays null, as the DB check requires)
3. document → `RETURNED`; the author edits and resubmits, which starts the next attempt

## Files: approvers must be able to download

`FilesService.download` allows only the uploader or super admin, so approvers cannot open the
document's files. Extend the check: allowed if the user is the uploader, super admin, **or** has an
agreement on a document the file is linked to (`document_files` join `document_agreements`
on `user_id = me`). Later the same for the head via `document_signatures.signer_id`.

## Frontend (after the API exists)

- "Approvals" in the home toolbar for employees → inbox page (table, paginator in URL, empty state)
- row → approval detail: document number, description, author, files (download), Approve / Reject
- Approve: confirm dialog → snackbar → back to inbox
- Reject: dialog with a required comment → snackbar → back to inbox
- My documents: author sees status change to `Awaiting signature` or `Returned`

## Later (not in this plan)

- Head side: `GET /signatures`, sign / reject with comment (`document_signatures`), signed file
- Author history: per attempt, who approved/rejected and the comments (read from agreements by attempt)
- Protocols (§5) and tasks (§6)
