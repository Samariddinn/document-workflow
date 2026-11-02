import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { errorMessage } from '../../../core/http/error-message';
import { ApprovalsApi, ApprovalSummary, REJECT_REASON_MAX_LENGTH } from '../approvals.api';

export interface RejectDialogData {
  item: ApprovalSummary;
}

/** Asks for the (required) reason and rejects; closes with `true` only when the API accepted it. */
@Component({
  selector: 'app-reject-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './reject-dialog.html',
  styleUrl: './reject-dialog.scss',
})
export class RejectDialog {
  protected readonly data = inject<RejectDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<RejectDialog, boolean>>(MatDialogRef);
  private readonly api = inject(ApprovalsApi);

  protected readonly maxLength = REJECT_REASON_MAX_LENGTH;
  protected readonly form = inject(NonNullableFormBuilder).group({
    reason: ['', [Validators.required, Validators.maxLength(REJECT_REASON_MAX_LENGTH), Validators.pattern(/\S/)]],
  });
  protected readonly reason = this.form.controls.reason;

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected reject(): void {
    if (this.busy()) return;

    this.reason.markAsTouched();
    if (this.reason.invalid) return;

    this.busy.set(true);
    this.error.set(null);
    this.reason.disable();
    this.dialogRef.disableClose = true;

    this.api.reject(this.data.item.id, this.reason.value.trim()).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.busy.set(false);
        this.reason.enable();
        this.dialogRef.disableClose = false;
        this.error.set(errorMessage(err));
      },
    });
  }
}
