import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
export type Concesion = {
  id: string;
  nombre: string;
  activo: boolean;
  idUser?: string;   // <-- NUEVO (encargado)
  score?: number;
};

// Respuesta flexible: porque no sabemos si viene {success, data} o {success, concesiones} etc.
type ConcesionesEnvelope = {
  success?: boolean;
  data?: any;
  concesiones?: any;
  items?: any;
};
export type CreateConcesionBody = {
  nombre: string;
  activo: boolean;
  imagenes?: string[];
};

type Envelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};
@Injectable({ providedIn: 'root' })
export class ConcessionsService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  list(): Observable<Concesion[]> {
    return this.http
      .get<ConcesionesEnvelope | any>(`${this.baseUrl}/api/concessions`)
      .pipe(
        map((r: any) => {
          // soporta varios formatos comunes
          const raw =
            r?.data ??
            r?.concesiones ??
            r?.items ??
            r?.results ??
            r;

          const arr: any[] = Array.isArray(raw) ? raw : [];

        return arr.map((x: any, idx: number) => ({
  id: x?.id ?? x?.uid ?? x?.docId ?? x?._id ?? String(idx),
  nombre: x?.nombre ?? x?.name ?? 'SIN NOMBRE',
  activo: !!(x?.activo ?? x?.active ?? true),
  idUser: x?.idUser ?? x?.userId ?? x?.encargadoId ?? x?.uidUser ?? undefined, // <-- NUEVO
  score: typeof x?.score === 'number' ? x.score : undefined,
})) as Concesion[];
        })
      );
  }
create(idUser: string, body: CreateConcesionBody) {
  const params = new HttpParams().set('idUser', idUser);

  return this.http.post<Envelope<any>>(
    `${this.baseUrl}/api/concessions`,
    body,
    { params }
  );
}
}