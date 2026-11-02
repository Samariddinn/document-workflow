import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/error-message';
import { FilesApi, saveBlob } from '../../files/files.api';
import { ApprovalActions } from '../approval-actions';
import { ApprovalDetail as Detail, ApprovalFile, ApprovalsApi, authorName } from '../approvals.api';

/** One approval: the document, its files, and Approve / Reject while a decision is still possible. */
@Component({
  selector: 'app-approval-detail',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    NgTemplateOutlet,
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './approval-detail.html',
  styleUrl: './approval-detail.scss',
})
export class ApprovalDetail implements OnInit {
  private readonly api = inject(ApprovalsApi);
  private readonly filesApi = inject(FilesApi);
  private readonly actions = inject(ApprovalActions);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly authorName = authorName;
  protected readonly approval = signal<Detail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly mainFiles = computed(() => this.approval()?.files.filter((f) => f.kind === 'MAIN') ?? []);
  protected readonly additionalFiles = computed(
    () => this.approval()?.files.filter((f) => f.kind === 'ADDITIONAL') ?? [],
  );

  /** Per-file download state, keyed by file id. */
  protected readonly downloading = signal<ReadonlySet<string>>(new Set());
  protected readonly downloadErrors = signal<Readonly<Record<string, string>>>({});

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api
      .get(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (approval) => {
          this.approval.set(approval);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(errorMessage(err));
          this.loading.set(false);
        },
      });
  }

  protected download(file: ApprovalFile): void {
    if (this.downloading().has(file.id)) return;

    this.downloading.update((ids) => new Set(ids).add(file.id));
    this.downloadErrors.update(({ [file.id]: _, ...rest }) => rest);

    this.filesApi
      .download(file.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          saveBlob(blob, file.name);
          this.stopDownloading(file.id);
        },
        error: (err) => {
          const message =
            err instanceof HttpErrorResponse && err.status === 403
              ? "You don't have permission to download this file"
              : errorMessage(err);
          this.downloadErrors.update((errors) => ({ ...errors, [file.id]: message }));
          this.stopDownloading(file.id);
        },
      });
  }

  protected approve(): void {
    const approval = this.approval();
    if (!approval) return;
    this.actions.approve(approval).subscribe((done) => done && this.router.navigate(['/approvals']));
  }

  protected reject(): void {
    const approval = this.approval();
    if (!approval) return;
    this.actions.reject(approval).subscribe((done) => done && this.router.navigate(['/approvals']));
  }

  private stopDownloading(fileId: string): void {
    this.downloading.update((ids) => {
      const next = new Set(ids);
      next.delete(fileId);
      return next;
    });
  }
}
