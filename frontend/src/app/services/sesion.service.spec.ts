import { TestBed } from '@angular/core/testing';
import { Sesion } from '../interfaces/auth.interface';
import { CLAVE_SESION, destinoPermitido, inicioPorRol, SesionService } from './sesion.service';

export function sesionDePrueba(rol: Sesion['rol'] = 'CIUDADANO', minutos = 60): Sesion {
  return { token: 'token-de-prueba', rol, expira: Date.now() + minutos * 60_000, usuario: { id: 3, nombre: 'Ana Demo', correo: 'ana@demo.test', rol } };
}

describe('SesionService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('guarda y recupera token, usuario, rol y expiración', () => {
    TestBed.inject(SesionService).guardar(sesionDePrueba());
    expect(JSON.parse(localStorage.getItem(CLAVE_SESION)!).token).toBe('token-de-prueba');
    TestBed.resetTestingModule();
    const sesion = TestBed.inject(SesionService);
    expect(sesion.estaAutenticado()).toBe(true);
    expect(sesion.token()).toBe('token-de-prueba');
    expect(sesion.usuario()?.nombre).toBe('Ana Demo');
    expect(sesion.rol()).toBe('CIUDADANO');
  });

  it('considera cerrada una sesión vencida, guardada o en memoria', () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesionDePrueba('CIUDADANO', -1)));
    expect(TestBed.inject(SesionService).estaAutenticado()).toBe(false);
    expect(localStorage.getItem(CLAVE_SESION)).toBeNull();

    vi.useFakeTimers();
    TestBed.resetTestingModule();
    const sesion = TestBed.inject(SesionService);
    sesion.guardar(sesionDePrueba('OPERADOR', 1));
    expect(sesion.estaAutenticado()).toBe(true);
    vi.advanceTimersByTime(60_001);
    expect(sesion.estaAutenticado()).toBe(false);
    expect(localStorage.getItem(CLAVE_SESION)).toBeNull();
  });

  it('ignora datos corruptos o incompletos', () => {
    localStorage.setItem(CLAVE_SESION, '{no es json');
    expect(TestBed.inject(SesionService).estaAutenticado()).toBe(false);
    TestBed.resetTestingModule();
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'x', rol: 'ADMIN', expira: Date.now() + 60_000 }));
    expect(TestBed.inject(SesionService).estaAutenticado()).toBe(false);
  });

  it('cerrar borra la sesión y el almacenamiento', () => {
    const sesion = TestBed.inject(SesionService);
    sesion.guardar(sesionDePrueba());
    sesion.cerrar();
    expect(sesion.token()).toBeNull();
    expect(localStorage.getItem(CLAVE_SESION)).toBeNull();
  });

  it('decide destinos e inicio según el rol', () => {
    expect(inicioPorRol('CIUDADANO')).toBe('/ciudadano/reportes');
    expect(inicioPorRol('OPERADOR')).toBe('/operador/reportes');
    expect(destinoPermitido('/ciudadano/reportes/nuevo', 'CIUDADANO')).toBe(true);
    expect(destinoPermitido('/operador/reportes', 'CIUDADANO')).toBe(false);
    expect(destinoPermitido('/operador/reportes/4', 'OPERADOR')).toBe(true);
    expect(destinoPermitido('//sitio.test/ciudadano', 'CIUDADANO')).toBe(false);
    expect(destinoPermitido('https://sitio.test', 'CIUDADANO')).toBe(false);
    expect(destinoPermitido('/ciudadanox', 'CIUDADANO')).toBe(false);
    expect(destinoPermitido(null, 'CIUDADANO')).toBe(false);
  });
});
