import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FiltrosBandeja, FiltrosBandejaApi, ReporteAsignar, ReporteAsignarApi, ReporteCerrarApi, ReporteDetalle, ReporteDetalleApi,
  ReporteIniciarAtencionApi, ReporteRechazarApi, ReporteResumen, ReporteResumenApi,
} from '../interfaces/reporte.interface';
import { ReporteService } from './reporte.service';

/** Bandeja y transiciones del operador (sección 7). */
@Injectable({ providedIn: 'root' })
export class OperadorService {
  private readonly http = inject(HttpClient);
  private readonly reportes = inject(ReporteService);
  private readonly url = `${environment.apiUrl}/operador/reportes`;

  /** Solo viajan los filtros con valor. */
  private filtrosHaciaApi(f: FiltrosBandeja): FiltrosBandejaApi {
    const api: FiltrosBandejaApi = {};
    if (f.estado) api.estado = f.estado;
    if (f.idCategoria) api.id_categoria = f.idCategoria;
    if (f.idDistrito) api.id_distrito = f.idDistrito;
    if (f.fechaDesde) api.fecha_desde = f.fechaDesde;
    if (f.fechaHasta) api.fecha_hasta = f.fechaHasta;
    return api;
  }
  private asignarHaciaApi(d: ReporteAsignar): ReporteAsignarApi {
    return { prioridad: d.prioridad, id_entidad: d.idEntidad };
  }

  async bandeja(filtros: FiltrosBandeja): Promise<ReporteResumen[]> {
    const params = new HttpParams({ fromObject: { ...this.filtrosHaciaApi(filtros) } });
    const r = await firstValueFrom(this.http.get<ReporteResumenApi[]>(this.url, { params }));
    return r.map(x => this.reportes.resumenDesdeApi(x));
  }
  asignar(id: number, datos: ReporteAsignar): Promise<ReporteDetalle> {
    return this.accion(id, 'asignar', this.asignarHaciaApi(datos));
  }
  rechazar(id: number, motivo: string): Promise<ReporteDetalle> {
    const cuerpo: ReporteRechazarApi = { motivo: motivo.trim() };
    return this.accion(id, 'rechazar', cuerpo);
  }
  /** Un comentario vacío se envía como null (el backend lo guarda como NULL). */
  iniciarAtencion(id: number, comentario: string): Promise<ReporteDetalle> {
    const cuerpo: ReporteIniciarAtencionApi = { comentario: comentario.trim() || null };
    return this.accion(id, 'iniciar-atencion', cuerpo);
  }
  cerrar(id: number, comentarioSolucion: string): Promise<ReporteDetalle> {
    const cuerpo: ReporteCerrarApi = { comentario_solucion: comentarioSolucion.trim() };
    return this.accion(id, 'cerrar', cuerpo);
  }

  private async accion(id: number, accion: string, cuerpo: object): Promise<ReporteDetalle> {
    return this.reportes.desdeApi(await firstValueFrom(this.http.post<ReporteDetalleApi>(`${this.url}/${id}/${accion}`, cuerpo)));
  }
}
