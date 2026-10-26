import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { UserRole } from '../../../core/auth/auth.service';
import { errorMessage } from '../../../core/http/error-message';
import { Organization, OrganizationsApi } from '../../organizations/organizations.api';
import { UpdateUserRequest, UserListItem, UsersApi } from '../users.api';

type EditableField = keyof Required<UpdateUserRequest>;

@Component({
  selector: 'app-user-edit-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './user-edit-dialog.html',
  styleUrl: './user-edit-dialog.scss',
})
export class UserEditDialog implements OnInit {
  protected readonly user = inject<UserListItem>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<UserEditDialog, boolean>>(MatDialogRef);
  private readonly usersApi = inject(UsersApi);
  private readonly organizationsApi = inject(OrganizationsApi);

  protected readonly roles: { value: UserRole; label: string }[] = [
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'HEAD', label: 'Head of organization' },
  ];

  private readonly initial = {
    last_name: this.user.last_name,
    first_name: this.user.first_name,
    middle_name: this.user.middle_name,
    username: this.user.username,
    role: this.user.role,
    org_id: this.user.organization?.id ?? '',
  };

  protected readonly form = inject(NonNullableFormBuilder).group({
    last_name: [this.initial.last_name, [Validators.required, Validators.maxLength(50)]],
    first_name: [this.initial.first_name, [Validators.required, Validators.maxLength(50)]],
    middle_name: [this.initial.middle_name, [Validators.required, Validators.maxLength(50)]],
    username: [this.initial.username, [Validators.required, Validators.maxLength(30)]],
    role: [this.initial.role, Validators.required],
    org_id: [this.initial.org_id, Validators.required],
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** Only the fields that differ from the user's current values. */
  protected readonly changes = computed<UpdateUserRequest>(() => {
    this.formValue();
    const value = this.form.getRawValue();
    const changes: Record<string, string> = {};
    for (const key of Object.keys(this.initial) as EditableField[]) {
      if (value[key] !== this.initial[key]) changes[key] = value[key];
    }
    return changes as UpdateUserRequest;
  });

  protected readonly hasChanges = computed(() => Object.keys(this.changes()).length > 0);

  protected readonly organizations = signal<Organization[]>([]);
  protected readonly orgsLoading = signal(true);
  protected readonly orgsError = signal<string | null>(null);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.organizationsApi.list().subscribe({
      next: (orgs) => {
        this.organizations.set(orgs);
        this.orgsLoading.set(false);
      },
      error: (err: unknown) => {
        this.orgsError.set(errorMessage(err));
        this.orgsLoading.set(false);
      },
    });
  }

  protected save(): void {
    if (this.form.invalid || this.saving() || !this.hasChanges()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;

    this.usersApi.update(this.user.id, this.changes()).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(errorMessage(err));
        this.dialogRef.disableClose = false;
      },
    });
  }
}
