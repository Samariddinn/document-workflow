import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import {
  FormGroupDirective,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/error-message';
import { ConfirmDialog, ConfirmDialogData } from '../../../core/ui/confirm-dialog/confirm-dialog';
import { OrganizationEditDialog } from '../organization-edit-dialog/organization-edit-dialog';
import { Organization, OrganizationsApi } from '../organizations.api';

@Component({
  selector: 'app-organizations-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatMenuModule,
  ],
  templateUrl: './organizations-page.html',
  styleUrl: './organizations-page.scss',
})
export class OrganizationsPage implements OnInit {
  private readonly api = inject(OrganizationsApi);
  private readonly formDirective = viewChild.required(FormGroupDirective);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['name', 'tin', 'created_at', 'actions'];

  protected readonly organizations = signal<Organization[]>([]);
  protected readonly listLoading = signal(true);
  protected readonly listError = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/)]],
    tin: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
  });

  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly created = signal<Organization | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.listLoading.set(true);
    this.listError.set(null);

    this.api.list().subscribe({
      next: (orgs) => {
        this.organizations.set(orgs);
        this.listLoading.set(false);
      },
      error: (err: unknown) => {
        this.listError.set(errorMessage(err));
        this.listLoading.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.created.set(null);

    const { name, tin } = this.form.getRawValue();
    this.api.create({ name: name.trim(), tin }).subscribe({
      next: (org) => {
        this.saving.set(false);
        this.created.set(org);
        // resetForm also clears the "submitted" state so fields don't show errors
        this.formDirective().resetForm();
        this.organizations.update((orgs) =>
          [...orgs, org].sort((a, b) => a.name.localeCompare(b.name)),
        );
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.saveError.set(errorMessage(err));
      },
    });
  }

  protected edit(org: Organization): void {
    this.dialog
      .open(OrganizationEditDialog, { data: org, width: '480px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.snackBar.open('Organization updated', undefined, { duration: 3000 });
        this.load();
      });
  }

  protected confirmDelete(org: Organization): void {
    const data: ConfirmDialogData = {
      title: `Delete ${org.name}?`,
      message:
        'All users of this organization will be deleted too and will no longer be able to log in. This cannot be undone from the app.',
      confirmLabel: 'Delete organization',
      destructive: true,
      action: () => this.api.delete(org.id),
    };

    this.dialog
      .open(ConfirmDialog, { data, width: '460px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((deleted) => {
        if (!deleted) return;
        this.organizations.update((orgs) => orgs.filter((o) => o.id !== org.id));
        if (this.created()?.id === org.id) this.created.set(null);
        this.snackBar.open(`Deleted ${org.name}`, undefined, { duration: 3000 });
      });
  }
}
