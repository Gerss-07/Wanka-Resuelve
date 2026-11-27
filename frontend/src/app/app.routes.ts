import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';

const cargarReportes = () => import('./components/mis-reportes/mis-reportes').then(m => m.MisReportes);
const cargarFormulario = () => import('./components/reporte-form/reporte-form').then(m => m.ReporteForm);

export const routes: Routes = [
  { path: '', component: Inicio, pathMatch: 'full' },
  { path: 'login', title: 'Iniciar sesión · Wanka Resuelve', loadComponent: () => import('./components/login/login').then(m => m.Login) },
  { path: 'registro', title: 'Crear cuenta · Wanka Resuelve', loadComponent: () => import('./components/registro/registro').then(m => m.Registro) },
  {
    path: 'ciudadano',
    loadComponent: () => import('./components/layout/layout').then(m => m.Layout),
    children: [
      { path: 'reportes', title: 'Mis reportes · Wanka Resuelve', loadComponent: cargarReportes },
      { path: 'reportes/nuevo', title: 'Nuevo reporte · Wanka Resuelve', loadComponent: cargarFormulario },
      { path: 'reportes/:id/editar', title: 'Editar reporte · Wanka Resuelve', loadComponent: cargarFormulario },
      { path: 'reportes/:id', title: 'Detalle del reporte · Wanka Resuelve', loadComponent: () => import('./components/reporte-detalle/reporte-detalle').then(m => m.ReporteDetalle) },
    ],
  },
  {
    path: 'operador',
    loadComponent: () => import('./components/layout/layout').then(m => m.Layout),
    children: [
      { path: 'reportes', title: 'Bandeja · Wanka Resuelve', loadComponent: () => import('./components/bandeja-operador/bandeja-operador').then(m => m.BandejaOperador) },
      { path: 'reportes/:id', title: 'Revisión del reporte · Wanka Resuelve', loadComponent: () => import('./components/revision-operador/revision-operador').then(m => m.RevisionOperador) },
    ],
  },
  { path: '**', redirectTo: '' },
];
