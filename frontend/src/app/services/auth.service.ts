import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

/** No se envían credenciales hasta que Kerry publique y confirme el contrato HTTP. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  iniciarSesion(_correo: string, _contrasena: string): Observable<never> {
    return throwError(() => new Error('Autenticación no disponible'));
  }
  registrar(_nombre: string, _correo: string, _contrasena: string): Observable<never> {
    return throwError(() => new Error('Registro no disponible'));
  }
}
