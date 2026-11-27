import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Acceso } from './acceso';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

describe('Acceso', () => {
  it('no envía campos vacíos', async () => {
    const avisos = { warning: vi.fn(), error: vi.fn() };
    await TestBed.configureTestingModule({ imports: [Acceso], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } }, { provide: NotificationService, useValue: avisos }] }).compileComponents();
    const fixture = TestBed.createComponent(Acceso);
    const servicio = TestBed.inject(AuthService);
    const enviar = vi.spyOn(servicio, 'iniciarSesion');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    expect(avisos.warning).toHaveBeenCalledWith('Completa los campos obligatorios');
    expect(enviar).not.toHaveBeenCalled();
  });
  it('no muestra éxito cuando el servicio no está disponible', async () => {
    const avisos = { warning: vi.fn(), error: vi.fn() };
    await TestBed.configureTestingModule({ imports: [Acceso], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } }, { provide: NotificationService, useValue: avisos }] }).compileComponents();
    const fixture = TestBed.createComponent(Acceso);
    fixture.detectChanges();
    const acceso = fixture.componentInstance as unknown as { form: { patchValue: (v: object) => void }; enviar: () => void };
    acceso.form.patchValue({ correo: 'persona@example.org', contrasena: 'contraseña' });
    acceso.enviar();
    expect(avisos.error).toHaveBeenCalledWith('El servicio de autenticación aún no está disponible.');
  });
});
