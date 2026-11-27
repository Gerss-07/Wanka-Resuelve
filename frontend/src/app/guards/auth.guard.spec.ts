import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ActivatedRouteSnapshot, convertToParamMap, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { ModoDevService } from '../services/modo-dev.service';
import { SesionService } from '../services/sesion.service';
import { sesionDePrueba } from '../services/sesion.service.spec';
import { authGuard, invitadoGuard, rolGuard } from './auth.guard';

const ruta = (data: object = {}, query: Record<string, string> = {}) =>
  ({ data, queryParamMap: convertToParamMap(query) }) as unknown as ActivatedRouteSnapshot;
const estado = (url: string) => ({ url }) as RouterStateSnapshot;

function preparar(opciones: { servidor?: boolean; dev?: 'ciudadano' | 'operador' | null } = {}) {
  localStorage.clear();
  const dev = opciones.dev === undefined ? null : opciones.dev;
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      ...(opciones.servidor ? [{ provide: PLATFORM_ID, useValue: 'server' }] : []),
      { provide: ModoDevService, useValue: { activo: dev !== null, rol: () => dev } },
    ],
  });
}
const ejecutar = (guard: typeof authGuard, r: ActivatedRouteSnapshot, url: string) =>
  TestBed.runInInjectionContext(() => guard(r, estado(url)));
const texto = (resultado: unknown) => TestBed.inject(Router).serializeUrl(resultado as UrlTree);

describe('guards', () => {
  it('authGuard: sin sesión lleva a /login con el destino', () => {
    preparar();
    expect(texto(ejecutar(authGuard, ruta(), '/ciudadano/reportes/nuevo'))).toBe('/login?destino=%2Fciudadano%2Freportes%2Fnuevo');
    TestBed.inject(SesionService).guardar(sesionDePrueba());
    expect(ejecutar(authGuard, ruta(), '/ciudadano/reportes')).toBe(true);
  });

  it('rolGuard: compara con data.rol y manda al inicio de su rol', () => {
    preparar();
    TestBed.inject(SesionService).guardar(sesionDePrueba('CIUDADANO'));
    expect(ejecutar(rolGuard, ruta({ rol: 'CIUDADANO' }), '/ciudadano/reportes')).toBe(true);
    expect(texto(ejecutar(rolGuard, ruta({ rol: 'OPERADOR' }), '/operador/reportes'))).toBe('/ciudadano/reportes');
  });

  it('invitadoGuard: con sesión no deja volver a login; respeta un destino permitido', () => {
    preparar();
    expect(ejecutar(invitadoGuard, ruta(), '/login')).toBe(true);
    TestBed.inject(SesionService).guardar(sesionDePrueba('OPERADOR'));
    expect(texto(ejecutar(invitadoGuard, ruta(), '/login'))).toBe('/operador/reportes');
    expect(texto(ejecutar(invitadoGuard, ruta({}, { destino: '/operador/reportes/4' }), '/login'))).toBe('/operador/reportes/4');
    expect(texto(ejecutar(invitadoGuard, ruta({}, { destino: '/ciudadano/reportes' }), '/login'))).toBe('/operador/reportes');
  });

  it('en el servidor (SSR) devuelven true', () => {
    preparar({ servidor: true });
    expect(ejecutar(authGuard, ruta(), '/ciudadano/reportes')).toBe(true);
    expect(ejecutar(rolGuard, ruta({ rol: 'OPERADOR' }), '/operador/reportes')).toBe(true);
    expect(ejecutar(invitadoGuard, ruta(), '/login')).toBe(true);
  });

  it('sin sesión y en desarrollo usan la identidad del selector', () => {
    preparar({ dev: 'operador' });
    expect(ejecutar(authGuard, ruta(), '/operador/reportes')).toBe(true);
    expect(ejecutar(rolGuard, ruta({ rol: 'OPERADOR' }), '/operador/reportes')).toBe(true);
    expect(texto(ejecutar(rolGuard, ruta({ rol: 'CIUDADANO' }), '/ciudadano/reportes'))).toBe('/operador/reportes');
    expect(ejecutar(invitadoGuard, ruta(), '/login')).toBe(true);
  });
});
