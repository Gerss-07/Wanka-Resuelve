import { Component, computed, effect, inject, signal, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideClipboardList, LucidePlusCircle } from '@lucide/angular';
import { Rol, Usuario } from '../../interfaces/auth.interface';
import { AuthService } from '../../services/auth.service';
import { ModoDevService, RolDev } from '../../services/modo-dev.service';
import { inicioPorRol, SesionService } from '../../services/sesion.service';

const NOMBRE_ROL: Record<Rol, string> = { CIUDADANO: 'Ciudadano', OPERADOR: 'Operador' };

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideClipboardList, LucidePlusCircle],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css', './panel.css'],
  encapsulation: ViewEncapsulation.None,
})
export class Layout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly sesion = inject(SesionService);
  protected readonly dev = inject(ModoDevService);
  /** Usuario del modo dev (GET /auth/me con X-Dev-Usuario-Id); solo se usa sin sesión real. */
  private readonly usuarioDev = signal<Usuario | null>(null);
  protected readonly usuario = computed(() => this.sesion.usuario() ?? this.usuarioDev());
  protected readonly rol = computed<Rol>(() => this.sesion.rol() ?? this.usuarioDev()?.rol ?? (this.dev.rol() === 'operador' ? 'OPERADOR' : 'CIUDADANO'));
  protected readonly operador = computed(() => this.rol() === 'OPERADOR');
  protected readonly nombreRol = computed(() => NOMBRE_ROL[this.rol()]);
  /** El selector «Actuar como» solo aparece sin sesión real. */
  protected readonly mostrarSelector = computed(() => this.dev.activo && !this.sesion.estaAutenticado());
  private consulta = 0;

  constructor() {
    effect(() => {
      this.dev.id();
      if (this.sesion.estaAutenticado()) { this.usuarioDev.set(null); return; }
      if (this.dev.activo) void this.cargarUsuarioDev();
    });
  }

  protected actuarComo(valor: string): void {
    const rol: RolDev = valor === 'operador' ? 'operador' : 'ciudadano';
    if (rol === this.dev.rol()) return;
    this.dev.actuarComo(rol);
    void this.router.navigateByUrl(inicioPorRol(rol === 'operador' ? 'OPERADOR' : 'CIUDADANO'));
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }

  private async cargarUsuarioDev(): Promise<void> {
    const consulta = ++this.consulta;
    this.usuarioDev.set(null);
    try {
      const usuario = await this.auth.me();
      if (consulta === this.consulta && !this.sesion.estaAutenticado()) this.usuarioDev.set(usuario);
    } catch {
      // Sin servidor o id dev inexistente: la cabecera queda sin nombre; cada pantalla muestra su error.
    }
  }
}
