import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AsignarReporteApi, CerrarReporteApi, FiltrosOperador, IniciarAtencionApi, RechazarReporteApi,
} from '../interfaces/operador.interface';
import { Prioridad, ReporteDetalle, ReporteDetalleApi, ReporteResumen, ReporteResumenApi } from '../interfaces/reporte.interface';
import { detalleDesdeApi, resumenDesdeApi } from './reporte.service';

@Injectable({ providedIn: 'root' })
export class OperadorService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/operador/reportes`;

  async listar(filtros: FiltrosOperador): Promise<ReporteResumen[]> {
    const valores = {
      estado: filtros.estado,
      id_categoria: filtros.idCategoria,
      id_distrito: filtros.idDistrito,
      fecha_desde: filtros.fechaDesde,
      fecha_hasta: filtros.fechaHasta,
    };
    const params = new HttpParams({
      fromObject: Object.fromEntries(Object.entries(valores).filter(([, valor]) => valor !== '')),
    });
    const reportes = await firstValueFrom(this.http.get<ReporteResumenApi[]>(this.url, { params }));
    return reportes.map(resumenDesdeApi);
  }

  asignar(id: number, prioridad: Prioridad, idEntidad: number): Promise<ReporteDetalle> {
    return this.transicion(id, 'asignar', { prioridad, id_entidad: idEntidad });
  }

  rechazar(id: number, motivo: string): Promise<ReporteDetalle> {
    return this.transicion(id, 'rechazar', { motivo: motivo.trim() });
  }

  iniciarAtencion(id: number, comentario: string): Promise<ReporteDetalle> {
    const texto = comentario.trim();
    return this.transicion(id, 'iniciar-atencion', texto ? { comentario: texto } : {});
  }

  cerrar(id: number, solucion: string): Promise<ReporteDetalle> {
    return this.transicion(id, 'cerrar', { comentario_solucion: solucion.trim() });
  }

  private async transicion(
    id: number,
    accion: 'asignar' | 'rechazar' | 'iniciar-atencion' | 'cerrar',
    datos: AsignarReporteApi | RechazarReporteApi | IniciarAtencionApi | CerrarReporteApi,
  ): Promise<ReporteDetalle> {
    return detalleDesdeApi(await firstValueFrom(
      this.http.post<ReporteDetalleApi>(`${this.url}/${id}/${accion}`, datos),
    ));
  }
}

export function errorOperador(error: unknown, alternativo: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se pudo conectar con FastAPI.';
    if (error.status === 404 && error.error?.detail === 'Not Found') {
      return `${alternativo.replace(/\.$/, '')} (HTTP 404).`;
    }
    if ([401, 403, 404, 409, 422].includes(error.status)) {
      const detalle: unknown = error.error?.detail;
      if (typeof detalle === 'string' && detalle.trim()) return detalle;
    }
  }
  return alternativo;
}
