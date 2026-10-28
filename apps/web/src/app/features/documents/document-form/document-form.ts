import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/error-message';
import { HasUnsavedChanges } from '../../../core/ui/unsaved-changes.guard';
import { FileUploader } from '../../files/file-uploader/file-uploader';
import { FileRef } from '../../files/files.api';
import {
  CreateDocumentRequest,
  DOCUMENT_STATUS_LABELS,
  DocumentDetail,
  DocumentsApi,
  EDITABLE_STATUSES,
} from '../documents.api';

/** Create (`/documents/new`) and edit (`/documents/:id/edit`) share this form. */
@Component({
  selector: 'app-document-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    FileUploader,
  ],
  templateUrl: './document-form.html',
  styleUrl: './document-form.scss',
})
export class DocumentForm implements OnInit, HasUnsavedChanges {
  private readonly api = inject(DocumentsApi);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  // Optional queries: in edit mode the uploaders only exist once the document has loaded
  private readonly mainUploader = viewChild<FileUploader>('mainUploader');
  private readonly additionalUploader = viewChild<FileUploader>('additionalUploader');

  protected readonly documentId = inject(ActivatedRoute).snapshot.paramMap.get('id');
  protected readonly isEdit = this.documentId !== null;

  /** Limits match the `documents` table (document_number varchar(10), description varchar(150)). */
  protected readonly form = inject(NonNullableFormBuilder).group({
    document_number: ['', [Validators.required, Validators.maxLength(10), Validators.pattern(/\S/)]],
    description: ['', [Validators.required, Validators.maxLength(150), Validators.pattern(/\S/)]],
  });

  protected readonly mainFiles = signal<FileRef[]>([]);
  protected readonly additionalFiles = signal<FileRef[]>([]);

  protected readonly uploading = computed(
    () => !!this.mainUploader()?.busy() || !!this.additionalUploader()?.busy(),
  );

  protected readonly document = signal<DocumentDetail | null>(null);
  protected readonly loading = signal(this.isEdit);
  protected readonly loadError = signal<string | null>(null);

  /** The document exists but its status no longer allows editing (e.g. it was sent for approval). */
  protected readonly locked = computed(() => {
    const document = this.document();
    return !!document && !EDITABLE_STATUSES.includes(document.status);
  });

  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Set once saved, so leaving the page no longer asks for confirmation. */
  private saved = false;
  /** File ids as loaded, to tell whether the user changed the files. */
  private initialFiles = this.fileKey();

  ngOnInit(): void {
    if (this.isEdit) this.load();
  }

  hasUnsavedChanges(): boolean {
    if (this.saved || this.loading() || this.locked()) return false;
    return this.form.dirty || this.fileKey() !== this.initialFiles || this.uploading();
  }

  /** Browser-level navigation (refresh, closing the tab) can't use the in-app dialog. */
  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  protected statusLabel(): string {
    const status = this.document()?.status;
    return status ? DOCUMENT_STATUS_LABELS[status] : '';
  }

  protected load(): void {
    if (!this.documentId) return;

    this.loading.set(true);
    this.loadError.set(null);

    this.api.get(this.documentId).subscribe({
      next: (document) => {
        this.document.set(document);
        this.form.reset({
          document_number: document.document_number,
          description: document.description,
        });
        this.mainFiles.set(document.files.filter((f) => f.kind === 'MAIN'));
        this.additionalFiles.set(document.files.filter((f) => f.kind === 'ADDITIONAL'));
        this.initialFiles = this.fileKey();
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(errorMessage(err));
        this.loading.set(false);
      },
    });
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
    const body: CreateDocumentRequest = {
      document_number: document_number.trim().toUpperCase(),
      description: description.trim(),
      main_file_ids: this.mainFiles().map((f) => f.id),
      // On edit the lists replace the current links, so an empty list must be sent to clear them
      ...((additional.length > 0 || this.isEdit) && {
        additional_file_ids: additional.map((f) => f.id),
      }),
    };

    this.saving.set(true);
    this.form.disable();

    const request = this.documentId ? this.api.update(this.documentId, body) : this.api.create(body);

    request.subscribe({
      next: (document) => {
        this.saved = true;
        const message = this.isEdit
          ? `Saved changes to ${document.document_number}`
          : `Document ${document.document_number} created as a draft`;
        this.snackBar.open(message, undefined, { duration: 3000 });
        this.router.navigate(['/documents']);
      },
      error: (err) => {
        this.saving.set(false);
        this.form.enable();
        this.error.set(errorMessage(err));
      },
    });
  }

  private fileKey(): string {
    const ids = (files: FileRef[]) => files.map((f) => f.id).join(',');
    return `${ids(this.mainFiles())}|${ids(this.additionalFiles())}`;
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
