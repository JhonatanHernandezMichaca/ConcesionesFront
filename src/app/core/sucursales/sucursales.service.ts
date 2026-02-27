import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SucursalesService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

create(args: {
  concesion_id: string;
  zona_id: string;
  activo: boolean;
  cajas: string[];
}) {
  const params = new HttpParams()
    .set('concesion_id', args.concesion_id)
    .set('zona_id', args.zona_id);

  const body = {
    activo: args.activo,
    sucursal: { cajas: args.cajas },
  };

  return this.http.post<any>(`${this.base}/api/sucursales`, body, { params });
}

listByConcesion(concesion_id: string) {
  const params = new HttpParams().set('concesion_id', concesion_id);
  return this.http.get<any>(`${this.base}/api/sucursales`, { params });
}
}