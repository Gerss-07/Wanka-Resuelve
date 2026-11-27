import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

// Solo para la API de desarrollo configurada; nunca añade la cabecera en producción.
export function crearInterceptorDesarrollo(config: { production: boolean; apiUrl: string; devUsuarios: { ciudadano: number; operador: number } | null }): HttpInterceptorFn {
  return (request, next) => {
    if (!config.production && config.devUsuarios && config.apiUrl &&
        (request.url === config.apiUrl || request.url.startsWith(config.apiUrl + '/'))) {
      return next(request.clone({ setHeaders: { 'X-Dev-Usuario-Id': String(config.devUsuarios.ciudadano) } }));
    }
    return next(request);
  };
}

export const desarrolloInterceptor: HttpInterceptorFn = crearInterceptorDesarrollo(environment);
