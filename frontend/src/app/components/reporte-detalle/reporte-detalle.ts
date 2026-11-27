import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReporteDetalle as Detalle } from '../../interfaces/reporte.interface';
import { ReporteService } from '../../services/reporte.service';
import { NotificationService } from '../../services/notification.service';
import { MapaSelector } from '../mapa-selector/mapa-selector';
import { EstadoBadge } from '../estado-badge/estado-badge';
@Component({ selector:'app-reporte-detalle', imports:[DatePipe, RouterLink, MapaSelector, EstadoBadge], templateUrl:'./reporte-detalle.html' })
export class ReporteDetalle {
  private api = inject(ReporteService); private avisos = inject(NotificationService);
  private id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  protected reporte = signal<Detalle | null>(null); protected cargando = signal(true); protected error = signal('');
  constructor() { void this.cargar(); }
  protected async cargar(): Promise<void> {
    this.cargando.set(true); this.error.set('');
    try { this.reporte.set(await this.api.obtener(this.id)); } catch(e) { this.error.set(this.avisos.http(e)); } finally { this.cargando.set(false); }
  }
}
