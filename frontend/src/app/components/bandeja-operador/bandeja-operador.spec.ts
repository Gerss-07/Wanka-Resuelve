import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BandejaOperador } from './bandeja-operador';
import { OperadorService } from '../../services/operador.service';
import { CatalogoService } from '../../services/catalogo.service';
import { AlertaService } from '../../services/alerta.service';

describe('BandejaOperador', () => {
  it('pinta una fila por reporte con ciudadano, prioridad y enlace a la revisión', async () => {
    const reporte = { id: 7, codigo: 'WR-2026-000007', ciudadano: 'Ana Demo', categoria: { id: 2, nombre: 'Pistas y veredas' }, distrito: { id: 1, nombre: 'Huancayo' }, estado: 'ASIGNADO', prioridad: 'ALTA', fechaCreacion: '2026-11-26T15:04:00' };
    await TestBed.configureTestingModule({
      imports: [BandejaOperador],
      providers: [
        provideRouter([]),
        { provide: OperadorService, useValue: { bandeja: async () => [reporte] } },
        { provide: CatalogoService, useValue: { categorias: async () => [], distritos: async () => [] } },
        { provide: AlertaService, useValue: { errorHttp: () => '' } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(BandejaOperador);
    await fixture.whenStable();
    fixture.detectChanges();
    const filas = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(filas.length).toBe(1);
    const texto = filas[0].textContent ?? '';
    for (const valor of ['WR-2026-000007', 'Ana Demo', 'Pistas y veredas', 'Huancayo', 'Asignado', 'ALTA']) expect(texto).toContain(valor);
    expect(filas[0].querySelector('a')!.getAttribute('href')).toBe('/operador/reportes/7');
  });
});
