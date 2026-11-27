import { afterNextRender, Component, computed, ElementRef, inject, Injector, signal, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { form, FormField } from '@angular/forms/signals';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { LucideClipboardList, LucideLayoutDashboard, LucideMapPin, LucidePanelLeft, LucideSearch, LucideSlidersHorizontal } from '@lucide/angular';
import { filter, map } from 'rxjs';

@Component({
  selector: 'app-operador-layout',
  imports: [RouterLink, RouterOutlet, FormField, LucideClipboardList, LucideLayoutDashboard, LucideMapPin, LucidePanelLeft, LucideSearch, LucideSlidersHorizontal],
  templateUrl: './operador-layout.html',
  styleUrls: ['./operador-layout.scss', './operador-controles.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class OperadorLayout {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly navegaciones = this.router.events.pipe(
    filter(evento => evento instanceof NavigationEnd),
    map(evento => this.router.parseUrl(evento.urlAfterRedirects)),
  );
  private readonly ubicacion = toSignal(this.navegaciones, { initialValue: this.router.parseUrl(this.router.url) });
  private readonly busqueda = signal({ codigo: '' });
  protected readonly formulario = form(this.busqueda);
  protected readonly compacto = signal(false);
  protected readonly seccion = computed(() => {
    const actual = this.ubicacion();
    if ((actual.root.children['primary']?.segments.length ?? 0) > 2) return 'detalle';
    if (actual.fragment === 'filtros' || actual.fragment === 'resultados') return actual.fragment;
    return 'dashboard';
  });
  protected readonly titulo = computed(() => ({
    dashboard: 'Dashboard', resultados: 'Reportes', filtros: 'Gestión de incidencias', detalle: 'Revisión de incidencia',
  }[this.seccion()]));

  constructor() {
    this.navegaciones.pipe(takeUntilDestroyed()).subscribe(url => {
      this.busqueda.set({ codigo: url.queryParamMap.get('codigo') ?? '' });
      const seccion = this.seccion();
      afterNextRender(() => {
        if (this.seccion() === seccion) this.enfocarSeccion(seccion);
      }, { injector: this.injector });
    });
  }

  protected buscar(evento: Event): void {
    evento.preventDefault();
    const destino = this.router.createUrlTree(['/operador/reportes'], {
      queryParams: { codigo: this.busqueda().codigo.trim() || null },
      queryParamsHandling: 'merge',
      fragment: 'resultados',
    });
    if (this.router.serializeUrl(destino) === this.router.url) {
      this.enfocarSeccion('resultados');
      return;
    }
    void this.router.navigateByUrl(destino);
  }

  protected enfocarContenido(event: Event, contenido: HTMLElement): void {
    event.preventDefault();
    contenido.focus();
  }

  protected enfocarSiActiva(seccion: string): void {
    if (this.seccion() === seccion) this.enfocarSeccion(seccion);
  }

  private enfocarSeccion(seccion: string): void {
    const elemento = this.elemento.nativeElement;
    if (seccion === 'filtros' || seccion === 'resultados') {
      const destino = elemento.querySelector<HTMLElement>(`#${seccion}`);
      destino?.focus({ preventScroll: true });
      destino?.scrollIntoView?.({ block: 'start' });
      return;
    }
    const ventana = elemento.ownerDocument.defaultView;
    if (ventana?.scrollY) ventana.scrollTo(0, 0);
  }
}
