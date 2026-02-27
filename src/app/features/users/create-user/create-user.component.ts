import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UsersService, UserRole } from '../../../core/users/users.service';

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-user.component.html',
  styleUrl: './create-user.component.scss',
})
export class CreateUserComponent {
  private fb = inject(FormBuilder);
  private users = inject(UsersService);
  private router = inject(Router);

  loading = false;
  error = '';
  okMsg = '';

  roles: { value: UserRole; label: string }[] = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'VENDEDOR', label: 'Vendedor' },
    { value: 'SUPERADMIN', label: 'Superadmin' },
  ];

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    fecha_nacimiento: [''],
    rol: this.fb.nonNullable.control<UserRole>('VENDEDOR', Validators.required),
    activo: this.fb.nonNullable.control(true),
    password: [''], // si tu API lo requiere, lo mandamos; si no, se ignora
  });

  private normalizeDate(value: string): string {
  if (!value) return value;

  // si ya viene YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  // si viene DD/MM/YYYY
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }

  return value;
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

    this.users.create({
  nombre: v.nombre.trim(),
  email: v.email.trim().toLowerCase(),
  fecha_nacimiento: this.normalizeDate(v.fecha_nacimiento),
  rol: v.rol,
  activo: v.activo,
  password: v.password.trim(),
}).subscribe({
      next: (r: any) => {
        this.okMsg = 'Usuario creado correctamente.';
        this.loading = false;

        // regreso al home
        setTimeout(() => this.router.navigateByUrl('/'), 400);
      },
      error: (e) => {
        this.error =
          e?.error?.message ||
          e?.message ||
          'No se pudo crear el usuario.';
        this.loading = false;
      },
    });

    
  }

  cancelar() {
    this.router.navigateByUrl('/');
  }
}