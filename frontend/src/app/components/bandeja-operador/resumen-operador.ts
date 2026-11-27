import { Component, computed, input, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { LucideChartNoAxesColumn, LucideCircleCheck, LucideClock, LucideInbox, LucideLayers } from '@lucide/angular';
import { Estado, ReporteResumen } from '../../interfaces/reporte.interface';

const FORMATO_MES = new Intl.DateTimeFormat('es-PE', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const FORMATO_PORCENTAJE = new Intl.NumberFormat('es-PE', { style: 'percent', maximumFractionDigits: 1 });
const COLORES: Record<Estado, string> = {
  RECIBIDO: '#0866dc', ASIGNADO: '#06458f', EN_ATENCION: '#00bfa6', CERRADO: '#16a765', RECHAZADO: '#ff8a24',
};

@Component({
  selector: 'app-resumen-operador',
  imports: [FormField, LucideChartNoAxesColumn, LucideCircleCheck, LucideClock, LucideInbox, LucideLayers],
  templateUrl: './resumen-operador.html',
  styleUrl: './resumen-operador.scss',
})
export class ResumenOperador {
  readonly reportes = input.required<ReporteResumen[] | null>();
  readonly cargando = input.required<boolean>();
  readonly estados = input.required<{ valor: Estado; nombre: string }[]>();
  private readonly periodo = signal({ meses: '6' });
  protected readonly seleccionPeriodo = form(this.periodo);
  protected readonly mesActivo = signal<string | null>(null);
  protected readonly estadoActivo = signal<Estado | null>(null);

  protected readonly resumen = computed(() => {
    const reportes = this.reportes();
    if (reportes === null) return null;
    const porEstado: Record<Estado, number> = {
      RECIBIDO: 0, ASIGNADO: 0, EN_ATENCION: 0, CERRADO: 0, RECHAZADO: 0,
    };
    const porMes = new Map<string, number>();
    for (const reporte of reportes) {
      porEstado[reporte.estado]++;
      const mes = reporte.fechaCreacion.slice(0, 7);
      porMes.set(mes, (porMes.get(mes) ?? 0) + 1);
    }
    const meses = [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-Number(this.periodo().meses))
      .map(([mes, cantidad]) => ({
        mes, cantidad, nombre: FORMATO_MES.format(new Date(`${mes}-01T00:00:00Z`)),
      }));
    const maximo = Math.max(1, ...meses.map(mes => mes.cantidad));
    return { total: reportes.length, porEstado, meses, maximo };
  });

  protected readonly distribucion = computed(() => {
    const datos = this.resumen();
    if (!datos) return [];
    return this.estados().map(({ valor, nombre }) => {
      const cantidad = datos.porEstado[valor];
      const proporcion = datos.total ? cantidad / datos.total : 0;
      return { valor, nombre, color: COLORES[valor], cantidad, proporcion, porcentaje: FORMATO_PORCENTAJE.format(proporcion) };
    });
  });
  protected readonly dona = computed(() => {
    let inicio = 0;
    const visibles = this.distribucion().filter(estado => estado.cantidad > 0);
    if (visibles.length === 1) return `linear-gradient(${visibles[0].color}, ${visibles[0].color})`;
    const tramos = visibles.map((estado, indice) => {
      const fin = indice === visibles.length - 1 ? 100 : inicio + estado.proporcion * 100;
      const tramo = `${estado.color} ${inicio}% ${fin}%`;
      inicio = fin;
      return tramo;
    });
    return tramos.length ? `conic-gradient(${tramos.join(', ')})` : null;
  });
  protected readonly segmentoActivo = computed(() => this.distribucion().find(estado => estado.valor === this.estadoActivo()));
}
