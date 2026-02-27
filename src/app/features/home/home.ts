import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { ConcessionsService, Concesion } from '../../core/concessions/concessions.service';
import { ZonesService, Zona } from '../../core/zones/zones.service';
import { SucursalesService } from '../../core/sucursales/sucursales.service';
import { UsersService } from '../../core/users/users.service';
type Rol = 'SUPERADMIN' | 'ADMIN' | 'VENDEDOR' | string;



@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private concessions = inject(ConcessionsService);
  private fb = inject(FormBuilder);
  private zonesService = inject(ZonesService);
  private sucursalesService = inject(SucursalesService);
  private usersService = inject(UsersService);
  loading = true;
  me: any = null; 
  error = '';

  rol: Rol = '';
  isSuperadmin = false;
  isAdmin = false;

concesiones: Array<{
  rank: number;
  name: string;
  score: number;
  activo: boolean;
  id: string;
  idUser: string; // <-- NUEVO
}> = [];loadingConcesiones = false;
errorConcesiones = '';
// ===== Modal Agregar Sucursal =====
showSucursalModal = false;
selectedConcesion: { id: string; name: string; idUser: string } | null = null;
showSucursalForm = false;
encargadoNombre = '';
private userNameCache = new Map<string, string>();
sucLoading = false;
sucError = '';
sucOkMsg = '';
sucListLoading = false;
sucListError = '';
sucursalesDeConcesion: Array<{
  id: string;
  zona_id?: string;
  activo?: boolean;
  cajasCount: number;
}> = [];

// Por ahora estático (luego lo conectamos a la colección "zonas")
zonas: Zona[] = [];
loadingZonas = false;
errorZonas = '';

sucursalForm = this.fb.nonNullable.group({
  zona_id: ['', Validators.required],
  numeroCajas: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1), Validators.max(20)]),
});

  ngOnInit() {
    this.loading = true;

    this.auth.me().subscribe({
      next: (r) => {
  const me = (r as any)?.usuario ?? null; // el perfil real viene en r.usuario

  this.me = me;

  const rol = me?.rol ?? me?.role ?? '';
  this.rol = String(rol) as Rol;

 this.isSuperadmin = this.rol.toUpperCase() === 'SUPERADMIN';
this.isAdmin = this.rol.toUpperCase() === 'ADMIN';

this.loading = false;

if (this.isSuperadmin || this.isAdmin) {
  this.cargarConcesiones();
}

},

      error: (e) => {
        this.error = e?.error?.message || e?.message || 'Error en /me';
        this.loading = false;
      },
    });
  }
private cargarZonas() {
  this.loadingZonas = true;
  this.errorZonas = '';

  this.zonesService.list().subscribe({
    next: (r) => {
  const items = (r?.data ?? r) as Zona[];
  this.zonas = (items || []).filter(z => z.activo !== false);
  this.loadingZonas = false;
},
    error: (e) => {
      this.errorZonas = e?.error?.message || e?.message || 'Error cargando zonas';
      this.loadingZonas = false;
    },
  });
}

zonaNombrePorId(zonaId?: string): string {
  if (!zonaId) return '-';
  const z = this.zonas.find(x => x.id === zonaId);
  return z?.zona || '-';
}

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  agregarPersona() {
    // Ruta sugerida: después creamos el módulo de usuarios/altas
    this.router.navigateByUrl('/usuarios/nuevo');
  }
irNuevaConcesion() {
  this.router.navigateByUrl('/concesiones/nueva');
}
  private cargarConcesiones() {
  this.loadingConcesiones = true;
  this.errorConcesiones = '';

  this.concessions.list().subscribe({
    next: (items: Concesion[]) => {
      const meUid = this.me?.uid ?? this.me?.user_id ?? this.me?.userId ?? '';
let list = [...items];

if (this.isAdmin && meUid) {
  list = list.filter(c => (c.idUser || '') === meUid);
}
      // Rank basado en orden alfabético (puedes cambiarlo luego)
     const sorted = list.sort((a, b) =>
  String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')
);

 this.concesiones = sorted.map((c, i) => ({
  id: c.id,
  idUser: (c as any).idUser || '', // <-- NUEVO (viene de Firestore)
  activo: c.activo,
  rank: i + 1,
  name: c.nombre,
  score: typeof c.score === 'number' ? c.score : 0,
}));

      this.loadingConcesiones = false;
    },
    error: (e) => {
      this.errorConcesiones =
        e?.error?.message || e?.message || 'Error cargando concesiones';
      this.loadingConcesiones = false;
    },
  });
}
abrirSucursalModal(c: { id: string; name: string; idUser: string }) {
  this.selectedConcesion = { id: c.id, name: c.name, idUser: c.idUser };
  this.showSucursalModal = true;
  this.showSucursalForm = false;

  this.sucError = '';
  this.sucOkMsg = '';
  this.encargadoNombre = '';
  this.sucursalForm.reset({ zona_id: '', numeroCajas: 1 });

if (this.zonas.length === 0) {
  this.cargarZonas();
}

this.cargarSucursalesDeConcesion(c.id);
  const uid = c.idUser;
  if (!uid) return;

  const cached = this.userNameCache.get(uid);
  if (cached) {
    this.encargadoNombre = cached;
    return;
  }

  this.usersService.getByUid(uid).subscribe({
    next: (r: any) => {
      // Envelope: puede venir en data o usuario según tu API
      const u = r?.data ?? r?.usuario ?? null;
      const nombre = (u?.nombre || u?.name || uid).toString();
      this.userNameCache.set(uid, nombre);
      this.encargadoNombre = nombre;
    },
    error: () => {
      // fallback si falla
      this.encargadoNombre = uid;
    },
  });
  this.cargarSucursalesDeConcesion(c.id);
}

