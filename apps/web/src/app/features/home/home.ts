import { DatePipe, JsonPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../core/auth/auth.service';

/** Temporary landing page: shows who is logged in and the decoded token. */
@Component({
  selector: 'app-home',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatCardModule, JsonPipe, DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly auth = inject(AuthService);

  protected readonly fullName = computed(() => {
    const user = this.auth.user();
    return user ? [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ') : '';
  });

  protected readonly expiresAt = computed(() => {
    const exp = this.auth.user()?.exp;
    return exp ? new Date(exp * 1000) : null;
  });
}
