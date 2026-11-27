import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { SesionService } from './sesion.service';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  });

  it('inicia sesión y guarda token, usuario, rol y expiración', async () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    const promesa = auth.iniciarSesion('  ana@demo.test ', 'secreta123');
    const peticion = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(peticion.request.body).toEqual({ correo: 'ana@demo.test', contrasena: 'secreta123' });
    peticion.flush({ access_token: 'abc', token_type: 'bearer', expires_in: 3600, usuario: { id_usuario: 3, nombre: 'Ana', correo: 'ana@demo.test', rol: 'CIUDADANO' } });
    await expect(promesa).resolves.toEqual({ id: 3, nombre: 'Ana', correo: 'ana@demo.test', rol: 'CIUDADANO' });
    const sesion = TestBed.inject(SesionService);
    expect(sesion.token()).toBe('abc');
    expect(sesion.rol()).toBe('CIUDADANO');
    auth.cerrarSesion();
    expect(sesion.estaAutenticado()).toBe(false);
    http.verify();
  });

  it('registra sin iniciar sesión', async () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    const promesa = auth.registrar({ nombre: ' Ana ', correo: 'ana@demo.test', contrasena: 'secreta123' });
    const peticion = http.expectOne(`${environment.apiUrl}/auth/registro`);
    expect(peticion.request.body).toEqual({ nombre: 'Ana', correo: 'ana@demo.test', contrasena: 'secreta123' });
    peticion.flush({ id_usuario: 4, nombre: 'Ana', correo: 'ana@demo.test', rol: 'CIUDADANO' }, { status: 201, statusText: 'Created' });
    await expect(promesa).resolves.toMatchObject({ id: 4, rol: 'CIUDADANO' });
    expect(TestBed.inject(SesionService).estaAutenticado()).toBe(false);
  });
});
