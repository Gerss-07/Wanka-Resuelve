import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenApi, Usuario, UsuarioApi, UsuarioLoginApi, UsuarioRegistro, UsuarioRegistroApi } from '../interfaces/auth.interface';
import { SesionService } from './sesion.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SesionService);
  private readonly url = `${environment.apiUrl}/auth`;

  private desdeApi(u: UsuarioApi): Usuario {
    return { id: u.id_usuario, nombre: u.nombre, correo: u.correo, rol: u.rol };
  }
  private haciaApi(d: UsuarioRegistro): UsuarioRegistroApi {
    return { nombre: d.nombre.trim(), correo: d.correo.trim(), contrasena: d.contrasena };
  }

  /** Crea una cuenta de ciudadano; no inicia sesión. */
  async registrar(datos: UsuarioRegistro): Promise<Usuario> {
    return this.desdeApi(await firstValueFrom(this.http.post<UsuarioApi>(`${this.url}/registro`, this.haciaApi(datos))));
  }

  /** Pide el token y guarda la sesión en SesionService. */
  async iniciarSesion(correo: string, contrasena: string): Promise<Usuario> {
    const cuerpo: UsuarioLoginApi = { correo: correo.trim(), contrasena };
    const r = await firstValueFrom(this.http.post<TokenApi>(`${this.url}/login`, cuerpo));
    const usuario = this.desdeApi(r.usuario);
    this.sesion.guardar({ token: r.access_token, usuario, rol: usuario.rol, expira: Date.now() + r.expires_in * 1000 });
    return usuario;
  }

  /** Usuario de la sesión actual (sin sesión y con el modo dev, el de X-Dev-Usuario-Id). */
  async me(): Promise<Usuario> {
    return this.desdeApi(await firstValueFrom(this.http.get<UsuarioApi>(`${this.url}/me`)));
  }

  /** Borra la sesión del navegador; el token sigue válido hasta que vence (sección 14). */
  cerrarSesion(): void {
    this.sesion.cerrar();
  }
}
