import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, HostListener, inject, output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  readonly acceso = output<string>();
  protected menuAbierto = false;
  protected seccionActiva = '';
  private readonly documento = inject(DOCUMENT);
  private readonly router = inject(Router);

  constructor() {
    afterNextRender(() => {
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

  protected abrirAcceso(titulo: string): void {
    this.menuAbierto = false;
    this.acceso.emit(titulo);
  }
}
