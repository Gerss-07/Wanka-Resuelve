import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export type RolDev = 'ciudadano' | 'operador';
export const CLAVE_USUARIO_DEV = 'wanka.devUsuarioId';

/**
 * Identidad temporal «Actuar como» (sección 10, antes de F5). Guarda el id en localStorage.
 * Se elimina junto con X-Dev-Usuario-Id al terminar la fase 5.
 */
@Injectable({ providedIn: 'root' })
export class ModoDevService {
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  readonly usuarios = environment.production ? null : environment.devUsuarios;
  readonly activo = !!this.usuarios;
  private readonly actual = signal<number | null>(this.leer());
  readonly id = this.actual.asReadonly();
  readonly rol = computed<RolDev | null>(() => {
    const id = this.actual();
    if (!this.usuarios || id === null) return null;
    return id === this.usuarios.operador ? 'operador' : 'ciudadano';
  });

  actuarComo(rol: RolDev): void {
    if (!this.usuarios) return;
    const id = this.usuarios[rol];
    this.actual.set(id);
    if (!this.navegador) return;
    try { localStorage.setItem(CLAVE_USUARIO_DEV, String(id)); } catch { /* almacenamiento no disponible */ }
  }

  private leer(): number | null {
    if (!this.usuarios) return null;
    if (this.navegador) {
      try {
        const guardado = Number(localStorage.getItem(CLAVE_USUARIO_DEV));
        if (guardado === this.usuarios.ciudadano || guardado === this.usuarios.operador) return guardado;
      } catch { /* almacenamiento no disponible */ }
    }
    return this.usuarios.ciudadano;
  }
}
