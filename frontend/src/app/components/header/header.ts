import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, computed, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { inicioPorRol, SesionService } from '../../services/sesion.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  protected menuAbierto = false;
  protected seccionActiva = '';
  private readonly documento = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  // La portada se prerenderiza sin sesión; los botones de sesión se muestran después de hidratar.
  private readonly enNavegador = signal(false);
  protected readonly conSesion = computed(() => this.enNavegador() && this.sesion.estaAutenticado());
  protected readonly miPanel = computed(() => { const rol = this.sesion.rol(); return rol ? inicioPorRol(rol) : '/'; });

  constructor() {
    afterNextRender(() => {
      this.enNavegador.set(true);
      const id = this.documento.defaultView?.location.hash.slice(1);
      if (id && this.documento.getElementById(id)) {
        this.desplazar(id);
      }
    });
  }

  protected navegar(evento: MouseEvent, id: string): void {
    this.menuAbierto = false;
    const ventana = this.documento.defaultView;
    const destino = this.documento.getElementById(id);
    if (!ventana || evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;

    if (ventana.location.pathname !== new URL(this.documento.baseURI).pathname) {
      evento.preventDefault();
      void this.router.navigate(['/'], { fragment: id }).then((ok) => {
        if (ok) this.desplazar(id);
      });
      return;
    }
    if (!destino) return;

    evento.preventDefault();
    if (ventana.location.hash !== `#${id}`) {
      ventana.history.pushState(null, '', `#${id}`);
    }
    this.desplazar(id);
  }

  protected cerrarSesion(): void {
    this.menuAbierto = false;
    // Igual que AuthService.cerrarSesion, sin traer HttpClient a la portada.
    this.sesion.cerrar();
    void this.router.navigateByUrl('/');
  }

  protected irInicio(evento: MouseEvent): void {
    this.menuAbierto = false;
    const ventana = this.documento.defaultView;
    if (!ventana || evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
    evento.preventDefault();
    if (ventana.location.pathname !== new URL(this.documento.baseURI).pathname) {
      void this.router.navigateByUrl('/').then((ok) => {
        if (ok) this.desplazar('inicio');
      });
      return;
    }
    if (ventana.location.hash) ventana.history.pushState(null, '', ventana.location.pathname + ventana.location.search);
    this.desplazar('inicio');
  }

  private desplazar(id: string): void {
    this.documento.defaultView?.requestAnimationFrame(() => {
      if (id === 'inicio') {
        this.documento.defaultView?.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        this.documento.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    });
  }

  @HostListener('window:scroll')
  protected actualizarSeccion(): void {
    const ids = ['categorias', 'noticias', 'galeria', 'como-funciona', 'distritos'];
    const limite = 140;
    this.seccionActiva = ids.filter((id) => {
      const elemento = this.documento.getElementById(id);
      return elemento && elemento.getBoundingClientRect().top <= limite;
    }).at(-1) ?? '';
  }
}
