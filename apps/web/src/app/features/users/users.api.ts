import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { UserRole } from '../../core/auth/auth.service';

/** Body of `POST /users` (mirrors the API's CreateUserDto). */
export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
  org_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
}

/** Organization embedded in a user list item. */
export interface UserOrganization {
  id: string;
  name: string;
  tin: string;
}

/** Row of `GET /users`: organization is joined in, `null` for users without one (super admin). */
export interface UserListItem {
  id: string;
  username: string;
  role: UserRole;
  first_name: string;
  middle_name: string;
  last_name: string;
  created_at: string;
  organization: UserOrganization | null;
}

/** User as returned by `POST /users` (no password hash). */
export interface User {
  id: string;
  username: string;
  role: UserRole;
  org_id: string | null;
  first_name: string;
  middle_name: string;
  last_name: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);

  list(): Observable<UserListItem[]> {
    return this.http.get<UserListItem[] | null>('/api/users').pipe(
      map((users) => {
        // An empty body (e.g. a handler that forgets to `return`) arrives as null
        if (!Array.isArray(users)) {
          throw new Error('Unexpected response from GET /users: expected a list of users.');
        }
        return users;
      }),
    );
  }

  create(body: CreateUserRequest): Observable<User> {
    return this.http.post<User>('/api/users', body);
  }
}
