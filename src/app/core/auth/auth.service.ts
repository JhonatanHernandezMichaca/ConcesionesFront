import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';

type LoginBody = { email: string; password: string };

// Ajusta si tu backend devuelve otra propiedad (accessToken, data.token, etc.)
type LoginResponse = { token: string; user?: any };

export type MeUsuario = {
  uid: string;
  email: string;
  nombre?: string;
  name?: string;
  rol?: 'SUPERADMIN' | 'ADMIN' | 'VENDEDOR' | string;
  role?: 'SUPERADMIN' | 'ADMIN' | 'VENDEDOR' | string;
  activo?: boolean;

  // flags que vienen en tu response
  superAdmin?: boolean;
  isSuperAdmin?: boolean;
  admin?: boolean;
  isAdmin?: boolean;

  fecha_nacimiento?: string;
};

export type MeEnvelope = {
  success: boolean;
  usuario: MeUsuario;
};

const TOKEN_KEY = 'pv_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = environment.apiBaseUrl;

  token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  constructor(private http: HttpClient) {}

  // POST /api/auth/login/password
  login(body: LoginBody) {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/api/auth/login/password`, body)
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.token);
          this.token.set(res.token);
        })
      );
  }

  // GET /api/auth/me
  me() {
return this.http.get<MeEnvelope>(`${this.baseUrl}/api/auth/me`);  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
  }

  getToken() {
    return this.token();
  }

  isLoggedIn() {
    return !!this.token();
  }
}