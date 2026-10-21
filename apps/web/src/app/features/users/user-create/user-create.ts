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
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { UserRole } from '../../../core/auth/auth.service';
import { errorMessage } from '../../../core/http/error-message';
import { Organization, OrganizationsApi } from '../../organizations/organizations.api';
import { User, UsersApi } from '../users.api';

const EMPTY_PERSON = {
  last_name: '',
  first_name: '',
  middle_name: '',
  username: '',
  password: '',
};

@Component({
  selector: 'app-user-create',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './user-create.html',
  styleUrl: './user-create.scss',
})
export class UserCreate implements OnInit {
  private readonly usersApi = inject(UsersApi);
  private readonly organizationsApi = inject(OrganizationsApi);
  private readonly formDirective = viewChild.required(FormGroupDirective);

  protected readonly organizations = signal<Organization[]>([]);
  protected readonly orgsLoading = signal(true);
  protected readonly orgsError = signal<string | null>(null);

  /** Super admin creates heads and employees; super admins are not created from the UI. */
  protected readonly roles: { value: UserRole; label: string }[] = [
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'HEAD', label: 'Head of organization' },
  ];

  protected readonly form = inject(NonNullableFormBuilder).group({
    last_name: ['', [Validators.required, Validators.maxLength(50)]],
    first_name: ['', [Validators.required, Validators.maxLength(50)]],
    middle_name: ['', [Validators.required, Validators.maxLength(50)]],
    username: ['', [Validators.required, Validators.maxLength(30)]],
    password: ['', Validators.required],
    role: ['EMPLOYEE' as UserRole, Validators.required],
    org_id: ['', Validators.required],
  });

  protected readonly hidePassword = signal(true);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly created = signal<User | null>(null);

  ngOnInit(): void {
    this.loadOrganizations();
  }

  protected loadOrganizations(): void {
    this.orgsLoading.set(true);
    this.orgsError.set(null);

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

  protected organizationName(id: string): string | undefined {
    return this.organizations().find((org) => org.id === id)?.name;
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.created.set(null);

    const value = this.form.getRawValue();
    this.usersApi.create(value).subscribe({
      next: (user) => {
        this.loading.set(false);
        this.created.set(user);
        // Keep role and organization: handy when adding several users to one org.
        // resetForm also clears the "submitted" state so empty fields don't show errors.
        this.formDirective().resetForm({ ...this.form.getRawValue(), ...EMPTY_PERSON });
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}
