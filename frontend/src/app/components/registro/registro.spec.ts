import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MENSAJES_REGISTRO, Registro } from './registro';
import { AuthService } from '../../services/auth.service';
import { AlertaService } from '../../services/alerta.service';

const VALIDO = { nombre: 'Ana Demo', correo: 'ana@demo.test', contrasena: 'secreta123', confirmacion: 'secreta123' };

async function crear(auth: Partial<AuthService>, alertas: Partial<AlertaService> = {}) {
  await TestBed.configureTestingModule({
    imports: [Registro],
    providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: AlertaService, useValue: { errorHttp: () => '', exito: async () => undefined, ...alertas } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(Registro);
  fixture.detectChanges();
  return { fixture, c: fixture.componentInstance as any, el: fixture.nativeElement as HTMLElement };
}
const mensajes = (c: any, campo: string): string[] => c.formulario[campo]().errors().map((e: { message: string }) => e.message);

describe('Registro', () => {
  it('usa los mensajes de la sección 8', async () => {
    const { c } = await crear({});
    c.modelo.set({ nombre: ' a ', correo: 'malo', contrasena: 'corta', confirmacion: 'otra' });
    expect(mensajes(c, 'nombre')).toEqual([MENSAJES_REGISTRO.nombre]);
    expect(mensajes(c, 'correo')).toEqual([MENSAJES_REGISTRO.correo]);
    expect(mensajes(c, 'contrasena')).toEqual([MENSAJES_REGISTRO.contrasena]);
    expect(mensajes(c, 'confirmacion')).toEqual([MENSAJES_REGISTRO.confirmacion]);
    c.modelo.set({ ...VALIDO, nombre: 'x'.repeat(101), correo: 'a'.repeat(64) + '@' + 'b'.repeat(60) + '.' + 'c'.repeat(20) + '.test' });  // 151 caracteres con formato válido
    expect(mensajes(c, 'nombre')).toEqual([MENSAJES_REGISTRO.nombre]);
    expect(mensajes(c, 'correo')).toEqual([MENSAJES_REGISTRO.correo]);
    c.modelo.set(VALIDO);
    expect(c.formulario().invalid()).toBe(false);
  });

  it('deshabilita el botón y muestra los errores bajo cada campo tras tocarlos', async () => {
    const { fixture, c, el } = await crear({});
    const boton = () => el.querySelector('button[type=submit]') as HTMLButtonElement;
    expect(boton().disabled).toBe(true);
    c.modelo.set({ ...VALIDO, confirmacion: 'distinta1' });
    fixture.detectChanges();
    expect(boton().disabled).toBe(true);
    expect(el.querySelector('#confirmacion-errores')!.textContent).not.toContain(MENSAJES_REGISTRO.confirmacion);
    (el.querySelector('#confirmacion') as HTMLInputElement).dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(el.querySelector('#confirmacion-errores')!.textContent).toContain(MENSAJES_REGISTRO.confirmacion);
    c.modelo.set(VALIDO);
    fixture.detectChanges();
    expect(boton().disabled).toBe(false);
  });

  it('al registrarse muestra una alerta de éxito y redirige a /login', async () => {
    const registrar = vi.fn(async () => ({ id: 4, nombre: 'Ana Demo', correo: 'ana@demo.test', rol: 'CIUDADANO' as const }));
    const exito = vi.fn(async () => undefined);
    const { c } = await crear({ registrar }, { exito });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    c.modelo.set(VALIDO);
    await c.enviar();
    expect(registrar).toHaveBeenCalledWith({ nombre: 'Ana Demo', correo: 'ana@demo.test', contrasena: 'secreta123' });
    expect(exito).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });
});
