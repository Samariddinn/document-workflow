import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { errorMessage } from '../../../core/http/error-message';
import {
  DOCUMENT_STATUS_LABELS,
  DocumentRecord,
  DocumentsApi,
  DocumentStatus,
} from '../documents.api';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 20;

@Component({
  selector: 'app-documents-page',
  imports: [
    RouterLink,
    DatePipe,
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressBarModule,
  ],
  templateUrl: './documents-page.html',
  styleUrl: './documents-page.scss',
})
export class DocumentsPage implements OnInit {
  private readonly api = inject(DocumentsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  protected readonly columns = ['document_number', 'description', 'status', 'created_at'];
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  protected readonly documents = signal<DocumentRecord[]>([]);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  /** The page lives in the URL (?page=2&size=50), so refresh, back and shared links keep it. */
  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const page = Number(params.get('page'));
      const size = Number(params.get('size'));
      this.pageIndex.set(Number.isInteger(page) && page >= 1 ? page - 1 : 0);
      this.pageSize.set(PAGE_SIZE_OPTIONS.includes(size) ? size : DEFAULT_PAGE_SIZE);
      this.load();
    });
  }

  protected statusLabel(status: DocumentStatus): string {
    return DOCUMENT_STATUS_LABELS[status] ?? status;
  }

  protected onPage(event: PageEvent): void {
    this.goTo(event.pageIndex, event.pageSize);
  }

  protected load(): void {
    // Drop a slower response for a page the user has already left
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);

    const limit = this.pageSize();
    const offset = this.pageIndex() * limit;

    this.request = this.api
      .list(limit, offset)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.documents.set(page.list);
          this.total.set(page.total);
          this.loading.set(false);

          // A page past the end (old link, or documents removed elsewhere): go to the last real page
          if (page.list.length === 0 && page.total > 0 && this.pageIndex() > 0) {
            this.goTo(Math.ceil(page.total / limit) - 1, limit, true);
          }
        },
        error: (err) => {
          this.error.set(errorMessage(err));
          this.loading.set(false);
        },
      });
  }

  private goTo(pageIndex: number, pageSize: number, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: pageIndex > 0 ? pageIndex + 1 : null,
        size: pageSize !== DEFAULT_PAGE_SIZE ? pageSize : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}
