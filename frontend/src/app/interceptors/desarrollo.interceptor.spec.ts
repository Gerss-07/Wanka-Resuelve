import { HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { crearInterceptorDesarrollo } from './desarrollo.interceptor';

const desarrollo = { production: false, apiUrl: 'http://127.0.0.1:8000', devUsuarios: { ciudadano: 2, operador: 1 } };

describe('interceptor temporal', () => {
  it('envía la identidad solo a la API de desarrollo', () => {
    const interceptor = crearInterceptorDesarrollo(desarrollo, () => 2);
    const siguiente = vi.fn((_request: HttpRequest<unknown>) => of(new HttpResponse()));
    interceptor(new HttpRequest('GET', 'http://127.0.0.1:8000/categorias'), siguiente);
    expect(siguiente.mock.calls[0][0].headers.get('X-Dev-Usuario-Id')).toBe('2');
    interceptor(new HttpRequest('GET', 'http://127.0.0.1:8000.ejemplo.test/categorias'), siguiente);
    expect(siguiente.mock.calls[1][0].headers.has('X-Dev-Usuario-Id')).toBe(false);
  });
  it('envía el id elegido en el selector', () => {
    const interceptor = crearInterceptorDesarrollo(desarrollo, () => 1);
    const siguiente = vi.fn((_request: HttpRequest<unknown>) => of(new HttpResponse()));
    interceptor(new HttpRequest('GET', 'http://127.0.0.1:8000/operador/reportes'), siguiente);
    expect(siguiente.mock.calls[0][0].headers.get('X-Dev-Usuario-Id')).toBe('1');
  });
  it('no envía identidad temporal en producción', () => {
    const interceptor = crearInterceptorDesarrollo({ ...desarrollo, production: true }, () => 2);
    const siguiente = vi.fn((_request: HttpRequest<unknown>) => of(new HttpResponse()));
    interceptor(new HttpRequest('GET', 'http://127.0.0.1:8000/categorias'), siguiente);
    expect(siguiente.mock.calls[0][0].headers.has('X-Dev-Usuario-Id')).toBe(false);
  });
});
