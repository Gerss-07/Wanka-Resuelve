import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../interfaces/auth.interface';
import { ModoDevService } from '../services/modo-dev.service';
import { destinoPermitido, inicioPorRol, SesionService } from '../services/sesion.service';

/** En SSR no hay localStorage: el servidor deja pasar y el navegador decide (como el ejemplo del profesor). */
const enServidor = () => !isPlatformBrowser(inject(PLATFORM_ID));

/**
 * Rol con el que se navega: el de la sesión real o, sin sesión y solo en desarrollo,
 * el del selector «Actuar como». La rama del modo dev se borra en F5 parte B.
 */
function rolActual(): Rol | null {
  const sesion = inject(SesionService);
  if (sesion.estaAutenticado()) return sesion.rol();
  const dev = inject(ModoDevService);
  if (!dev.activo) return null;
  return dev.rol() === 'operador' ? 'OPERADOR' : 'CIUDADANO';
}

/** Sin sesión, redirige a /login?destino=<url>. */
export const authGuard: CanActivateFn = (_ruta, estado) => {
  if (enServidor()) return true;
  return rolActual() !== null || inject(Router).createUrlTree(['/login'], { queryParams: { destino: estado.url } });
};

/** Con sesión real, no deja volver a /login ni a /registro. */
export const invitadoGuard: CanActivateFn = (ruta) => {
  if (enServidor()) return true;
  const sesion = inject(SesionService);
  const rol = sesion.rol();
  if (!sesion.estaAutenticado() || !rol) return true;
  const destino = ruta.queryParamMap.get('destino');
  return inject(Router).parseUrl(destinoPermitido(destino, rol) ? destino : inicioPorRol(rol));
};

/** Compara el rol con `data.rol` de la ruta; si no coincide, lleva al inicio de su rol. */
export const rolGuard: CanActivateFn = (ruta, estado) => {
  if (enServidor()) return true;
  const rol = rolActual();
  const router = inject(Router);
  if (!rol) return router.createUrlTree(['/login'], { queryParams: { destino: estado.url } });
  return rol === ruta.data['rol'] || router.parseUrl(inicioPorRol(rol));
};
