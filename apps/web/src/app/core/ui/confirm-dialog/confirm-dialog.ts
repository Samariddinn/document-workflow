import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable } from 'rxjs';
import { errorMessage } from '../../http/error-message';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  /** Styles the confirm button as destructive. */
  destructive?: boolean;
  /**
   * Runs when the user confirms. The dialog stays open while it runs, shows API errors
   * inline, and closes with `true` only on success.
   */
  action: () => Observable<unknown>;
}

/** Confirmation dialog that performs the action itself, so failures can be shown in place. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
      @if (error(); as message) {
        <p class="error" role="alert">
          <mat-icon>error</mat-icon>
          <span>{{ message }}</span>
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close [disabled]="busy()">Cancel</button>
      <button
        mat-flat-button
        type="button"
        [class.destructive]="data.destructive"
        [disabled]="busy()"
        (click)="confirm()"
      >
        @if (busy()) {
          <mat-spinner diameter="20" />
        } @else {
          {{ data.confirmLabel }}
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: var(--mat-sys-corner-small);
      color: var(--mat-sys-on-error-container);
      background: var(--mat-sys-error-container);
    }

    .destructive {
      --mat-button-filled-container-color: var(--mat-sys-error);
      --mat-button-filled-label-text-color: var(--mat-sys-on-error);
    }

    mat-spinner {
      margin: 0 auto;
    }
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ConfirmDialog, boolean>>(MatDialogRef);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected confirm(): void {
    this.busy.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;

    this.data.action().subscribe({
      next: () => this.dialogRef.close(true),
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
        this.dialogRef.disableClose = false;
      },
    });
  }
}
