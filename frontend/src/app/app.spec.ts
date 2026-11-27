import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  it('crea la aplicación y configura la portada', async () => {
    await TestBed.configureTestingModule({ imports: [App], providers: [provideRouter(routes)] }).compileComponents();
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
    expect(routes[0].path).toBe('');
  });
  it('reserva las rutas del operador', () => {
    const operador = routes.find(r => r.path === 'operador');
    expect(operador?.children?.map(r => r.path)).toEqual(['reportes', 'reportes/:id']);
  });
});
