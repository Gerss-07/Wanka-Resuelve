import { Component, inject, Injectable } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-confirmacion',
  imports: [MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>{{ data.titulo }}</h2><mat-dialog-content>{{ data.mensaje }}</mat-dialog-content><mat-dialog-actions align="end"><button mat-button [mat-dialog-close]="false">Cancelar</button><button mat-button [mat-dialog-close]="true">Confirmar</button></mat-dialog-actions>`
})
export class Confirmacion {
  protected readonly data = inject<{ titulo: string; mensaje: string }>(MAT_DIALOG_DATA);
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  success(mensaje: string): void { this.mostrar(mensaje); }
  error(mensaje: string): void { this.mostrar(mensaje); }
  warning(mensaje: string): void { this.mostrar(mensaje); }
  info(mensaje: string): void { this.mostrar(mensaje); }
  http(error: unknown, mensaje404 = 'El reporte no existe o no está disponible.'): string {
    const status = error instanceof HttpErrorResponse ? error.status : -1;
    const mensajes: Record<number, string> = {
      0: 'No se pudo conectar con el servidor.',
      401: 'Tu sesión no está disponible o ha expirado.',
      403: 'No tienes autorización para realizar esta acción.',
      404: mensaje404,
      409: 'El estado del reporte cambió; esta acción ya no está permitida.',
      422: 'Los datos enviados no son válidos. Revisa los campos.'
    };
    const mensaje = mensajes[status] ?? 'No se pudo completar la operación.';
    this.error(mensaje);
    return mensaje;
  }
  confirm(titulo: string, mensaje: string): Observable<boolean | undefined> {
    return this.dialog.open(Confirmacion, { data: { titulo, mensaje }, maxWidth: '90vw', autoFocus: 'first-tabbable' }).afterClosed();
  }
  private mostrar(mensaje: string): void { this.snack.open(mensaje, 'Cerrar', { duration: 5000, politeness: 'polite' }); }
}
