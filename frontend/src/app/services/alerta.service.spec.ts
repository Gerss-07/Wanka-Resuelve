import { HttpErrorResponse } from '@angular/common/http';
import { mensajeError } from './alerta.service';

describe('mensajeError', () => {
  it('muestra el detail del backend', () => {
    const error = new HttpErrorResponse({ status: 409, error: { detail: 'El reporte no está en un estado que permita esta acción' } });
    expect(mensajeError(error)).toBe('El reporte no está en un estado que permita esta acción');
  });
  it('usa un texto genérico sin conexión (status 0)', () => {
    expect(mensajeError(new HttpErrorResponse({ status: 0 }))).toBe('No se pudo conectar con el servidor.');
  });
  it('usa un texto genérico si no hay detail', () => {
    expect(mensajeError(new HttpErrorResponse({ status: 500, error: 'Internal Server Error' }))).toBe('No se pudo completar la operación.');
    expect(mensajeError(new HttpErrorResponse({ status: 422, error: { detail: [] } }))).toBe('No se pudo completar la operación.');
    expect(mensajeError(new Error('otra cosa'))).toBe('No se pudo completar la operación.');
  });
});
