import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReporteService } from './reporte.service';
import { environment } from '../../environments/environment';

describe('ReporteService', () => {
  let servicio: ReporteService;
  let http: HttpTestingController;
  const respuesta = {
    id_reporte: 7, codigo: 'WR-2026-000007', ciudadano: { id_usuario: 3, nombre: 'Ana' },
    categoria: { id_categoria: 2, nombre: 'Pistas' }, distrito: { id_distrito: 1, nombre: 'Huancayo' },
    estado: 'RECIBIDO', prioridad: null, fecha_creacion: '2026-11-26T15:04:00',
    descripcion: 'Descripción válida', referencia: 'Referencia válida', latitud: -12.0651, longitud: -75.2049,
    entidad: null, motivo_rechazo: null, comentario_solucion: null,
    fotos: [{ id_foto: 1, url: '/uploads/reportes/foto.jpg' }], historial: [], fecha_actualizacion: '2026-11-26T15:04:00'
  };
  const datos = { idCategoria: 2, idDistrito: 1, descripcion: '  Descripción válida  ', referencia: ' Referencia válida ', latitud: -12.0651, longitud: -75.2049 };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(ReporteService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('lista los reportes propios desde la ruta literal del contrato', async () => {
    const promesa = servicio.listar();
    const req = http.expectOne(`${environment.apiUrl}/reportes/mis-reportes`);
    expect(req.request.method).toBe('GET');
    req.flush([respuesta]);
    await expect(promesa).resolves.toMatchObject([{ id: 7, distrito: { id: 1, nombre: 'Huancayo' } }]);
  });
  it('crea multipart sin autor ni campos generados y convierte la respuesta', async () => {
    const foto = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });
    const promesa = servicio.crear(datos, [foto, foto]);
    const req = http.expectOne(`${environment.apiUrl}/reportes`);
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(Array.from(body.keys()).sort()).toEqual(['descripcion', 'fotos', 'fotos', 'id_categoria', 'id_distrito', 'latitud', 'longitud', 'referencia'].sort());
    expect(body.get('descripcion')).toBe('Descripción válida');
    req.flush(respuesta, { status: 201, statusText: 'Created' });
    const reporte = await promesa;
    expect(reporte.categoria.id).toBe(2);
    expect(reporte.fotos[0].url).toBe(`${environment.apiUrl}/uploads/reportes/foto.jpg`);
  });
  it('envía solo los campos editables y propaga el conflicto', async () => {
    const promesa = servicio.editar(7, datos);
    const req = http.expectOne(`${environment.apiUrl}/reportes/7`);
    expect(req.request.method).toBe('PUT');
    expect(Object.keys(req.request.body).sort()).toEqual(['id_categoria','id_distrito','descripcion','referencia','latitud','longitud'].sort());
    req.flush({ detail: 'conflicto' }, { status: 409, statusText: 'Conflict' });
    await expect(promesa).rejects.toMatchObject({ status: 409 });
  });
  it('solo acepta 204 al eliminar', async () => {
    const promesa = servicio.eliminar(7);
    const req = http.expectOne(`${environment.apiUrl}/reportes/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await expect(promesa).resolves.toBeUndefined();
  });
});
