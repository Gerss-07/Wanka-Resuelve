import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { SesionService } from '../services/sesion.service';
import { sesionDePrueba } from '../services/sesion.service.spec';
import { authInterceptor } from './auth.interceptor';
import { desarrolloInterceptor } from './desarrollo.interceptor';

const API = environment.apiUrl;

describe('authInterceptor', () => {
  let http: HttpClient; let control: HttpTestingController; let sesion: SesionService; let router: Router;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor, desarrolloInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient); control = TestBed.inject(HttpTestingController);
    sesion = TestBed.inject(SesionService); router = TestBed.inject(Router);
  });
  afterEach(() => control.verify());

  it('con sesión envía Bearer a la API y no lo envía a otros dominios', () => {
    sesion.guardar(sesionDePrueba());
    void firstValueFrom(http.get(`${API}/reportes/mis-reportes`));
    expect(control.expectOne(`${API}/reportes/mis-reportes`).request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    void firstValueFrom(http.get('https://tile.openstreetmap.org/1/1/1.png'));
    expect(control.expectOne('https://tile.openstreetmap.org/1/1/1.png').request.headers.has('Authorization')).toBe(false);
  });

  it('la sesión tiene prioridad sobre el modo dev', () => {
    void firstValueFrom(http.get(`${API}/categorias`));
    const sinSesion = control.expectOne(`${API}/categorias`).request;
    expect(sinSesion.headers.has('Authorization')).toBe(false);
    expect(sinSesion.headers.has('X-Dev-Usuario-Id')).toBe(!!environment.devUsuarios && !environment.production);

    sesion.guardar(sesionDePrueba());
    void firstValueFrom(http.get(`${API}/categorias`));
    const conSesion = control.expectOne(`${API}/categorias`).request;
    expect(conSesion.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    expect(conSesion.headers.has('X-Dev-Usuario-Id')).toBe(false);
  });

  it('un 401 cierra la sesión y lleva a /login con el destino', async () => {
    sesion.guardar(sesionDePrueba());
    vi.spyOn(router, 'url', 'get').mockReturnValue('/ciudadano/reportes/7');
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const promesa = firstValueFrom(http.get(`${API}/reportes/7`)).catch(e => e);
    control.expectOne(`${API}/reportes/7`).flush({ detail: 'No autenticado' }, { status: 401, statusText: 'Unauthorized' });
    expect((await promesa).status).toBe(401);
    expect(sesion.estaAutenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { destino: '/ciudadano/reportes/7' } });
  });

  it('un 401 de /auth/login no cierra sesión ni redirige', async () => {
    sesion.guardar(sesionDePrueba());
    const navegar = vi.spyOn(router, 'navigate');
    const promesa = firstValueFrom(http.post(`${API}/auth/login`, {})).catch(e => e);
    control.expectOne(`${API}/auth/login`).flush({ detail: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
    expect((await promesa).status).toBe(401);
    expect(sesion.estaAutenticado()).toBe(true);
    expect(navegar).not.toHaveBeenCalled();
  });
});