cerrarSucursalModal() {
  this.showSucursalModal = false;
  this.selectedConcesion = null;
  this.sucursalesDeConcesion = [];
this.sucListError = '';
this.sucListLoading = false;
}
refrescarSucursalesModal() {
  if (!this.selectedConcesion) return;
  this.cargarSucursalesDeConcesion(this.selectedConcesion.id);
}

abrirFormSucursal() {
  this.sucError = '';
  this.sucOkMsg = '';
  this.sucursalForm.reset({ zona_id: '', numeroCajas: 1 });
  this.showSucursalForm = true;

  if (this.zonas.length === 0) this.cargarZonas();
}

cancelarFormSucursal() {
  this.showSucursalForm = false;
  this.sucError = '';
  this.sucOkMsg = '';
  this.sucursalForm.reset({ zona_id: '', numeroCajas: 1 });
}
private cargarSucursalesDeConcesion(concesionId: string) {
  this.sucListLoading = true;
  this.sucListError = '';
  this.sucursalesDeConcesion = [];

  this.sucursalesService.listByConcesion(concesionId).subscribe({
    next: (r: any) => {
      const raw = r?.data ?? r?.items ?? r?.sucursales ?? r ?? [];
      const arr: any[] = Array.isArray(raw) ? raw : [];

      this.sucursalesDeConcesion = arr.map((x: any, idx: number) => ({
        id: x?.id ?? x?.uid ?? x?.docId ?? x?._id ?? String(idx),
        zona_id: x?.zona_id ?? x?.zonaId ?? x?.zona ?? '',
        activo: x?.activo ?? true,
        cajasCount: Array.isArray(x?.sucursal?.cajas) ? x.sucursal.cajas.length : (x?.cajasCount ?? 0),
      }));

      this.sucListLoading = false;
    },
    error: (e) => {
      this.sucListError = e?.error?.message || e?.message || 'Error cargando sucursales';
      this.sucListLoading = false;
    },
  });
}
guardarSucursal() {
  this.sucError = '';
  this.sucOkMsg = '';

  if (!this.selectedConcesion) return;

  this.sucursalForm.markAllAsTouched();
  if (this.sucursalForm.invalid || this.sucLoading) return;

  this.sucLoading = true;

  const v = this.sucursalForm.getRawValue();
const cajas = Array.from({ length: Number(v.numeroCajas) }, (_, i) => `CAJA ${i + 1}`);

this.sucursalesService.create({
  concesion_id: this.selectedConcesion.id,
  zona_id: v.zona_id,
  activo: true,
  cajas,
}).subscribe({
   next: () => {
  this.sucOkMsg = 'Sucursal creada.';
  this.sucLoading = false;

  // <-- RECARGA LISTA (para que se vea abajo en el modal)
  this.cargarSucursalesDeConcesion(this.selectedConcesion!.id);

  // Opcional: no cierres el modal tan rápido para que veas la lista
  // setTimeout(() => this.cerrarSucursalModal(), 450);
},
    error: (e) => {
console.log('STATUS', e?.status);
  console.log('ERROR BODY', e?.error);
  console.log('ERROR BODY STR', JSON.stringify(e?.error, null, 2));
  console.log('SENT VALUE', this.sucursalForm.getRawValue());      this.sucError = e?.error?.message || e?.message || 'No se pudo crear la sucursal.';
      this.sucLoading = false;
      
    },
  });
}
}