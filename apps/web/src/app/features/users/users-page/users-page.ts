import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { AuthService, UserRole } from '../../../core/auth/auth.service';
import { errorMessage } from '../../../core/http/error-message';
import { ConfirmDialog, ConfirmDialogData } from '../../../core/ui/confirm-dialog/confirm-dialog';
import { UserEditDialog } from '../user-edit-dialog/user-edit-dialog';
import { UserListItem, UserOrganization, UsersApi } from '../users.api';

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super admin',
  HEAD: 'Head',
  EMPLOYEE: 'Employee',
};

@Component({
  selector: 'app-users-page',
  imports: [
    RouterLink,
    DatePipe,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
    MatMenuModule,
  ],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
})
export class UsersPage implements OnInit {
  private readonly usersApi = inject(UsersApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['name', 'username', 'role', 'organization', 'created_at', 'actions'];

  protected readonly users = signal<UserListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly search = signal('');
  protected readonly orgFilter = signal<string>('');

  /** Organizations that have at least one user, for the filter dropdown. */
  protected readonly organizations = computed(() => {
    const byId = new Map<string, UserOrganization>();
    for (const user of this.users()) {
      if (user.organization) byId.set(user.organization.id, user.organization);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly filteredUsers = computed(() => {
    const query = this.search().trim().toLowerCase();
    const orgId = this.orgFilter();

    return this.users().filter((user) => {
      if (orgId && user.organization?.id !== orgId) return false;
      if (!query) return true;
      return [this.fullName(user), user.username, user.organization?.name ?? ''].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.usersApi.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected fullName(user: UserListItem): string {
    return [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ');
  }

  protected roleLabel(user: UserListItem): string {
    return ROLE_LABELS[user.role] ?? user.role;
  }

  /** Super admins (including yourself) can't be edited or deleted from here; the API refuses it too. */
  protected canManage(user: UserListItem): boolean {
    return user.role !== 'SUPER_ADMIN' && user.id !== this.auth.user()?.sub;
  }

  protected edit(user: UserListItem): void {
    this.dialog
      .open(UserEditDialog, { data: user, width: '640px', maxWidth: 'calc(100vw - 32px)', autoFocus: 'first-tabbable' })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.snackBar.open(`Saved changes to ${user.username}`, undefined, { duration: 3000 });
        this.load();
      });
  }

  protected confirmDelete(user: UserListItem): void {
    const data: ConfirmDialogData = {
      title: 'Delete user?',
      message: `${this.fullName(user)} (${user.username}) will no longer be able to log in.`,
      confirmLabel: 'Delete',
      destructive: true,
      action: () => this.usersApi.delete(user.id),
    };

    this.dialog
      .open(ConfirmDialog, { data, width: '440px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((deleted) => {
        if (!deleted) return;
        this.users.update((users) => users.filter((u) => u.id !== user.id));
        this.snackBar.open(`Deleted ${user.username}`, undefined, { duration: 3000 });
      });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.orgFilter.set('');
  }
}
