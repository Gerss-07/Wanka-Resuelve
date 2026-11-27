import { Component, computed, effect, inject, signal, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideClipboardList, LucidePlusCircle } from '@lucide/angular';
import { Usuario } from '../../interfaces/auth.interface';
import { AuthService } from '../../services/auth.service';
import { ModoDevService, RolDev } from '../../services/modo-dev.service';

const INICIO_POR_ROL: Record<RolDev, string> = { ciudadano: '/ciudadano/reportes', operador: '/operador/reportes' };

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideClipboardList, LucidePlusCircle],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss', './panel.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class Layout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly dev = inject(ModoDevService);
  protected readonly usuario = signal<Usuario | null>(null);
  protected readonly operador = computed(() => (this.usuario()?.rol ?? (this.dev.rol() === 'operador' ? 'OPERADOR' : 'CIUDADANO')) === 'OPERADOR');
  private consulta = 0;

  constructor() {
    // El nombre sale de GET /auth/me, no de los reportes; se vuelve a pedir al cambiar de identidad.
    effect(() => {
      this.dev.id();
      void this.cargarUsuario();
    });
  }

  protected actuarComo(valor: string): void {
    const rol: RolDev = valor === 'operador' ? 'operador' : 'ciudadano';
    if (rol === this.dev.rol()) return;
    this.dev.actuarComo(rol);
    void this.router.navigateByUrl(INICIO_POR_ROL[rol]);
  }

  private async cargarUsuario(): Promise<void> {
    const consulta = ++this.consulta;
    this.usuario.set(null);
    try {
      const usuario = await this.auth.me();
      if (consulta === this.consulta) this.usuario.set(usuario);
    } catch {
      // Sin sesión o sin servidor: la cabecera queda sin nombre; cada pantalla muestra su propio error.
    }
  }
}
