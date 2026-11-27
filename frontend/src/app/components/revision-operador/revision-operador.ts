import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

/** F4 (Gersson): detalle y panel de acciones del operador (sección 9). Por ahora solo reserva la ruta. */
@Component({
  selector: 'app-revision-operador',
  imports: [RouterLink],
  templateUrl: './revision-operador.html',
})
export class RevisionOperador {
  protected readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
}
