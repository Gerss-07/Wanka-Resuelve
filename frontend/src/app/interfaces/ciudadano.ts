export interface Categoria { id_categoria: number; nombre: string; }
export interface Distrito { id_distrito: number; nombre: string; }
export interface ReporteResumen {
  id_reporte: number; codigo: string; categoria: Categoria; distrito: Distrito;
  estado: string; fecha_creacion: string;
}
