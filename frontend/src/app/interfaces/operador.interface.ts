import { Estado, Prioridad } from './reporte.interface';

export interface FiltrosOperador {
  estado: Estado | '';
  idCategoria: string;
  idDistrito: string;
  fechaDesde: string;
  fechaHasta: string;
}

export interface EntidadApi {
  id_entidad: number;
  nombre: string;
  id_categoria: number;
}

export interface AsignarReporteApi {
  prioridad: Prioridad;
  id_entidad: number;
}

export interface RechazarReporteApi { motivo: string }
export interface IniciarAtencionApi { comentario?: string }
export interface CerrarReporteApi { comentario_solucion: string }
