import { Component, computed, input } from '@angular/core';
import { PercentPipe } from '@angular/common';
import { LucideChartColumn, LucideChartPie, LucideClipboardList } from '@lucide/angular';
import { Estado, ReporteResumen } from '../../interfaces/reporte.interface';

export const estadosReporte: { estado: Estado; nombre: string; color: string }[] = [
  { estado: 'RECIBIDO', nombre: 'Recibido', color: '#235ac8' },
  { estado: 'ASIGNADO', nombre: 'Asignado', color: '#4386df' },
  { estado: 'EN_ATENCION', nombre: 'En atención', color: '#007d81' },
  { estado: 'CERRADO', nombre: 'Cerrado', color: '#43b6a0' },
  { estado: 'RECHAZADO', nombre: 'Rechazado', color: '#ac4f39' },
];

export function calcularActividad(reportes: ReporteResumen[], hoy = new Date()) {
  const mesActual = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit' }).format(hoy);
  const [anio, mes] = mesActual.split('-').map(Number);
  const formatoMes = new Intl.DateTimeFormat('es-PE', { month: 'short', timeZone: 'UTC' });
  const meses = Array.from({ length: 6 }, (_, indice) => {
    const fecha = new Date(Date.UTC(anio, mes - 6 + indice, 1));
    return { clave: fecha.toISOString().slice(0, 7), nombre: formatoMes.format(fecha), cantidad: 0 };
  });
  const porMes = new Map(meses.map(m => [m.clave, m]));
  for (const reporte of reportes) {
    const mes = porMes.get(reporte.fechaCreacion.slice(0, 7));
    if (mes) mes.cantidad++;
  }
  return meses;
}

@Component({
  selector: 'app-resumen-reportes',
  imports: [PercentPipe, LucideChartColumn, LucideChartPie, LucideClipboardList],
  templateUrl: './resumen-reportes.html',
  styleUrl: './resumen-reportes.scss',
})
export class ResumenReportes {
  readonly reportes = input.required<ReporteResumen[]>();
  protected readonly actividad = computed(() => calcularActividad(this.reportes()));
  protected readonly maximo = computed(() => Math.max(...this.actividad().map(m => m.cantidad)));

  protected readonly distribucion = computed(() => {
    const reportes = this.reportes();
    const cantidades = new Map<Estado, number>();
    for (const { estado } of reportes) cantidades.set(estado, (cantidades.get(estado) ?? 0) + 1);

    let inicio = 0;
    const estados = estadosReporte.map(estado => {
      const cantidad = cantidades.get(estado.estado) ?? 0;
      const proporcion = reportes.length ? cantidad / reportes.length : 0;
      const fin = inicio + proporcion * 100;
      const segmento = `${estado.color} ${inicio}% ${fin}%`;
      inicio = fin;
      return { ...estado, cantidad, proporcion, segmento };
    });
    const segmentos = estados.filter(estado => estado.cantidad).map(estado => estado.segmento);
    return { estados, fondo: segmentos.length ? `conic-gradient(${segmentos.join(', ')})` : '' };
  });
}
