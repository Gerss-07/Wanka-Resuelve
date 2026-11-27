import { CategoriaApi, DistritoApi, Catalogo } from './catalogo.interface';
export type Estado = 'RECIBIDO' | 'ASIGNADO' | 'EN_ATENCION' | 'CERRADO' | 'RECHAZADO';
export interface ReporteResumenApi {
  id_reporte: number; codigo: string; ciudadano: { id_usuario: number; nombre: string };
  categoria: CategoriaApi; distrito: DistritoApi; estado: Estado;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | null; fecha_creacion: string;
}
export interface ReporteDetalleApi extends ReporteResumenApi {
  descripcion: string; referencia: string; latitud: number; longitud: number;
  entidad: { id_entidad: number; nombre: string; id_categoria: number } | null;
  motivo_rechazo: string | null; comentario_solucion: string | null;
  fotos: { id_foto: number; url: string }[];
  historial: { estado_anterior: Estado | null; estado_nuevo: Estado; usuario: { id_usuario: number; nombre: string; rol: string }; comentario: string | null; fecha: string }[];
  fecha_actualizacion: string;
}
export interface ReporteResumen {
  id: number; codigo: string; ciudadano: string; categoria: Catalogo; distrito: Catalogo;
  estado: Estado; prioridad: string | null; fechaCreacion: string;
}
export interface ReporteDetalle extends ReporteResumen {
  descripcion: string; referencia: string; latitud: number; longitud: number; entidad: string | null;
  motivoRechazo: string | null; comentarioSolucion: string | null; fotos: { id: number; url: string }[];
  historial: { anterior: Estado | null; nuevo: Estado; usuario: string; comentario: string | null; fecha: string }[];
  fechaActualizacion: string;
}
export interface ReporteDatos { idCategoria: number; idDistrito: number; descripcion: string; referencia: string; latitud: number; longitud: number }
export interface ReporteDatosApi { id_categoria: number; id_distrito: number; descripcion: string; referencia: string; latitud: number; longitud: number }

export type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA';
/** Filtros de la bandeja; '' significa «sin filtro». Fechas AAAA-MM-DD. */
export interface FiltrosBandeja { estado: Estado | ''; idCategoria: string; idDistrito: string; fechaDesde: string; fechaHasta: string }
export interface FiltrosBandejaApi { estado?: Estado; id_categoria?: string; id_distrito?: string; fecha_desde?: string; fecha_hasta?: string }
export interface ReporteAsignar { prioridad: Prioridad; idEntidad: number }
export interface ReporteAsignarApi { prioridad: Prioridad; id_entidad: number }
export interface ReporteRechazarApi { motivo: string }
export interface ReporteIniciarAtencionApi { comentario: string | null }
export interface ReporteCerrarApi { comentario_solucion: string }
