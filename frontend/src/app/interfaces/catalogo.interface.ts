export interface CategoriaApi { id_categoria: number; nombre: string }
export interface DistritoApi { id_distrito: number; nombre: string }
export interface Catalogo { id: number; nombre: string }
export interface EntidadApi { id_entidad: number; nombre: string; id_categoria: number }
export interface Entidad { id: number; nombre: string; idCategoria: number }
