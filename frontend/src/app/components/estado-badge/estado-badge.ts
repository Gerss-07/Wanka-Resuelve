import { Component, input } from '@angular/core';
import { Estado } from '../../interfaces/reporte.interface';
@Component({
  selector: 'app-estado-badge',
  template: `<span class="badge" [attr.data-estado]="estado()">{{ nombres[estado()] }}</span>`,
  styles: [`
    .badge { display:inline-block; background:#eaf1ff; color:#1749a3; border-radius:2rem; padding:.25rem .65rem; font-size:.74rem; font-weight:800; white-space:nowrap; }
    [data-estado=ASIGNADO] { background:#e5f2fb; color:#21587b; }
    [data-estado=EN_ATENCION] { background:#def4f3; color:#006268; }
    [data-estado=CERRADO] { background:#e3f5ec; color:#195a42; }
    [data-estado=RECHAZADO] { background:#fbeee8; color:#8d3c2d; }
  `],
})
export class EstadoBadge {
  readonly estado = input.required<Estado>();
  protected readonly nombres: Record<Estado, string> = {
    RECIBIDO: 'Recibido', ASIGNADO: 'Asignado', EN_ATENCION: 'En atención',
    CERRADO: 'Cerrado', RECHAZADO: 'Rechazado',
  };
}
