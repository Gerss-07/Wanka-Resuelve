import { afterNextRender, Component, effect, ElementRef, input, OnDestroy, output, signal, viewChild } from '@angular/core';
import type * as Leaflet from 'leaflet';
export interface Punto { latitud: number; longitud: number }
@Component({
  selector: 'app-mapa-selector',
  template: `
    <div #mapa class="mapa" aria-label="Mapa de ubicación"></div>
    @if (!soloLectura()) {
      <p>Haz clic en el mapa o desplázalo con las flechas y marca su centro.</p>
      <button class="f3-secondary" type="button" [disabled]="!listo()" (click)="marcarCentro()">Marcar centro del mapa</button>
    }
  `,
  styles: [`.mapa { height:clamp(250px, 45vh, 360px); width:100%; border-radius:12px; background:#e7efec; z-index:0; } p { color:#52676c; font-size:.85rem; }`]
})
export class MapaSelector implements OnDestroy {
  readonly punto = input<Punto | null>(null);
  readonly soloLectura = input(false);
  readonly cambio = output<Punto>();
  protected readonly listo = signal(false);
  private readonly elemento = viewChild.required<ElementRef<HTMLDivElement>>('mapa');
  private mapa?: Leaflet.Map;
  private marcador?: Leaflet.CircleMarker;
  private L?: typeof Leaflet;
  private destruido = false;
  constructor() {
    effect(() => { const punto = this.punto(); if (this.mapa && this.L) this.dibujar(punto); });
    afterNextRender(async () => {
      const L = await import('leaflet');
      if (this.destruido) return;
      this.L = L;
      this.mapa = L.map(this.elemento().nativeElement).setView([-12.0651, -75.2049], 14);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.mapa);
      this.mapa.on('click', e => this.marcar(e.latlng));
      this.dibujar(this.punto());
      this.listo.set(true);
    });
  }
  protected marcarCentro(): void {
    if (this.mapa) this.marcar(this.mapa.getCenter());
  }
  private marcar(coordenadas: Leaflet.LatLng): void {
    if (this.soloLectura()) return;
    const punto = coordenadas.wrap();
    this.cambio.emit({ latitud: punto.lat, longitud: punto.lng });
  }
  private dibujar(punto: Punto | null): void {
    if (!this.mapa || !this.L) return;
    if (!punto) { this.marcador?.remove(); this.marcador = undefined; return; }
    const coords: Leaflet.LatLngExpression = [punto.latitud, punto.longitud];
    if (this.marcador) this.marcador.setLatLng(coords);
    else this.marcador = this.L.circleMarker(coords, { radius: 9, color: '#006e68', fillOpacity: .8 }).addTo(this.mapa);
    this.mapa.panTo(coords);
  }
  ngOnDestroy(): void { this.destruido = true; this.mapa?.remove(); }
}
