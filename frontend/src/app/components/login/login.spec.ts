import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { Login, MENSAJES_LOGIN } from './login';
import { AuthService } from '../../services/auth.service';
import { AlertaService, mensajeError } from '../../services/alerta.service';

async function crear(auth: Partial<AuthService>) {
  await TestBed.configureTestingModule({
    imports: [Login],
    providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: AlertaService, useValue: { errorHttp: mensajeError } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(Login);
  fixture.detectChanges();
  return { fixture, c: fixture.componentInstance as any, el: fixture.nativeElement as HTMLElement };
}
const escribir = (el: HTMLElement, selector: string, valor: string) => {
  const input = el.querySelector(selector) as HTMLInputElement;
  input.value = valor; input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('blur'));
};
const boton = (el: HTMLElement) => el.querySelector('button[type=submit]') as HTMLButtonElement;

describe('Login', () => {
  it('muestra «Correo inválido» bajo el campo después de tocarlo y deshabilita el botón', async () => {
    const { fixture, el } = await crear({});
    expect(boton(el).disabled).toBe(true);
    expect(el.querySelector('#correo-errores')!.textContent).not.toContain(MENSAJES_LOGIN.correo);
    escribir(el, '#correo', 'no-es-correo');
    fixture.detectChanges();
    expect(el.querySelector('#correo-errores')!.textContent).toContain(MENSAJES_LOGIN.correo);
    escribir(el, '#contrasena', '');
    fixture.detectChanges();
    expect(el.querySelector('#contrasena-errores')!.textContent).toContain(MENSAJES_LOGIN.contrasena);
    expect(boton(el).disabled).toBe(true);
    escribir(el, '#correo', 'ana@demo.test');
    escribir(el, '#contrasena', 'secreta123');
    fixture.detectChanges();
    expect(boton(el).disabled).toBe(false);
  });

  it('con un 401 muestra el detail del backend y no navega', async () => {
    const error = new HttpErrorResponse({ status: 401, error: { detail: 'Credenciales inválidas' } });
    const { fixture, c, el } = await crear({ iniciarSesion: async () => { throw error; } });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    c.modelo.set({ correo: 'ana@demo.test', contrasena: 'incorrecta' });
    await c.enviar();
    fixture.detectChanges();
    expect(el.textContent).toContain('Credenciales inválidas');
    expect(navegar).not.toHaveBeenCalled();
  });

  it('al entrar navega al inicio del rol', async () => {
    const { c } = await crear({ iniciarSesion: async () => ({ id: 1, nombre: 'Op', correo: 'op@demo.test', rol: 'OPERADOR' as const }) });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    c.modelo.set({ correo: 'op@demo.test', contrasena: 'secreta123' });
    await c.enviar();
    expect(navegar).toHaveBeenCalledWith('/operador/reportes');
  });
});
