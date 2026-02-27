import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { HomeComponent } from './features/home/home';
import { authGuard } from './core/auth/auth.guard';
import { CreateUserComponent } from './features/users/create-user/create-user.component';
import { CreateConcesionComponent } from './features/concesiones/create-concesion.component';
export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  // Home protegido
  { path: '', component: HomeComponent, canActivate: [authGuard] },
  { path: 'usuarios/nuevo', component: CreateUserComponent, canActivate: [authGuard] },
  { path: 'concesiones/nueva', component: CreateConcesionComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];