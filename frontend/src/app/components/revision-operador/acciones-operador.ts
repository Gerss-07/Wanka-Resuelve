import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { FieldTree, form, FormField, required, submit, validate } from '@angular/forms/signals';
import { LucideListChecks } from '@lucide/angular';
import { Catalogo } from '../../interfaces/catalogo.interface';
import { Prioridad, ReporteDetalle } from '../../interfaces/reporte.interface';
import { CatalogoService } from '../../services/catalogo.service';
import { AlertaService } from '../../services/alerta.service';
import { errorOperador, OperadorService } from '../../services/operador.service';

const PRIORIDADES: Prioridad[] = ['BAJA', 'MEDIA', 'ALTA'];

@Component({
  selector: 'app-acciones-operador',
  imports: [FormField, LucideListChecks],
  templateUrl: './acciones-operador.html',
  styles: [`
    :host { display: block; min-width: 0; }
    h2 { display: flex; align-items: center; gap: 8px; }
    h2 svg { color: var(--op-accent); }
    form { margin-top: 16px; }
    form + form { border-top: 1px solid var(--op-line); padding-top: 16px; }
    fieldset { display: grid; gap: 12px; }
    legend { font-weight: 800; margin-bottom: 8px; padding: 0; }
    button { justify-self: start; }
    .rechazar { color: #922f25; border-color: #e6b5aa; }
    .rechazar:hover:not(:disabled) { background: #fff0ed; }
    small { font-size: .78rem; }
  `],
})
export class AccionesOperador implements OnInit {
  private readonly api = inject(OperadorService);
  private readonly catalogo = inject(CatalogoService);
  private readonly avisos = inject(AlertaService);
  private readonly destroyRef = inject(DestroyRef);
  readonly reporte = input.required<ReporteDetalle>();
  readonly actualizado = output<{ reporte: ReporteDetalle; mensaje: string }>();
  readonly conflicto = output<string>();
  protected readonly entidades = signal<Catalogo[]>([]);
  protected readonly cargandoEntidades = signal(false);
  protected readonly errorEntidades = signal('');
  protected readonly enviando = signal(false);
  private readonly confirmando = signal(false);
  protected readonly ocupado = computed(() => this.enviando() || this.confirmando());
  protected readonly error = signal('');

  protected readonly asignacion = form(signal({ prioridad: '' as Prioridad | '', entidad: '' }), campos => {
    required(campos.prioridad, { message: 'Prioridad inválida' });
    required(campos.entidad, { message: 'La entidad no atiende la categoría del reporte' });
    validate(campos.prioridad, ({ value }) => {
      const prioridad = value();
      return !prioridad || PRIORIDADES.includes(prioridad) ? null :
        { kind: 'prioridad', message: 'Prioridad inválida' };
    });
    validate(campos.entidad, ({ value }) => !value() || this.entidades().some(e => e.id === Number(value())) ? null :
      { kind: 'entidad', message: 'La entidad no atiende la categoría del reporte' });
  });
  protected readonly rechazo = form(signal({ motivo: '' }), campos => {
    const mensaje = 'Indica el motivo del rechazo (mínimo 10 caracteres)';
    required(campos.motivo, { message: mensaje });
    validate(campos.motivo, ({ value }) => this.validarTexto(value(), 10, 500, mensaje));
  });
  protected readonly atencion = form(signal({ comentario: '' }), campos => {
    validate(campos.comentario, ({ value }) => this.validarTexto(value(), 0, 1000));
  });
  protected readonly cierre = form(signal({ solucion: '' }), campos => {
    const mensaje = 'Describe la solución (mínimo 10 caracteres)';
    required(campos.solucion, { message: mensaje });
    validate(campos.solucion, ({ value }) => this.validarTexto(value(), 10, 1000, mensaje));
  });

  ngOnInit(): void {
    if (this.reporte().estado === 'RECIBIDO') void this.cargarEntidades();
  }

  protected async cargarEntidades(): Promise<void> {
    this.cargandoEntidades.set(true);
    this.errorEntidades.set('');
    try {
      this.entidades.set(await this.catalogo.entidades(this.reporte().categoria.id));
    } catch (error) {
      this.errorEntidades.set(errorOperador(error, 'No se pudieron cargar las entidades responsables.'));
      if (!this.destroyRef.destroyed) void this.avisos.error(this.errorEntidades());
    } finally {
      this.cargandoEntidades.set(false);
    }
  }

  protected asignar(evento: Event): void {
    const { prioridad, entidad } = this.asignacion().value();
    this.enviar(evento, this.asignacion, async id => {
      if (!prioridad) throw new Error('Prioridad no seleccionada');
      return this.api.asignar(id, prioridad, Number(entidad));
    }, 'Asignar reporte', 'La incidencia pasará a Asignado con la prioridad y entidad seleccionadas.', 'El reporte se asignó correctamente.');
  }

  protected rechazar(evento: Event): void {
    this.enviar(evento, this.rechazo, id => this.api.rechazar(id, this.rechazo.motivo().value()),
      'Rechazar reporte', 'El rechazo es definitivo y el motivo quedará en el historial.', 'El reporte se rechazó correctamente.');
  }

  protected iniciarAtencion(evento: Event): void {
    this.enviar(evento, this.atencion, id => this.api.iniciarAtencion(id, this.atencion.comentario().value()),
      'Iniciar atención', 'Se registrará el inicio de atención en el historial.', 'El reporte pasó a atención.');
  }

  protected cerrar(evento: Event): void {
    this.enviar(evento, this.cierre, id => this.api.cerrar(id, this.cierre.solucion().value()),
      'Cerrar reporte', 'El cierre es definitivo y la solución quedará en el historial.', 'El reporte se cerró correctamente.');
  }

  protected errorCampo(campo: FieldTree<string>): string | undefined {
    return campo().touched() ? campo().errors()[0]?.message : undefined;
  }

  private validarTexto(texto: string, min: number, max: number, mensajeMinimo = '') {
    const longitud = Array.from(texto.trim()).length;
    if (longitud < min) return { kind: 'minLength', message: mensajeMinimo };
    if (longitud > max) return { kind: 'maxLength', message: `Escribe como máximo ${max} caracteres.` };
    return null;
  }

  private enviar<T>(
    evento: Event, formulario: FieldTree<T>, accion: (id: number) => Promise<ReporteDetalle>,
    titulo: string, confirmacion: string, mensaje: string,
  ): void {
    evento.preventDefault();
    if (this.ocupado()) return;
    this.error.set('');
    void submit(formulario, async () => {
      this.confirmando.set(true);
      try {
        const confirmado = await this.avisos.confirmar(`${titulo} · ${this.reporte().codigo}`, confirmacion);
        this.confirmando.set(false);
        if (!confirmado || this.destroyRef.destroyed) return;
        this.enviando.set(true);
        const reporte = await accion(this.reporte().id);
        if (!this.destroyRef.destroyed) {
          this.actualizado.emit({ reporte, mensaje });
          void this.avisos.exito(reporte.codigo, mensaje);
        }
      } catch (error) {
        if (this.destroyRef.destroyed) return;
        if (error instanceof HttpErrorResponse && error.status === 409) {
          const detalle = errorOperador(error, 'El estado del reporte cambió. Se actualizará la revisión.');
          void this.avisos.error(detalle);
          this.conflicto.emit(detalle);
        } else {
          this.error.set(errorOperador(error, 'FastAPI no pudo guardar la acción.'));
          void this.avisos.error(this.error());
        }
      } finally {
        this.confirmando.set(false);
        this.enviando.set(false);
      }
    });
  }
}
