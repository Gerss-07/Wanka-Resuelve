export type Rol = 'CIUDADANO' | 'OPERADOR';
/** Espejo de `Usuario` en la sección 7. */
export interface UsuarioApi { id_usuario: number; nombre: string; correo: string; rol: Rol }
export interface Usuario { id: number; nombre: string; correo: string; rol: Rol }
