import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowUpRight, LucideClipboardList, LucideSlidersHorizontal } from '@lucide/angular';
import { map } from 'rxjs';
import { Catalogo } from '../../interfaces/catalogo.interface';
import { FiltrosOperador } from '../../interfaces/operador.interface';
import { Estado, ReporteResumen } from '../../interfaces/reporte.interface';
import { CatalogoService } from '../../services/catalogo.service';
import { AlertaService } from '../../services/alerta.service';
import { errorOperador, OperadorService } from '../../services/operador.service';
import { EstadoBadge } from '../estado-badge/estado-badge';
import { ResumenOperador } from './resumen-operador';

const SIN_FILTROS: FiltrosOperador = {
  estado: '', idCategoria: '', idDistrito: '', fechaDesde: '', fechaHasta: '',
};

@Component({
  selector: 'app-bandeja-operador',
  imports: [DatePipe, TitleCasePipe, FormField, RouterLink, EstadoBadge, LucideArrowUpRight, LucideClipboardList, LucideSlidersHorizontal, ResumenOperador],
  templateUrl: './bandeja-operador.html',
  styleUrl: './bandeja-operador.scss',
})
export class BandejaOperador {
  private readonly api = inject(OperadorService);
  private readonly catalogo = inject(CatalogoService);
  private readonly avisos = inject(AlertaService);
  private readonly route = inject(ActivatedRoute);
  private readonly modelo = signal({ ...SIN_FILTROS });
  private aplicados = SIN_FILTROS;
  protected readonly filtros = form(this.modelo, campos => {
    validate(campos.fechaHasta, ({ value, valueOf }) => {
      const desde = valueOf(campos.fechaDesde);
      const hasta = value();
      return desde && hasta && desde > hasta
        ? { kind: 'rango', message: 'La fecha final debe ser igual o posterior a la fecha inicial.' }
        : null;
    });
  });

  protected readonly estados: { valor: Estado; nombre: string }[] = [
    { valor: 'RECIBIDO', nombre: 'Recibido' },
    { valor: 'ASIGNADO', nombre: 'Asignado' },
    { valor: 'EN_ATENCION', nombre: 'En atención' },
    { valor: 'CERRADO', nombre: 'Cerrado' },
    { valor: 'RECHAZADO', nombre: 'Rechazado' },
  ];
  protected readonly categorias = signal<Catalogo[]>([]);
  protected readonly distritos = signal<Catalogo[]>([]);
  protected readonly reportes = signal<ReporteResumen[]>([]);
  protected readonly codigo = toSignal(this.route.queryParamMap.pipe(
    map(params => (params.get('codigo') ?? '').trim()),
  ), { initialValue: '' });
  protected readonly reportesVisibles = computed(() => {
    const codigo = this.codigo().toUpperCase();
    return this.reportes().filter(reporte => reporte.codigo.toUpperCase().includes(codigo));
  });
  protected readonly cargando = signal(false);
  protected readonly cargandoCatalogos = signal(false);
  protected readonly error = signal('');
  protected readonly errorCatalogos = signal('');

  constructor() {
    void this.cargarCatalogos();
    void this.cargar();
  }

  protected async cargarCatalogos(): Promise<void> {
    this.cargandoCatalogos.set(true);
    this.errorCatalogos.set('');
    try {
      const [categorias, distritos] = await Promise.all([this.catalogo.categorias(), this.catalogo.distritos()]);
      this.categorias.set(categorias);
      this.distritos.set(distritos);
    } catch (error) {
      this.errorCatalogos.set(errorOperador(error, 'No se pudieron cargar las categorías y los distritos.'));
      void this.avisos.error(this.errorCatalogos());
    } finally {
      this.cargandoCatalogos.set(false);
    }
  }

  protected aplicar(evento: Event): void {
    evento.preventDefault();
    if (this.cargando()) return;
    void submit(this.filtros, async () => {
      this.aplicados = { ...this.modelo() };
      await this.cargar();
    });
  }

  protected limpiar(): void {
    if (this.cargando()) return;
    this.filtros().reset({ ...SIN_FILTROS });
    this.aplicados = SIN_FILTROS;
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.error.set('');
    try {
      this.reportes.set(await this.api.listar(this.aplicados));
    } catch (error) {
      this.error.set(errorOperador(error, 'FastAPI no pudo cargar la bandeja del operador.'));
      void this.avisos.error(this.error());
    } finally {
      this.cargando.set(false);
    }
  }
}
