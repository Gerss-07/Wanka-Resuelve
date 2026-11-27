import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Usuario, UsuarioApi } from '../interfaces/auth.interface';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auth`;

  private desdeApi(u: UsuarioApi): Usuario {
    return { id: u.id_usuario, nombre: u.nombre, correo: u.correo, rol: u.rol };
  }

  /** Usuario de la sesión actual (con el modo dev, el de X-Dev-Usuario-Id). */
  async me(): Promise<Usuario> {
    return this.desdeApi(await firstValueFrom(this.http.get<UsuarioApi>(`${this.url}/me`)));
  }

  // Login y registro se conectan en F5.
  iniciarSesion(_correo: string, _contrasena: string): Observable<never> {
    return throwError(() => new Error('Autenticación no disponible'));
  }
  registrar(_nombre: string, _correo: string, _contrasena: string): Observable<never> {
    return throwError(() => new Error('Registro no disponible'));
  }
}
