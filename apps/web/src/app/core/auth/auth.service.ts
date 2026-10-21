import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export type UserRole = 'SUPER_ADMIN' | 'HEAD' | 'EMPLOYEE';

/** Claims the API puts into the access token. */
export interface TokenPayload {
  sub: string;
  role: UserRole;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  iat?: number;
  exp?: number;
}

const TOKEN_KEY = 'dw.accessToken';

function decodeToken(token: string): TokenPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

function isExpired(payload: TokenPayload): boolean {
  return payload.exp !== undefined && payload.exp * 1000 <= Date.now();
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(this.readStoredToken());

  readonly token = this._token.asReadonly();
  readonly user = computed(() => {
    const token = this._token();
    return token ? decodeToken(token) : null;
  });
  readonly isLoggedIn = computed(() => {
    const user = this.user();
    return user !== null && !isExpired(user);
  });

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', body).pipe(
      tap(({ accessToken }) => {
        localStorage.setItem(TOKEN_KEY, accessToken);
        this._token.set(accessToken);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
    this.router.navigate(['/login']);
  }

  private readStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
}
