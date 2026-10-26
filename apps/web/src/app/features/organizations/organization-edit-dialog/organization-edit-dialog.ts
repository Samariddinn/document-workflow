import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { errorMessage } from '../../../core/http/error-message';
import { Organization, OrganizationsApi, UpdateOrganizationRequest } from '../organizations.api';

@Component({
  selector: 'app-organization-edit-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './organization-edit-dialog.html',
  styleUrl: './organization-edit-dialog.scss',
})
export class OrganizationEditDialog {
  protected readonly organization = inject<Organization>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<OrganizationEditDialog, boolean>>(MatDialogRef);
  private readonly api = inject(OrganizationsApi);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [
      this.organization.name,
      [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/)],
    ],
    tin: [this.organization.tin, [Validators.required, Validators.pattern(/^\d{9}$/)]],
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** Only the fields that differ from the organization's current values. */
  protected readonly changes = computed<UpdateOrganizationRequest>(() => {
    this.formValue();
    const { name, tin } = this.form.getRawValue();
    const changes: UpdateOrganizationRequest = {};
    if (name.trim() !== this.organization.name) changes.name = name.trim();
    if (tin !== this.organization.tin) changes.tin = tin;
    return changes;
  });

  protected readonly hasChanges = computed(() => Object.keys(this.changes()).length > 0);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected save(): void {
    if (this.form.invalid || this.saving() || !this.hasChanges()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;

    this.api.update(this.organization.id, this.changes()).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(errorMessage(err));
        this.dialogRef.disableClose = false;
      },
    });
  }
}
