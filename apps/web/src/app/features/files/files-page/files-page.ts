import { DecimalPipe } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { errorMessage } from '../../../core/http/error-message';
import {
  ACCEPT_ATTRIBUTE,
  FilesApi,
  MAX_FILE_SIZE,
  StoredFile,
  validateUpload,
} from '../files.api';

interface UploadItem {
  id: number;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
  result?: StoredFile;
  downloading?: boolean;
  downloadError?: string;
}

@Component({
  selector: 'app-files-page',
  imports: [
    RouterLink,
    DecimalPipe,
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './files-page.html',
  styleUrl: './files-page.scss',
})
export class FilesPage {
  private readonly api = inject(FilesApi);
  private readonly subscriptions = new Subscription();
  private nextId = 0;

  protected readonly accept = ACCEPT_ATTRIBUTE;
  protected readonly maxSizeMb = MAX_FILE_SIZE / 1024 / 1024;
  protected readonly uploads = signal<UploadItem[]>([]);
  protected readonly dragging = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.subscriptions.unsubscribe());
  }

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

  protected download(item: UploadItem): void {
    const stored = item.result;
    if (!stored || item.downloading) return;

    this.patch(item.id, { downloading: true, downloadError: undefined });

    this.subscriptions.add(
      this.api.download(stored.id).subscribe({
        next: (blob) => {
          this.saveBlob(blob, stored.name);
          this.patch(item.id, { downloading: false });
        },
        error: (err) =>
          this.patch(item.id, { downloading: false, downloadError: errorMessage(err) }),
      }),
    );
  }

  protected clearFinished(): void {
    this.uploads.update((items) => items.filter((item) => item.status === 'uploading'));
  }

  protected hasFinished(): boolean {
    return this.uploads().some((item) => item.status !== 'uploading');
  }

  private handleFiles(files: FileList | null): void {
    for (const file of Array.from(files ?? [])) {
      this.start(file);
    }
  }

  private start(file: File): void {
    const item: UploadItem = {
      id: this.nextId++,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading',
    };

    const problem = validateUpload(file);
    if (problem) {
      this.uploads.update((items) => [{ ...item, status: 'error', error: problem }, ...items]);
      return;
    }

    this.uploads.update((items) => [item, ...items]);

    this.subscriptions.add(
      this.api.upload(file).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.patch(item.id, { progress: Math.round((event.loaded / event.total) * 100) });
          } else if (event.type === HttpEventType.Response && event.body) {
            this.patch(item.id, { status: 'done', progress: 100, result: event.body });
          }
        },
        error: (err) => this.patch(item.id, { status: 'error', error: errorMessage(err) }),
      }),
    );
  }

  /** Triggers the browser's "save file" through a temporary link to the downloaded bytes. */
  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private patch(id: number, changes: Partial<UploadItem>): void {
    this.uploads.update((items) =>
      items.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }
}
