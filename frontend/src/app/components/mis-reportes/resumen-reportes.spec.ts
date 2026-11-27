import { TestBed } from '@angular/core/testing';
import { ReporteResumen } from '../../interfaces/reporte.interface';
import { calcularActividad, ResumenReportes } from './resumen-reportes';

const reporte: ReporteResumen = {
  id: 1, codigo: 'WR-2026-000001', ciudadano: 'Ciudadano de prueba',
  categoria: { id: 1, nombre: 'Pistas y veredas' }, distrito: { id: 1, nombre: 'Huancayo' },
  estado: 'RECIBIDO', prioridad: null, fechaCreacion: '2026-12-15T15:00:00',
};

describe('ResumenReportes', () => {
  it('agrupa por mes de creación y excluye reportes anteriores al intervalo', () => {
    const meses = calcularActividad([
      reporte, { ...reporte, fechaCreacion: '2027-01-07T10:00:00' },
      { ...reporte, fechaCreacion: '2026-07-31T23:00:00' },
    ], new Date('2027-01-08T12:00:00Z'));

    expect(meses.map(m => [m.clave, m.cantidad])).toEqual([
      ['2026-08', 0], ['2026-09', 0], ['2026-10', 0], ['2026-11', 0], ['2026-12', 1], ['2027-01', 1],
    ]);
  });

  it('muestra los cinco estados con proporciones calculadas desde los reportes', () => {
    const fixture = TestBed.createComponent(ResumenReportes);
    fixture.componentRef.setInput('reportes', [reporte, { ...reporte, id: 2, estado: 'CERRADO' }]);
    fixture.detectChanges();
    const panel = fixture.nativeElement as HTMLElement;
    expect(Array.from(panel.querySelectorAll('.metrica strong'), el => el.textContent)).toEqual(['2', '1', '0', '0', '1', '0']);
    expect(Array.from(panel.querySelectorAll('.leyenda b'), el => el.textContent)).toEqual(['50%', '0%', '0%', '50%', '0%']);
  });
});
