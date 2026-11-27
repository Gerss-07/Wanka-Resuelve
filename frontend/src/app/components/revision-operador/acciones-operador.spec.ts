import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ReporteDetalle } from '../../interfaces/reporte.interface';
import { CatalogoService } from '../../services/catalogo.service';
import { AlertaService } from '../../services/alerta.service';
import { OperadorService } from '../../services/operador.service';
import { AccionesOperador } from './acciones-operador';

describe('AccionesOperador', () => {
  const reporte: ReporteDetalle = {
    id: 7, codigo: 'WR-2026-000007', ciudadano: 'Ana', estado: 'RECIBIDO',
    categoria: { id: 2, nombre: 'Pistas' }, distrito: { id: 1, nombre: 'Huancayo' },
    prioridad: null, entidad: null, descripcion: 'Descripción válida', referencia: 'Referencia válida',
    latitud: -12.06, longitud: -75.2, motivoRechazo: null, comentarioSolucion: null,
    fotos: [], historial: [], fechaCreacion: '2026-11-26T15:04:00', fechaActualizacion: '2026-11-26T15:04:00',
  };
  const entidades = vi.fn();
  const asignar = vi.fn();
  const rechazar = vi.fn();
  const iniciarAtencion = vi.fn();
  const cerrar = vi.fn();
  const confirmar = vi.fn();
  const exito = vi.fn();
  const error = vi.fn();

  beforeEach(() => {
    entidades.mockReset().mockResolvedValue([{ id: 3, nombre: 'Vías' }]);
    asignar.mockReset();
    rechazar.mockReset();
    iniciarAtencion.mockReset();
    cerrar.mockReset();
    confirmar.mockReset().mockResolvedValue(true);
    exito.mockReset();
    error.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: CatalogoService, useValue: { entidades } },
        { provide: AlertaService, useValue: { confirmar, exito, error } },
        { provide: OperadorService, useValue: { asignar, rechazar, iniciarAtencion, cerrar } },
      ],
    });
  });

  it('no envía cambios si el operador cancela la confirmación', async () => {
    confirmar.mockResolvedValue(false);
    const fixture = TestBed.createComponent(AccionesOperador);
    fixture.componentRef.setInput('reporte', { ...reporte, estado: 'ASIGNADO' });
    await fixture.whenStable();
    const vista: HTMLElement = fixture.nativeElement;
    vista.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(confirmar).toHaveBeenCalledOnce();
    expect(iniciarAtencion).not.toHaveBeenCalled();
    expect(vista.querySelector('button')?.disabled).toBe(false);
  });

  it('requiere prioridad y entidad y envía la selección de ambos controles', async () => {
    const fixture = TestBed.createComponent(AccionesOperador);
    fixture.componentRef.setInput('reporte', reporte);
    asignar.mockResolvedValue({ ...reporte, estado: 'ASIGNADO' });
    await fixture.whenStable();
    const vista: HTMLElement = fixture.nativeElement;
    const prioridad = vista.querySelector<HTMLSelectElement>('#prioridad')!;
    const entidad = vista.querySelector<HTMLSelectElement>('#entidad')!;
    expect(prioridad.form!.querySelector('button')?.disabled).toBe(true);
    prioridad.form!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(asignar).not.toHaveBeenCalled();
    expect(vista.querySelector('#error-prioridad')).not.toBeNull();
    prioridad.value = 'ALTA';
    prioridad.dispatchEvent(new Event('input'));
    entidad.value = '3';
    entidad.dispatchEvent(new Event('input'));
    prioridad.form!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(asignar).toHaveBeenCalledWith(7, 'ALTA', 3);
  });

  it('carga opciones de la categoría y rechaza un motivo corto tras recortar espacios', async () => {
    const fixture = TestBed.createComponent(AccionesOperador);
    const actualizado = vi.fn();
    fixture.componentInstance.actualizado.subscribe(actualizado);
    fixture.componentRef.setInput('reporte', reporte);
    await fixture.whenStable();
    const vista: HTMLElement = fixture.nativeElement;
    expect(entidades).toHaveBeenCalledWith(2);
    expect(vista.querySelector('#entidad')?.textContent).toContain('Vías');
    const motivo = vista.querySelector<HTMLTextAreaElement>('#motivo')!;
    motivo.value = '   demasiado   ';
    motivo.dispatchEvent(new Event('input'));
    motivo.form!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(rechazar).not.toHaveBeenCalled();
    expect(vista.querySelector('#error-motivo')?.textContent).toContain('10 caracteres');

    const final = { ...reporte, estado: 'RECHAZADO' };
    rechazar.mockResolvedValue(final);
    motivo.value = 'No corresponde a esta zona';
    motivo.dispatchEvent(new Event('input'));
    motivo.form!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(rechazar).toHaveBeenCalledWith(7, 'No corresponde a esta zona');
    expect(actualizado).toHaveBeenCalledWith(expect.objectContaining({ reporte: final }));
    fixture.componentRef.setInput('reporte', final);
    await fixture.whenStable();
    expect(vista.querySelector('form')).toBeNull();
  });

  it('permite iniciar la atención sin comentario y notifica la necesidad de recargar ante un 409', async () => {
    iniciarAtencion.mockRejectedValue(new HttpErrorResponse({ status: 409, error: { detail: 'El estado cambió' } }));
    const fixture = TestBed.createComponent(AccionesOperador);
    const conflicto = vi.fn();
    fixture.componentInstance.conflicto.subscribe(conflicto);
    fixture.componentRef.setInput('reporte', { ...reporte, estado: 'ASIGNADO' });
    await fixture.whenStable();
    const vista: HTMLElement = fixture.nativeElement;
    expect(vista.querySelector('#motivo')).toBeNull();
    vista.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(entidades).not.toHaveBeenCalled();
    expect(iniciarAtencion).toHaveBeenCalledWith(7, '');
    expect(conflicto).toHaveBeenCalledWith('El estado cambió');
    expect(error).toHaveBeenCalledWith('El estado cambió');
    expect(exito).not.toHaveBeenCalled();
  });

  it('habilita el cierre solo con solución válida y respeta el error 422 de FastAPI', async () => {
    cerrar.mockRejectedValue(new HttpErrorResponse({ status: 422, error: { detail: 'Solución inválida' } }));
    const fixture = TestBed.createComponent(AccionesOperador);
    fixture.componentRef.setInput('reporte', { ...reporte, estado: 'EN_ATENCION' });
    await fixture.whenStable();
    const vista: HTMLElement = fixture.nativeElement;
    const solucion = vista.querySelector<HTMLTextAreaElement>('#solucion')!;
    const boton = solucion.form!.querySelector('button')!;
    expect(boton.disabled).toBe(true);
    solucion.value = '  Calzada reparada  ';
    solucion.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(boton.disabled).toBe(false);
    solucion.form!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(cerrar).toHaveBeenCalledWith(7, '  Calzada reparada  ');
    expect(error).toHaveBeenCalledWith('Solución inválida');
    expect(exito).not.toHaveBeenCalled();
  });
});
