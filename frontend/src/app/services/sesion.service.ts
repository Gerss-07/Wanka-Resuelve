import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { Rol, Sesion } from '../interfaces/auth.interface';

export const CLAVE_SESION = 'wanka.sesion';
// setTimeout no admite esperas mayores (≈ 24,8 días).
const ESPERA_MAXIMA = 2_147_483_647;

/** Pantalla inicial de cada rol (sección 9). */
export function inicioPorRol(rol: Rol): string {
  return rol === 'OPERADOR' ? '/operador/reportes' : '/ciudadano/reportes';
}

/** Un destino interno que el rol puede abrir (evita redirecciones a otros sitios). */
export function destinoPermitido(destino: string | null | undefined, rol: Rol): destino is string {
  if (!destino || !destino.startsWith('/') || destino.startsWith('//')) return false;
  const prefijo = rol === 'OPERADOR' ? '/operador' : '/ciudadano';
  return destino === prefijo || destino.startsWith(prefijo + '/') || destino.startsWith(prefijo + '?');
}

function esSesion(valor: unknown): valor is Sesion {
  const s = valor as Sesion | null;
  return !!s && typeof s.token === 'string' && !!s.token && typeof s.expira === 'number'
    && (s.rol === 'CIUDADANO' || s.rol === 'OPERADOR') && !!s.usuario
    && typeof s.usuario.id === 'number' && typeof s.usuario.nombre === 'string' && s.usuario.rol === s.rol;
}

/** Guarda la sesión en localStorage (sección 9). No usa HttpClient. */
@Injectable({ providedIn: 'root' })
export class SesionService implements OnDestroy {
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly actual = signal<Sesion | null>(null);
  private temporizador?: ReturnType<typeof setTimeout>;

  readonly token = computed(() => this.actual()?.token ?? null);
  readonly usuario = computed(() => this.actual()?.usuario ?? null);
  readonly rol = computed(() => this.actual()?.rol ?? null);
  readonly estaAutenticado = computed(() => this.actual() !== null);

  constructor() {
    this.activar(this.leer());
  }

  guardar(sesion: Sesion): void {
    if (sesion.expira <= Date.now()) { this.cerrar(); return; }
    if (this.navegador) {
      try { localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion)); } catch { /* almacenamiento no disponible */ }
    }
    this.activar(sesion);
  }

  cerrar(): void {
    clearTimeout(this.temporizador);
    this.actual.set(null);
    if (!this.navegador) return;
    try { localStorage.removeItem(CLAVE_SESION); } catch { /* almacenamiento no disponible */ }
  }

  ngOnDestroy(): void { clearTimeout(this.temporizador); }

  /** Programa el cierre al vencer: una sesión vencida se considera cerrada. */
  private activar(sesion: Sesion | null): void {
    clearTimeout(this.temporizador);
    this.actual.set(sesion);
    if (!sesion || !this.navegador) return;
    this.temporizador = setTimeout(() => this.cerrar(), Math.min(sesion.expira - Date.now(), ESPERA_MAXIMA));
  }

  private leer(): Sesion | null {
    if (!this.navegador) return null;
    try {
      const texto = localStorage.getItem(CLAVE_SESION);
      if (!texto) return null;
      const sesion: unknown = JSON.parse(texto);
      if (esSesion(sesion) && sesion.expira > Date.now()) return sesion;
      localStorage.removeItem(CLAVE_SESION);
    } catch { /* dato corrupto o almacenamiento no disponible */ }
    return null;
  }
}
