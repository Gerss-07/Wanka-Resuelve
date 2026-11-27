import { HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { crearInterceptorDesarrollo } from './desarrollo.interceptor';

describe('interceptor temporal', () => {
  it('envía el ciudadano solo a la API de desarrollo', () => {
    const interceptor = crearInterceptorDesarrollo({ production: false, apiUrl: 'http://127.0.0.1:8000', devUsuarios: { ciudadano: 2, operador: 1 } });
    const siguiente = vi.fn((_request: HttpRequest<unknown>) => of(new HttpResponse()));
    interceptor(new HttpRequest('GET', 'http://127.0.0.1:8000/categorias'), siguiente);
    expect(siguiente.mock.calls[0][0].headers.get('X-Dev-Usuario-Id')).toBe('2');
    interceptor(new HttpRequest('GET', 'http://127.0.0.1:8000.ejemplo.test/categorias'), siguiente);
    expect(siguiente.mock.calls[1][0].headers.has('X-Dev-Usuario-Id')).toBe(false);
  });
  it('no envía identidad temporal en producción', () => {
    const interceptor = crearInterceptorDesarrollo({ production: true, apiUrl: 'http://127.0.0.1:8000', devUsuarios: { ciudadano: 2, operador: 1 } });
    const siguiente = vi.fn((_request: HttpRequest<unknown>) => of(new HttpResponse()));
    interceptor(new HttpRequest('GET', 'http://127.0.0.1:8000/categorias'), siguiente);
    expect(siguiente.mock.calls[0][0].headers.has('X-Dev-Usuario-Id')).toBe(false);
  });
});
