import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'VENDEDOR';

export type CreateUserBody = {
  email: string;
  password?: string;          // si tu API pide password (temporal)
  nombre: string;
  rol: UserRole;
  activo: boolean;
  fecha_nacimiento?: string;  // "YYYY-MM-DD"
};

type Envelope<T> = { success: boolean; data?: T; usuario?: T; message?: string };

@Injectable({ providedIn: 'root' })
export class UsersService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  create(body: CreateUserBody) {
    return this.http.post<Envelope<any>>(`${this.baseUrl}/api/users`, body);
  }

  list() {
    return this.http.get<Envelope<any>>(`${this.baseUrl}/api/users`);
  }
    getByUid(uid: string) {
    return this.http.get<Envelope<any>>(`${this.baseUrl}/api/users/${uid}`);
  }
}