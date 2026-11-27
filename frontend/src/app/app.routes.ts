import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';

const cargarReportes = () => import('./components/mis-reportes/mis-reportes').then(m => m.MisReportes);
const cargarFormulario = () => import('./components/reporte-form/reporte-form').then(m => m.ReporteForm);
const cargarAcceso = () => import('./components/acceso/acceso').then(m => m.Acceso);

export const routes: Routes = [
  { path: '', component: Inicio, pathMatch: 'full' },
  { path: 'login', title: 'Iniciar sesión · Wanka Resuelve', loadComponent: cargarAcceso },
  { path: 'registro', title: 'Crear cuenta · Wanka Resuelve', loadComponent: cargarAcceso, data: { registro: true } },
  {
    path: 'ciudadano',
    loadComponent: () => import('./components/layout/layout').then(m => m.Layout),
    children: [
      { path: '', pathMatch: 'full', title: 'Panel ciudadano · Wanka Resuelve', loadComponent: cargarReportes, data: { vista: 'inicio' } },
      { path: 'reportes', title: 'Mis reportes · Wanka Resuelve', loadComponent: cargarReportes },
      { path: 'seguimiento', title: 'Seguimiento · Wanka Resuelve', loadComponent: cargarReportes, data: { vista: 'seguimiento' } },
      { path: 'reportes/nuevo', title: 'Nuevo reporte · Wanka Resuelve', loadComponent: cargarFormulario },
      { path: 'reportes/:id/editar', title: 'Editar reporte · Wanka Resuelve', loadComponent: cargarFormulario },
      { path: 'reportes/:id', title: 'Detalle del reporte · Wanka Resuelve', loadComponent: () => import('./components/reporte-detalle/reporte-detalle').then(m => m.ReporteDetalle) },
    ],
  },
  { path: '**', redirectTo: '' },
];
