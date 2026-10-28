import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { errorMessage } from '../../../core/http/error-message';
import { Colleague, UsersApi } from '../../users/users.api';
import { DocumentRecord, DocumentsApi } from '../documents.api';

export interface SubmitDialogData {
  document: DocumentRecord;
}

/** Result when the document was sent; the dialog closes with `undefined` when cancelled. */
export interface SubmitDialogResult {
  document: DocumentRecord;
  approverCount: number;
}

/** Mirrors the API's limit on approvers per document. */
const MAX_APPROVERS = 20;

/** Picks approvers among the user's colleagues and sends the document for approval. */
@Component({
  selector: 'app-submit-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './submit-dialog.html',
  styleUrl: './submit-dialog.scss',
})
export class SubmitDialog implements OnInit {
  protected readonly data = inject<SubmitDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<SubmitDialog, SubmitDialogResult>>(MatDialogRef);
  private readonly usersApi = inject(UsersApi);
  private readonly documentsApi = inject(DocumentsApi);

  protected readonly maxApprovers = MAX_APPROVERS;
  protected readonly colleagues = signal<Colleague[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly search = signal('');
  protected readonly selected = signal<ReadonlySet<string>>(new Set());

  protected readonly visible = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.colleagues();
    return this.colleagues().filter((c) => this.fullName(c).toLowerCase().includes(query));
  });

  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.usersApi.colleagues().subscribe({
      next: (colleagues) => {
        this.colleagues.set(colleagues);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected fullName(c: Colleague): string {
    return [c.last_name, c.first_name, c.middle_name].filter(Boolean).join(' ');
  }

  protected isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  protected toggle(id: string): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_APPROVERS) {
        next.add(id);
      }
      return next;
    });
  }

  protected send(): void {
    const approverIds = [...this.selected()];
    if (approverIds.length === 0 || this.sending()) return;

    this.sending.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;

    this.documentsApi.submit(this.data.document.id, approverIds).subscribe({
      next: (document) => this.dialogRef.close({ document, approverCount: approverIds.length }),
      error: (err) => {
        this.sending.set(false);
        this.dialogRef.disableClose = false;
        this.error.set(errorMessage(err));
      },
    });
  }
}
