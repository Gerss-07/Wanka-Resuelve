import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideClock, LucideImage, LucideMapPin, LucideFileText, LucideBuilding2 } from '@lucide/angular';
import { ReporteDetalle } from '../../interfaces/reporte.interface';
import { errorOperador } from '../../services/operador.service';
import { ReporteService } from '../../services/reporte.service';
import { AlertaService } from '../../services/alerta.service';
import { EstadoBadge } from '../estado-badge/estado-badge';
import { MapaSelector } from '../mapa-selector/mapa-selector';
import { AccionesOperador } from './acciones-operador';

@Component({
  selector: 'app-revision-operador',
  imports: [DatePipe, TitleCasePipe, RouterLink, EstadoBadge, MapaSelector, AccionesOperador,
    LucideArrowLeft, LucideClock, LucideImage, LucideMapPin, LucideFileText, LucideBuilding2],
  templateUrl: './revision-operador.html',
  styleUrl: './revision-operador.scss',
})
export class RevisionOperador {
  private readonly api = inject(ReporteService);
  private readonly avisos = inject(AlertaService);
  private id = 0;
  private consulta = 0;
  protected readonly reporte = signal<ReporteDetalle | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly conflicto = signal('');
  protected readonly confirmacion = signal('');

  constructor() {
    inject(ActivatedRoute).paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.id = Number(params.get('id'));
      this.conflicto.set('');
      this.confirmacion.set('');
      void this.cargar();
    });
  }

  protected async cargar(): Promise<void> {
    const consulta = ++this.consulta;
    this.reporte.set(null);
    this.error.set('');
    if (!Number.isSafeInteger(this.id) || this.id < 1) {
      this.error.set('El identificador del reporte no es válido.');
      this.cargando.set(false);
      return;
    }
    this.cargando.set(true);
    try {
      const reporte = await this.api.obtener(this.id);
      if (consulta === this.consulta) this.reporte.set(reporte);
    } catch (error) {
      if (consulta === this.consulta) {
        this.error.set(errorOperador(error, 'No se pudo abrir el reporte.'));
        void this.avisos.error(this.error());
      }
    } finally {
      if (consulta === this.consulta) this.cargando.set(false);
    }
  }

  protected actualizado(resultado: { reporte: ReporteDetalle; mensaje: string }): void {
    if (this.cargando() || resultado.reporte.id !== this.id) return;
    this.reporte.set(resultado.reporte);
    this.confirmacion.set(resultado.mensaje);
    this.conflicto.set('');
  }

  protected actualizarTrasConflicto(mensaje: string): void {
    if (this.cargando()) return;
    this.conflicto.set(mensaje);
    this.confirmacion.set('');
    void this.cargar();
  }
}
