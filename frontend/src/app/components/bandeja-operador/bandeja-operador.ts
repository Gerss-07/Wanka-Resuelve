import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { form, FormField, validate } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { Catalogo } from '../../interfaces/catalogo.interface';
import { Estado, FiltrosBandeja, ReporteResumen } from '../../interfaces/reporte.interface';
import { AlertaService } from '../../services/alerta.service';
import { CatalogoService } from '../../services/catalogo.service';
import { OperadorService } from '../../services/operador.service';
import { EstadoBadge } from '../estado-badge/estado-badge';

export const MENSAJE_FECHAS = 'La fecha final no puede ser anterior a la inicial';
const ESTADOS: { valor: Estado; nombre: string }[] = [
  { valor: 'RECIBIDO', nombre: 'Recibido' }, { valor: 'ASIGNADO', nombre: 'Asignado' },
  { valor: 'EN_ATENCION', nombre: 'En atención' }, { valor: 'CERRADO', nombre: 'Cerrado' },
  { valor: 'RECHAZADO', nombre: 'Rechazado' },
];
interface ModeloFiltros { estado: Estado | ''; id_categoria: string; id_distrito: string; fecha_desde: string; fecha_hasta: string }
const SIN_FILTROS: ModeloFiltros = { estado: '', id_categoria: '', id_distrito: '', fecha_desde: '', fecha_hasta: '' };

@Component({
  selector: 'app-bandeja-operador',
  imports: [DatePipe, FormField, RouterLink, EstadoBadge],
  templateUrl: './bandeja-operador.html',
})
export class BandejaOperador {
  private readonly operador = inject(OperadorService);
  private readonly catalogo = inject(CatalogoService);
  private readonly alertas = inject(AlertaService);
  protected readonly estados = ESTADOS;
  protected readonly categorias = signal<Catalogo[]>([]);
  protected readonly distritos = signal<Catalogo[]>([]);
  protected readonly reportes = signal<ReporteResumen[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  protected readonly modelo = signal<ModeloFiltros>({ ...SIN_FILTROS });
  protected readonly formulario = form(this.modelo, (esquema) => {
    validate(esquema.fecha_hasta, ({ value, valueOf }) => {
      const desde = valueOf(esquema.fecha_desde);
      return desde && value() && value() < desde ? { kind: 'rango', message: MENSAJE_FECHAS } : undefined;
    });
  });

  constructor() {
    void this.cargarCatalogos();
    void this.filtrar();
  }

  private async cargarCatalogos(): Promise<void> {
    try {
      const [categorias, distritos] = await Promise.all([this.catalogo.categorias(), this.catalogo.distritos()]);
      this.categorias.set(categorias);
      this.distritos.set(distritos);
    } catch (e) { this.alertas.errorHttp(e); }
  }

  protected async filtrar(evento?: Event): Promise<void> {
    evento?.preventDefault();
    if (this.formulario().invalid()) { this.formulario().markAsTouched(); return; }
    const m = this.modelo();
    const filtros: FiltrosBandeja = { estado: m.estado, idCategoria: m.id_categoria, idDistrito: m.id_distrito, fechaDesde: m.fecha_desde, fechaHasta: m.fecha_hasta };
    this.cargando.set(true);
    this.error.set('');
    try { this.reportes.set(await this.operador.bandeja(filtros)); }
    catch (e) { this.error.set(this.alertas.errorHttp(e)); }
    finally { this.cargando.set(false); }
  }

  protected limpiar(): void {
    this.formulario().reset({ ...SIN_FILTROS });
    void this.filtrar();
  }
}
