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
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/error-message';
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
  ],
  templateUrl: './organizations-page.html',
  styleUrl: './organizations-page.scss',
})
export class OrganizationsPage implements OnInit {
  private readonly api = inject(OrganizationsApi);
  private readonly formDirective = viewChild.required(FormGroupDirective);

  protected readonly columns = ['name', 'tin', 'created_at'];

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
}
