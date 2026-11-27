import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { SesionService } from '../services/sesion.service';

/** Solo las peticiones a nuestra API llevan el token (nunca a otros dominios). */
export function esApi(url: string, apiUrl = environment.apiUrl): boolean {
  return !!apiUrl && (url === apiUrl || url.startsWith(apiUrl + '/'));
}

/** Agrega Authorization: Bearer y, ante un 401, cierra la sesión y lleva a /login (sección 10). */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  if (!esApi(request.url)) return next(request);
  const token = sesion.token();
  const peticion = token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !request.url.startsWith(`${environment.apiUrl}/auth/login`)) {
        sesion.cerrar();
        const actual = router.url;
        const conDestino = actual !== '/' && !actual.startsWith('/login') && !actual.startsWith('/registro');
        void router.navigate(['/login'], conDestino ? { queryParams: { destino: actual } } : {});
      }
      return throwError(() => error);
    }),
  );
};
