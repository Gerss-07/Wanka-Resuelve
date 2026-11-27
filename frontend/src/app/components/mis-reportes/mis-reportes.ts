import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowRight, LucideMapPin, LucidePlus } from '@lucide/angular';
import { EstadoBadge } from '../estado-badge/estado-badge';
import { ReporteResumen } from '../../interfaces/reporte.interface';
import { ReporteService } from '../../services/reporte.service';
import { NotificationService } from '../../services/notification.service';
import { estadosReporte, ResumenReportes } from './resumen-reportes';

@Component({
  selector: 'app-mis-reportes',
  imports: [DatePipe, RouterLink, EstadoBadge, ResumenReportes, LucideArrowRight, LucideMapPin, LucidePlus],
  templateUrl: './mis-reportes.html',
})
export class MisReportes {
  private api = inject(ReporteService); private avisos = inject(NotificationService);
  private readonly ruta = inject(ActivatedRoute);
  protected readonly inicio = this.ruta.snapshot.data['vista'] === 'inicio';
  protected readonly seguimiento = this.ruta.snapshot.data['vista'] === 'seguimiento';
  protected readonly estados = estadosReporte;
  protected readonly filtro = signal('');
  protected reportes = signal<ReporteResumen[]>([]); protected cargando = signal(true); protected error = signal(''); protected eliminando = signal<number | null>(null);
  protected readonly visibles = computed(() => {
    const ordenados = [...this.reportes()].sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion) || b.id - a.id);
    if (this.inicio) return ordenados.slice(0, 5);
    return ordenados.filter(r => !this.filtro() || r.estado === this.filtro());
  });
  constructor() { void this.cargar(); }
  protected async cargar(): Promise<void> {
    this.cargando.set(true); this.error.set('');
    try { this.reportes.set(await this.api.listar()); } catch (e) { this.error.set(this.avisos.http(e, 'El listado de reportes todavía no está disponible en el servidor.')); }
    finally { this.cargando.set(false); }
  }
  protected async eliminar(reporte: ReporteResumen): Promise<void> {
    if (this.eliminando() !== null || reporte.estado !== 'RECIBIDO') return;
    this.eliminando.set(reporte.id);
    try {
      const confirmado = await firstValueFrom(this.avisos.confirm('Eliminar reporte', `¿Eliminar ${reporte.codigo}? Esta acción no se puede deshacer.`));
      if (!confirmado) return;
      await this.api.eliminar(reporte.id);
      this.reportes.update(reportes => reportes.filter(r => r.id !== reporte.id));
      this.avisos.success('Reporte eliminado correctamente.');
      await this.cargar();
    }
    catch (e) { this.avisos.http(e); await this.cargar(); }
    finally { this.eliminando.set(null); }
  }
}
