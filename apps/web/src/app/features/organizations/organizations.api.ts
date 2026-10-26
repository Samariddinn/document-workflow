import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/** Body of `POST /organizations` (mirrors the API's OrganizationCreateDto). */
export interface CreateOrganizationRequest {
  name: string;
  tin: string;
}

/** Body of `PATCH /organizations/:id`: only the fields being changed. */
export type UpdateOrganizationRequest = Partial<CreateOrganizationRequest>;

/** Organization row as returned by the API. */
export interface Organization {
  id: string;
  name: string;
  tin: string;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizationsApi {
  private readonly http = inject(HttpClient);

  /** Sorted by name on the server. */
  list(): Observable<Organization[]> {
    return this.http.get<Organization[]>('/api/organizations');
  }

  create(body: CreateOrganizationRequest): Observable<Organization> {
    return this.http.post<Organization>('/api/organizations', body);
  }

  update(id: string, body: UpdateOrganizationRequest): Observable<unknown> {
    return this.http.patch(`/api/organizations/${id}`, body);
  }

  /** Soft-deletes the organization and all of its users (server side, in one transaction). */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/organizations/${id}`);
  }
}
