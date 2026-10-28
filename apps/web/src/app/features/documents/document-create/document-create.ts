import { Component, computed, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/error-message';
import { HasUnsavedChanges } from '../../../core/ui/unsaved-changes.guard';
import { FileUploader } from '../../files/file-uploader/file-uploader';
import { StoredFile } from '../../files/files.api';
import { DocumentsApi } from '../documents.api';

@Component({
  selector: 'app-document-create',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FileUploader,
  ],
  templateUrl: './document-create.html',
  styleUrl: './document-create.scss',
})
export class DocumentCreate implements HasUnsavedChanges {
  private readonly api = inject(DocumentsApi);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly mainUploader = viewChild.required<FileUploader>('mainUploader');
  private readonly additionalUploader = viewChild.required<FileUploader>('additionalUploader');

  /** Limits match the `documents` table (document_number varchar(10), description varchar(150)). */
  protected readonly form = inject(NonNullableFormBuilder).group({
    document_number: ['', [Validators.required, Validators.maxLength(10), Validators.pattern(/\S/)]],
    description: ['', [Validators.required, Validators.maxLength(150), Validators.pattern(/\S/)]],
  });

  protected readonly mainFiles = signal<StoredFile[]>([]);
  protected readonly additionalFiles = signal<StoredFile[]>([]);

  protected readonly uploading = computed(
    () => this.mainUploader().busy() || this.additionalUploader().busy(),
  );

  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Set once the document is created, so leaving the page no longer asks for confirmation. */
  private saved = false;

  hasUnsavedChanges(): boolean {
    if (this.saved) return false;
    return (
      this.form.dirty ||
      this.mainFiles().length > 0 ||
      this.additionalFiles().length > 0 ||
      this.uploading()
    );
  }

  /** Browser-level navigation (refresh, closing the tab) can't use the in-app dialog. */
  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  protected submit(): void {
    if (this.saving() || this.uploading()) return;

    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.error.set(null);

    if (this.form.invalid || this.mainFiles().length === 0) {
      this.focusFirstInvalid();
      return;
    }

    const { document_number, description } = this.form.getRawValue();
    const additional = this.additionalFiles();

    this.saving.set(true);
    this.form.disable();

    this.api
      .create({
        document_number: document_number.trim().toUpperCase(),
        description: description.trim(),
        main_file_ids: this.mainFiles().map((f) => f.id),
        ...(additional.length > 0 && { additional_file_ids: additional.map((f) => f.id) }),
      })
      .subscribe({
        next: (document) => {
          this.saved = true;
          this.snackBar.open(`Document ${document.document_number} created as a draft`, undefined, {
            duration: 3000,
          });
          this.router.navigate(['/documents']);
        },
        error: (err) => {
          this.saving.set(false);
          this.form.enable();
          this.error.set(errorMessage(err));
        },
      });
  }

  /** Moves focus (and scroll) to the first field the user still has to fix. */
  private focusFirstInvalid(): void {
    const root = this.host.nativeElement;
    const target =
      root.querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid') ??
      (this.mainFiles().length === 0 ? root.querySelector<HTMLElement>('#main-files button') : null);
    target?.focus();
  }
}
