import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Acceso } from './acceso';
import { AuthService } from '../../services/auth.service';
import { AlertaService } from '../../services/alerta.service';

describe('Acceso', () => {
  it('no envía campos vacíos', async () => {
    const avisos = { error: vi.fn() };
    await TestBed.configureTestingModule({ imports: [Acceso], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } }, { provide: AlertaService, useValue: avisos }] }).compileComponents();
    const fixture = TestBed.createComponent(Acceso);
    const servicio = TestBed.inject(AuthService);
    const enviar = vi.spyOn(servicio, 'iniciarSesion');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    expect(avisos.error).toHaveBeenCalledWith('Completa los campos obligatorios');
    expect(enviar).not.toHaveBeenCalled();
  });
});
