import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';

export type Product = {
  id: string;
  concesion_id?: string;
  nombre: string;
  precio?: number;
  unidad_medida?: string;
  imagenes?: string[];
  activo?: boolean;
};

type Envelope<T> = {
  success?: boolean;
  data?: T;
  items?: T;
  results?: T;
  message?: string;
};

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  listByConcesion(concesionId: string): Observable<Product[]> {
    return this.http
      .get<Envelope<any> | any>(`${this.baseUrl}/api/concessions/${concesionId}/products`)
      .pipe(
        map((r: any) => {
          const raw = r?.data ?? r?.items ?? r?.results ?? r ?? [];
          const arr: any[] = Array.isArray(raw) ? raw : [];

          return arr.map((x: any, idx: number) => ({
            id: x?.id ?? x?.productId ?? x?.uid ?? x?.docId ?? x?._id ?? String(idx),
            concesion_id: x?.concesion_id ?? x?.concesionId ?? x?.concession_id,
            nombre: x?.nombre ?? x?.name ?? 'SIN NOMBRE',
            precio: typeof x?.precio === 'number' ? x.precio : (x?.precio ? Number(x.precio) : undefined),
            unidad_medida: x?.unidad_medida ?? x?.unidad ?? x?.unit,
            imagenes: Array.isArray(x?.imagenes) ? x.imagenes : undefined,
            activo: x?.activo ?? x?.active ?? true,
          })) as Product[];
        })
      );
  }
  createInConcesion(concesionId: string, body: {
  nombre: string;
  unidad_medida: string;
  precio: number;
  imagenes?: string[];
  activo: boolean;
}) {
  return this.http.post<any>(`${this.baseUrl}/api/concessions/${concesionId}/products`, body);
}
}