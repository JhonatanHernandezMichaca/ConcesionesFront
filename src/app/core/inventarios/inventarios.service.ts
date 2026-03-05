import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export type InventarioProductoPayload = {
  productId: string;
  cantidad_inicial: number;
  cantidad_final: number;
};

export type CreateInventarioBody = {
  productos: InventarioProductoPayload[];
};

type Envelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  errors?: any;
};

@Injectable({ providedIn: 'root' })
export class InventariosService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  createInventario(opts: {
    jornadaNumero: number;
    fechaJornada: string; // YYYY-MM-DD
    sucursalId?: string;
    productos: InventarioProductoPayload[];
  }): Observable<Envelope<any>> {
    const { jornadaNumero, fechaJornada, sucursalId, productos } = opts;

    const body: CreateInventarioBody = { productos };

    const url = `${this.baseUrl}/api/inventarios/jornadas/${jornadaNumero}/fechas/${fechaJornada}/sucursales/${sucursalId}`;
    return this.http.post<Envelope<any>>(url, body);
  }
}