import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { OperadorService } from './operador.service';

describe('OperadorService', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }));

  it('solo envía los filtros con valor y el cuerpo de asignar en snake_case', () => {
    const servicio = TestBed.inject(OperadorService);
    const http = TestBed.inject(HttpTestingController);
    void servicio.bandeja({ estado: 'RECIBIDO', idCategoria: '', idDistrito: '2', fechaDesde: '', fechaHasta: '2026-11-30' });
    const bandeja = http.expectOne(r => r.url === `${environment.apiUrl}/operador/reportes`);
    expect(bandeja.request.params.keys().sort()).toEqual(['estado', 'fecha_hasta', 'id_distrito']);
    expect(bandeja.request.params.get('id_distrito')).toBe('2');

    void servicio.asignar(7, { prioridad: 'ALTA', idEntidad: 3 }).catch(() => undefined);
    const asignar = http.expectOne(`${environment.apiUrl}/operador/reportes/7/asignar`);
    expect(asignar.request.method).toBe('POST');
    expect(asignar.request.body).toEqual({ prioridad: 'ALTA', id_entidad: 3 });
  });
});
