import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Zona {
  id: string;
  zona: string;   // "ORIENTE" | "PONIENTE"
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class ZonesService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

list() {
  return this.http.get<any>(`${this.base}/api/zonas`);
}
}