export type Rol = 'CIUDADANO' | 'OPERADOR';

/** Espejo de `Usuario` en la sección 7. */
export interface UsuarioApi { id_usuario: number; nombre: string; correo: string; rol: Rol }
/** Respuesta de POST /auth/login (sección 7). */
export interface TokenApi { access_token: string; token_type: 'bearer'; expires_in: number; usuario: UsuarioApi }
/** Cuerpo de POST /auth/registro. */
export interface UsuarioRegistroApi { nombre: string; correo: string; contrasena: string }
/** Cuerpo de POST /auth/login. */
export interface UsuarioLoginApi { correo: string; contrasena: string }

export interface Usuario { id: number; nombre: string; correo: string; rol: Rol }
export interface UsuarioRegistro { nombre: string; correo: string; contrasena: string }
/** Sesión guardada en el navegador; `expira` es la hora de vencimiento en milisegundos (epoch). */
export interface Sesion { token: string; usuario: Usuario; rol: Rol; expira: number }
