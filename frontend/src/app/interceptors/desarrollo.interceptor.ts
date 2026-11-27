import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { ModoDevService } from '../services/modo-dev.service';

type ConfigDev = { production: boolean; apiUrl: string; devUsuarios: { ciudadano: number; operador: number } | null };

// Solo para la API de desarrollo configurada; nunca añade la cabecera en producción. Se elimina en F5.
export function crearInterceptorDesarrollo(config: ConfigDev, idActual: () => number | null): HttpInterceptorFn {
  return (request, next) => {
    const id = idActual();
    if (!config.production && config.devUsuarios && config.apiUrl && id !== null &&
        (request.url === config.apiUrl || request.url.startsWith(config.apiUrl + '/'))) {
      return next(request.clone({ setHeaders: { 'X-Dev-Usuario-Id': String(id) } }));
    }
    return next(request);
  };
}

export const desarrolloInterceptor: HttpInterceptorFn = (request, next) => {
  const dev = inject(ModoDevService);
  return crearInterceptorDesarrollo(environment, () => dev.id())(request, next);
};
