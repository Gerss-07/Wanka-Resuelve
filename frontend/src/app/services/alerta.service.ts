import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AlertaService {
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));

  async exito(titulo: string, texto: string): Promise<void> {
    if (!this.navegador) return;
    const { default: Swal } = await import('sweetalert2');
    await Swal.fire({ icon: 'success', titleText: titulo, text: texto, timer: 2500, confirmButtonText: 'Aceptar' });
  }

  async error(texto: string): Promise<void> {
    if (!this.navegador) return;
    const { default: Swal } = await import('sweetalert2');
    await Swal.fire({ icon: 'error', titleText: 'No se pudo completar la solicitud', text: texto, confirmButtonText: 'Cerrar' });
  }

  async confirmar(titulo: string, texto: string): Promise<boolean> {
    if (!this.navegador) return false;
    const { default: Swal } = await import('sweetalert2');
    const resultado = await Swal.fire({
      icon: 'question', titleText: titulo, text: texto, showCancelButton: true,
      focusCancel: true, confirmButtonText: 'Confirmar', cancelButtonText: 'Cancelar',
    });
    return resultado.isConfirmed;
  }
}
