import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

const SIN_CONEXION = 'No se pudo conectar con el servidor.';
const GENERICO = 'No se pudo completar la operación.';

/** Texto listo para mostrar: el `detail` del backend o, si no viene, un mensaje genérico. */
export function mensajeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const detalle: unknown = error.error?.detail;
    if (typeof detalle === 'string' && detalle.trim()) return detalle.trim();
    return error.status === 0 ? SIN_CONEXION : GENERICO;
  }
  return GENERICO;
}

/** Único punto de uso de SweetAlert2 (sección 9). Los componentes no importan Swal. */
@Injectable({ providedIn: 'root' })
export class AlertaService {
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));

  async exito(titulo: string, texto = ''): Promise<void> {
    const Swal = await this.swal();
    if (Swal) await Swal.fire({ icon: 'success', title: titulo, text: texto, confirmButtonText: 'Aceptar', confirmButtonColor: '#184fc1' });
  }

  async error(texto: string): Promise<void> {
    const Swal = await this.swal();
    if (Swal) await Swal.fire({ icon: 'error', title: 'Algo salió mal', text: texto, confirmButtonText: 'Aceptar', confirmButtonColor: '#184fc1' });
  }

  async confirmar(titulo: string, texto: string): Promise<boolean> {
    const Swal = await this.swal();
    if (!Swal) return false;
    const { isConfirmed } = await Swal.fire({
      icon: 'warning', title: titulo, text: texto, showCancelButton: true, focusCancel: true,
      confirmButtonText: 'Sí, continuar', cancelButtonText: 'Cancelar', confirmButtonColor: '#9b2929',
    });
    return isConfirmed;
  }

  /** Muestra el error de una petición y devuelve el mismo texto para pintarlo en la pantalla. */
  errorHttp(error: unknown): string {
    const mensaje = mensajeError(error);
    void this.error(mensaje);
    return mensaje;
  }

  /** SweetAlert2 solo se carga en el navegador; en el servidor no hay alertas. */
  private async swal() {
    return this.navegador ? (await import('sweetalert2')).default : null;
  }
}
