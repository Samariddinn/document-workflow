import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, Observable, tap } from 'rxjs';
import { ConfirmDialog, ConfirmDialogData } from '../../core/ui/confirm-dialog/confirm-dialog';
import { ApprovalsApi, ApprovalSummary, ApproveResult, authorName } from './approvals.api';
import { RejectDialog, RejectDialogData } from './reject-dialog/reject-dialog';

/**
 * The approve and reject flows (dialog → API → snackbar), shared by the inbox and the detail page.
 * Each emits `true` once the decision was saved, `false` when the user cancelled.
 */
@Injectable({ providedIn: 'root' })
export class ApprovalActions {
  private readonly api = inject(ApprovalsApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  approve(item: ApprovalSummary): Observable<boolean> {
    let result: ApproveResult | undefined;

    const data: ConfirmDialogData = {
      title: `Approve ${item.document_number}?`,
      message: `"${item.description}" by ${authorName(item)}. Your approval cannot be changed afterwards.`,
      confirmLabel: 'Approve',
      action: () => this.api.approve(item.id).pipe(tap((r) => (result = r))),
    };

    return this.dialog
      .open(ConfirmDialog, { data, width: '460px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .pipe(
        map((approved) => approved === true),
        tap((approved) => {
          if (!approved) return;
          const message =
            result?.document_status === 'AWAITING_SIGNATURE'
              ? `Approved ${item.document_number}. Everyone approved, it went to the head for signature`
              : `Approved ${item.document_number}`;
          this.snackBar.open(message, undefined, { duration: 4000 });
        }),
      );
  }

  reject(item: ApprovalSummary): Observable<boolean> {
    return this.dialog
      .open<RejectDialog, RejectDialogData, boolean>(RejectDialog, {
        data: { item },
        width: '520px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .pipe(
        map((rejected) => rejected === true),
        tap((rejected) => {
          if (!rejected) return;
          this.snackBar.open(`Rejected ${item.document_number}, it went back to the author`, undefined, {
            duration: 4000,
          });
        }),
      );
  }
}
