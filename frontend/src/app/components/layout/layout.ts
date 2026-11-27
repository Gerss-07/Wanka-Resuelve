import { Component, inject, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideClipboardList, LucideHouse, LucideMapPin, LucidePlusCircle } from '@lucide/angular';
import { ReporteService } from '../../services/reporte.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideHouse, LucideClipboardList, LucidePlusCircle, LucideMapPin],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss', './panel.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class Layout {
  protected readonly ciudadano = inject(ReporteService).ciudadano;
  protected readonly modoDesarrollo = !environment.production && !!environment.devUsuarios;
}
