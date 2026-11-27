import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ReporteDatos, ReporteDatosApi, ReporteDetalle, ReporteDetalleApi, ReporteResumen, ReporteResumenApi } from '../interfaces/reporte.interface';
@Injectable({ providedIn: 'root' })
export class ReporteService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/reportes`;
  private resumenDesdeApi(r: ReporteResumenApi): ReporteResumen {
    return { id: r.id_reporte, codigo: r.codigo, ciudadano: r.ciudadano.nombre, categoria: { id: r.categoria.id_categoria, nombre: r.categoria.nombre }, distrito: { id: r.distrito.id_distrito, nombre: r.distrito.nombre }, estado: r.estado, prioridad: r.prioridad, fechaCreacion: r.fecha_creacion };
  }
  private desdeApi(r: ReporteDetalleApi): ReporteDetalle {
    return { ...this.resumenDesdeApi(r), descripcion: r.descripcion, referencia: r.referencia, latitud: Number(r.latitud), longitud: Number(r.longitud), entidad: r.entidad?.nombre ?? null, motivoRechazo: r.motivo_rechazo, comentarioSolucion: r.comentario_solucion, fotos: r.fotos.map(f => ({ id: f.id_foto, url: new URL(f.url, environment.apiUrl).href })), historial: r.historial.map(h => ({ anterior: h.estado_anterior, nuevo: h.estado_nuevo, usuario: h.usuario.nombre, comentario: h.comentario, fecha: h.fecha })).sort((a,b) => a.fecha.localeCompare(b.fecha)), fechaActualizacion: r.fecha_actualizacion };
  }
  private haciaApi(d: ReporteDatos): ReporteDatosApi {
    return { id_categoria: d.idCategoria, id_distrito: d.idDistrito, descripcion: d.descripcion.trim(), referencia: d.referencia.trim(), latitud: d.latitud, longitud: d.longitud };
  }
  async listar(): Promise<ReporteResumen[]> {
    const reportes = await firstValueFrom(this.http.get<ReporteResumenApi[]>(`${this.url}/mis-reportes`));
    return reportes.map(r => this.resumenDesdeApi(r));
  }
  async obtener(id: number): Promise<ReporteDetalle> { return this.desdeApi(await firstValueFrom(this.http.get<ReporteDetalleApi>(`${this.url}/${id}`))); }
  async crear(datos: ReporteDatos, fotos: File[]): Promise<ReporteDetalle> {
    const form = new FormData();
    Object.entries(this.haciaApi(datos)).forEach(([k,v]) => form.append(k, String(v)));
    fotos.forEach(f => form.append('fotos', f));
    const r = await firstValueFrom(this.http.post<ReporteDetalleApi>(this.url, form, { observe: 'response' }));
    if (r.status !== 201 || !r.body) throw new Error('Respuesta inesperada');
    return this.desdeApi(r.body);
  }
  async editar(id: number, datos: ReporteDatos): Promise<ReporteDetalle> {
    const r = await firstValueFrom(this.http.put<ReporteDetalleApi>(`${this.url}/${id}`, this.haciaApi(datos), { observe: 'response' }));
    if (r.status !== 200 || !r.body) throw new Error('Respuesta inesperada');
    return this.desdeApi(r.body);
  }
  async eliminar(id: number): Promise<void> {
    const r = await firstValueFrom(this.http.delete(`${this.url}/${id}`, { observe: 'response' }));
    if (r.status !== 204) throw new Error('Respuesta inesperada');
  }
}
