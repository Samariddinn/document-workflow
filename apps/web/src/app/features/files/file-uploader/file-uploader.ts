import { DecimalPipe } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, model, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subscription } from 'rxjs';
import { errorMessage } from '../../../core/http/error-message';
import { ACCEPT_ATTRIBUTE, FilesApi, StoredFile, validateUpload } from '../files.api';

interface UploadItem {
  key: number;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
  stored?: StoredFile;
}

/**
 * Uploads picked or dropped files right away and exposes the uploaded ones through `files`,
 * so a form can send their ids (e.g. `[(files)]="mainFiles"`).
 */
@Component({
  selector: 'app-file-uploader',
  imports: [DecimalPipe, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './file-uploader.html',
  styleUrl: './file-uploader.scss',
})
export class FileUploader {
  private readonly api = inject(FilesApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly uploads = new Map<number, Subscription>();
  private nextKey = 0;

  readonly label = input.required<string>();
  readonly files = model<StoredFile[]>([]);

  /** True while any file is still uploading; the parent form should not submit yet. */
  readonly busy = computed(() => this.items().some((item) => item.status === 'uploading'));

  protected readonly accept = ACCEPT_ATTRIBUTE;
  protected readonly items = signal<UploadItem[]>([]);
  protected readonly dragging = signal(false);

  protected onPick(input: HTMLInputElement): void {
    this.handleFiles(input.files);
    // Reset so picking the same file again still fires `change`
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.handleFiles(event.dataTransfer?.files ?? null);
  }

  /** Removes the file from this form only; the uploaded file itself stays on the server. */
  protected remove(item: UploadItem): void {
    this.uploads.get(item.key)?.unsubscribe();
    this.uploads.delete(item.key);
    this.items.update((items) => items.filter((i) => i.key !== item.key));

    const storedId = item.stored?.id;
    if (storedId) {
      this.files.update((files) => files.filter((f) => f.id !== storedId));
    }
  }

  private handleFiles(files: FileList | null): void {
    for (const file of Array.from(files ?? [])) {
      this.start(file);
    }
  }

  private start(file: File): void {
    const item: UploadItem = {
      key: this.nextKey++,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading',
    };

    const problem = validateUpload(file);
    if (problem) {
      this.items.update((items) => [...items, { ...item, status: 'error', error: problem }]);
      return;
    }

    this.items.update((items) => [...items, item]);

    const subscription = this.api
      .upload(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.patch(item.key, { progress: Math.round((event.loaded / event.total) * 100) });
          } else if (event.type === HttpEventType.Response && event.body) {
            const stored = event.body;
            this.patch(item.key, { status: 'done', progress: 100, stored });
            this.files.update((files) => [...files, stored]);
            this.uploads.delete(item.key);
          }
        },
        error: (err) => {
          this.patch(item.key, { status: 'error', error: errorMessage(err) });
          this.uploads.delete(item.key);
        },
      });

    this.uploads.set(item.key, subscription);
  }

  private patch(key: number, changes: Partial<UploadItem>): void {
    this.items.update((items) => items.map((item) => (item.key === key ? { ...item, ...changes } : item)));
  }
}
