import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { RevisionOperador } from './revision-operador';
import { ReporteService } from '../../services/reporte.service';
import { OperadorService } from '../../services/operador.service';
import { CatalogoService } from '../../services/catalogo.service';
import { AlertaService } from '../../services/alerta.service';

const detalle = (estado: string) => ({
  id: 7, codigo: 'WR-2026-000007', ciudadano: 'Ana Demo', categoria: { id: 2, nombre: 'Pistas y veredas' }, distrito: { id: 1, nombre: 'Huancayo' },
  estado, prioridad: null, fechaCreacion: '2026-11-26T15:04:00', descripcion: 'Hueco profundo en la calzada', referencia: 'Av. Ferrocarril',
  latitud: -12.0651, longitud: -75.2049, entidad: null, motivoRechazo: null, comentarioSolucion: null, fotos: [], historial: [], fechaActualizacion: '2026-11-26T15:04:00',
});

async function crear(estado: string, operador: Partial<OperadorService> = {}, alertas: Partial<AlertaService> = {}) {
  await TestBed.configureTestingModule({
    imports: [RevisionOperador],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '7' } } } },
      { provide: ReporteService, useValue: { obtener: async () => detalle(estado) } },
      { provide: CatalogoService, useValue: { entidades: async () => [{ id: 2, nombre: 'Unidad Simulada de Vías y Veredas', idCategoria: 2 }] } },
      { provide: OperadorService, useValue: operador },
      { provide: AlertaService, useValue: { errorHttp: () => '', exito: async () => undefined, ...alertas } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(RevisionOperador);
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, c: fixture.componentInstance as any, el: fixture.nativeElement as HTMLElement };
}
const formularios = (el: HTMLElement) => Array.from(el.querySelectorAll('.f3-acciones form')).map(f => f.getAttribute('aria-label'));

describe('RevisionOperador', () => {
  it('muestra el panel de acciones según el estado', async () => {
    let { el } = await crear('RECIBIDO');
    expect(formularios(el)).toEqual(['Asignar reporte', 'Rechazar reporte']);
    expect(el.querySelector('#entidad')!.textContent).toContain('Unidad Simulada de Vías y Veredas');

    TestBed.resetTestingModule();
    ({ el } = await crear('ASIGNADO'));
    expect(formularios(el)).toEqual(['Iniciar atención']);
    expect(el.querySelector('.f3-acciones button')!.textContent).toContain('Registrar inicio de atención (informado por la entidad)');

    TestBed.resetTestingModule();
    ({ el } = await crear('EN_ATENCION'));
    expect(formularios(el)).toEqual(['Cerrar reporte']);

    TestBed.resetTestingModule();
    ({ el } = await crear('CERRADO'));
    expect(formularios(el)).toEqual([]);
    expect(el.querySelector('.f3-acciones')!.textContent).toContain('solo lectura');
  });

  it('no llama a la API de rechazo si se cancela la confirmación', async () => {
    const rechazar = vi.fn();
    const confirmar = vi.fn(async () => false);
    const { c } = await crear('RECIBIDO', { rechazar }, { confirmar });
    c.rechazo.set({ motivo: 'Fotos que no corresponden a la incidencia' });
    await c.rechazar();
    expect(confirmar).toHaveBeenCalled();
    expect(rechazar).not.toHaveBeenCalled();
  });
});
