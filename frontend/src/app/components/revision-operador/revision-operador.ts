import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { form, FormField, maxLength, minLength, required, validate } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Entidad } from '../../interfaces/catalogo.interface';
import { Prioridad, ReporteDetalle } from '../../interfaces/reporte.interface';
import { AlertaService } from '../../services/alerta.service';
import { CatalogoService } from '../../services/catalogo.service';
import { OperadorService } from '../../services/operador.service';
import { ReporteService } from '../../services/reporte.service';
import { EstadoBadge } from '../estado-badge/estado-badge';
import { MapaSelector } from '../mapa-selector/mapa-selector';

// Textos de la sección 8 (el comentario de atención no tiene uno propio allí).
export const MENSAJES_OPERADOR = {
  prioridad: 'Prioridad inválida',
  entidad: 'La entidad no atiende la categoría del reporte',
  motivo: 'Indica el motivo del rechazo (mínimo 10 caracteres)',
  comentario: 'El comentario no puede superar los 1000 caracteres',
  solucion: 'Describe la solución (mínimo 10 caracteres)',
} as const;
const PRIORIDADES: Prioridad[] = ['BAJA', 'MEDIA', 'ALTA'];

/** Falla si el texto solo alcanza el mínimo gracias a los espacios (la sección 8 mide recortado). */
const soloEspacios = (valor: string, minimo: number) => valor.length >= minimo && valor.trim().length < minimo;

@Component({
  selector: 'app-revision-operador',
  imports: [DatePipe, FormField, RouterLink, EstadoBadge, MapaSelector],
  templateUrl: './revision-operador.html',
})
export class RevisionOperador {
  private readonly reportes = inject(ReporteService);
  private readonly operador = inject(OperadorService);
  private readonly catalogo = inject(CatalogoService);
  private readonly alertas = inject(AlertaService);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  protected readonly prioridades = PRIORIDADES;
  protected readonly reporte = signal<ReporteDetalle | null>(null);
  protected readonly entidades = signal<Entidad[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly errorAccion = signal('');
  protected readonly enviando = signal(false);

  protected readonly asignacion = signal({ prioridad: '', id_entidad: '' });
  protected readonly formAsignar = form(this.asignacion, (e) => {
    required(e.prioridad, { message: MENSAJES_OPERADOR.prioridad });
    validate(e.prioridad, ({ value }) => value() && !PRIORIDADES.includes(value() as Prioridad) ? { kind: 'prioridad', message: MENSAJES_OPERADOR.prioridad } : undefined);
    required(e.id_entidad, { message: MENSAJES_OPERADOR.entidad });
    validate(e.id_entidad, ({ value }) => value() && !this.entidades().some(x => String(x.id) === value()) ? { kind: 'entidad', message: MENSAJES_OPERADOR.entidad } : undefined);
  });

  protected readonly rechazo = signal({ motivo: '' });
  protected readonly formRechazar = form(this.rechazo, (e) => {
    required(e.motivo, { message: MENSAJES_OPERADOR.motivo });
    minLength(e.motivo, 10, { message: MENSAJES_OPERADOR.motivo });
    maxLength(e.motivo, 500, { message: MENSAJES_OPERADOR.motivo });
    validate(e.motivo, ({ value }) => soloEspacios(value(), 10) ? { kind: 'recortado', message: MENSAJES_OPERADOR.motivo } : undefined);
  });

  protected readonly atencion = signal({ comentario: '' });
  protected readonly formAtencion = form(this.atencion, (e) => {
    maxLength(e.comentario, 1000, { message: MENSAJES_OPERADOR.comentario });
  });

  protected readonly cierre = signal({ comentario_solucion: '' });
  protected readonly formCerrar = form(this.cierre, (e) => {
    required(e.comentario_solucion, { message: MENSAJES_OPERADOR.solucion });
    minLength(e.comentario_solucion, 10, { message: MENSAJES_OPERADOR.solucion });
    maxLength(e.comentario_solucion, 1000, { message: MENSAJES_OPERADOR.solucion });
    validate(e.comentario_solucion, ({ value }) => soloEspacios(value(), 10) ? { kind: 'recortado', message: MENSAJES_OPERADOR.solucion } : undefined);
  });

  constructor() { void this.cargar(); }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const r = await this.reportes.obtener(this.id);
      this.reporte.set(r);
      // Solo se ofrecen las entidades que atienden la categoría del reporte.
      this.entidades.set(r.estado === 'RECIBIDO' ? await this.catalogo.entidades(r.categoria.id) : []);
    } catch (e) {
      this.error.set(this.alertas.errorHttp(e));
    } finally {
      this.cargando.set(false);
    }
  }

  protected asignar(evento?: Event): Promise<void> {
    evento?.preventDefault();
    const { prioridad, id_entidad } = this.asignacion();
    return this.ejecutar(this.formAsignar().invalid(), () => this.operador.asignar(this.id, { prioridad: prioridad as Prioridad, idEntidad: Number(id_entidad) }), 'Reporte asignado');
  }

  protected async rechazar(evento?: Event): Promise<void> {
    evento?.preventDefault();
    if (this.formRechazar().invalid() || this.enviando()) return;
    const confirmado = await this.alertas.confirmar('¿Rechazar el reporte?', 'El reporte pasará a RECHAZADO, que es un estado final, y el ciudadano verá el motivo.');
    if (!confirmado) return;
    await this.ejecutar(false, () => this.operador.rechazar(this.id, this.rechazo().motivo), 'Reporte rechazado');
  }

  protected iniciarAtencion(evento?: Event): Promise<void> {
    evento?.preventDefault();
    return this.ejecutar(this.formAtencion().invalid(), () => this.operador.iniciarAtencion(this.id, this.atencion().comentario), 'Atención iniciada');
  }

  protected cerrar(evento?: Event): Promise<void> {
    evento?.preventDefault();
    return this.ejecutar(this.formCerrar().invalid(), () => this.operador.cerrar(this.id, this.cierre().comentario_solucion), 'Reporte cerrado');
  }

  private async ejecutar(invalido: boolean, accion: () => Promise<ReporteDetalle>, exito: string): Promise<void> {
    if (invalido || this.enviando()) return;
    this.enviando.set(true);
    this.errorAccion.set('');
    try {
      this.reporte.set(await accion());
      this.limpiarFormularios();
      void this.alertas.exito(exito, `El reporte ${this.reporte()?.codigo ?? ''} se actualizó.`);
    } catch (e) {
      this.errorAccion.set(this.alertas.errorHttp(e));
      // 409: el estado cambió mientras tanto; se vuelve a leer el reporte.
      if (e instanceof HttpErrorResponse && e.status === 409) await this.cargar();
    } finally {
      this.enviando.set(false);
    }
  }

  private limpiarFormularios(): void {
    this.formAsignar().reset({ prioridad: '', id_entidad: '' });
    this.formRechazar().reset({ motivo: '' });
    this.formAtencion().reset({ comentario: '' });
    this.formCerrar().reset({ comentario_solucion: '' });
  }
}
