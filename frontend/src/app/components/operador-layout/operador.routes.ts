import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Routes } from '@angular/router';
import { environment } from '../../../environments/environment';
import { crearInterceptorDesarrollo } from '../../interceptors/desarrollo.interceptor';
import { CatalogoService } from '../../services/catalogo.service';
import { OperadorService } from '../../services/operador.service';
import { ReporteService } from '../../services/reporte.service';

// Reutiliza el transporte temporal de F3 únicamente dentro del panel en desarrollo.
const dev = environment.devUsuarios;
const proveedoresDesarrollo = !environment.production && dev ? [
  provideHttpClient(withInterceptors([crearInterceptorDesarrollo({
    ...environment,
    devUsuarios: { ...dev, ciudadano: dev.operador },
  })])),
  CatalogoService, OperadorService, ReporteService,
] : [];

export const rutasOperador: Routes = [{
  path: '',
  providers: proveedoresDesarrollo,
  loadComponent: () => import('./operador-layout').then(m => m.OperadorLayout),
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'reportes' },
    {
      path: 'reportes',
      title: 'Bandeja de reportes · Wanka Resuelve',
      loadComponent: () => import('../bandeja-operador/bandeja-operador').then(m => m.BandejaOperador),
    },
    {
      path: 'reportes/:id',
      title: 'Revisión de reporte · Wanka Resuelve',
      loadComponent: () => import('../revision-operador/revision-operador').then(m => m.RevisionOperador),
    },
  ],
}];
