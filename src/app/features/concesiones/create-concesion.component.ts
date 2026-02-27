import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ConcessionsService } from '../../core/concessions/concessions.service';
import { UsersService } from '../../core/users/users.service';
@Component({
  selector: 'app-create-concesion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-concesion.component.html',
  styleUrl: './create-concesion.component.scss',
})
export class CreateConcesionComponent {
  private fb = inject(FormBuilder);
  private concessions = inject(ConcessionsService);
  private users = inject(UsersService);
  private router = inject(Router);

  loading = false;
  error = '';
  okMsg = '';

  usersLoading = false;
usersError = '';
usuarios: any[] = [];          // lista ADMIN activos
usuariosFiltrados: any[] = []; // lista filtrada por buscador
userQuery = '';
selectedUserLabel = '';  // texto visible cuando ya elegiste
dropdownOpen = false;
private blurTimer: any = null;

form = this.fb.nonNullable.group({
  nombre: ['', [Validators.required, Validators.minLength(2)]],
  activo: this.fb.nonNullable.control(true),
  idUser: ['', Validators.required], // encargado
  imagenesCsv: [''],                 // <-- NUEVO: input opcional (urls separadas por coma)
});
ngOnInit() {
  this.cargarAdmins();
}
private cargarAdmins() {
  this.usersLoading = true;
  this.usersError = '';

  this.users.list().subscribe({
    next: (r: any) => {
      const arr = (r?.data ?? []) as any[];

      const admins = (arr || [])
        .filter(u => (u?.activo ?? true) !== false)
        .filter(u => String(u?.rol ?? '').toUpperCase() === 'ADMIN')
        .sort((a, b) => String(a?.nombre ?? '').localeCompare(String(b?.nombre ?? ''), 'es'));

      this.usuarios = admins;
      this.usuariosFiltrados = admins;
      this.usersLoading = false;
    },
    error: (e: any) => {
      this.usersError = e?.error?.message || e?.message || 'Error cargando usuarios';
      this.usersLoading = false;
    },
  });
}

filtrarUsuarios(q: string) {
  this.userQuery = q;
  const term = (q || '').trim().toLowerCase();

  if (!term) {
    this.usuariosFiltrados = this.usuarios;
    return;
  }

  this.usuariosFiltrados = this.usuarios.filter(u =>
    String(u?.nombre ?? '').toLowerCase().includes(term) ||
    String(u?.email ?? '').toLowerCase().includes(term) ||
    String(u?.uid ?? '').toLowerCase().includes(term)
  );
}

onUserInput(value: string) {
  this.selectedUserLabel = '';   // si escribes, “desseleccionas” visualmente
  this.form.controls.idUser.setValue(''); // y limpias el uid
  this.filtrarUsuarios(value);
  this.dropdownOpen = true;
}

openUserDropdown() {
  this.dropdownOpen = true;
}

closeUserDropdown() {
  // delay pequeño para permitir click en opción
  this.blurTimer = setTimeout(() => (this.dropdownOpen = false), 120);
}

selectUser(u: any) {
  if (this.blurTimer) clearTimeout(this.blurTimer);

  this.form.controls.idUser.setValue(u.uid); // aquí guardas el uid real
  this.selectedUserLabel = u.email ? `${u.nombre} · ${u.email}` : u.nombre;

  this.userQuery = '';
  this.usuariosFiltrados = this.usuarios; // opcional: reset
  this.dropdownOpen = false;
}
  submit() {
    this.error = '';
    this.okMsg = '';

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const v = this.form.getRawValue();

const imagenes = (v.imagenesCsv || '')
  .split(',')
  .map(x => x.trim())
  .filter(Boolean)
  .filter(x => /^https?:\/\/\S+/i.test(x)); 

this.concessions.create(
  v.idUser,
  {
    nombre: v.nombre.trim(),
    activo: v.activo,
    imagenes: imagenes.length ? imagenes : undefined, // <-- opcional
  }
).subscribe({
      next: () => {
        this.okMsg = 'Concesión creada.';
        this.loading = false;
        setTimeout(() => this.router.navigateByUrl('/'), 300);
      },
    error: (e) => {
  console.log('CREATE CONCESSION STATUS:', e?.status);
  console.log('CREATE CONCESSION ERROR BODY:', e?.error);

  const msg = e?.error?.message || e?.message || 'No se pudo crear la concesión.';
  const errs = e?.error?.errors ? JSON.stringify(e.error.errors) : '';
  this.error = errs ? `${msg}: ${errs}` : msg;

  this.loading = false;
},
    });
  }

  cancelar() {
    this.router.navigateByUrl('/');
  }
}