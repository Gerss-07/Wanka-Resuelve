import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ReporteDetalleApi } from '../interfaces/reporte.interface';
import { CatalogoService } from './catalogo.service';
import { errorOperador, OperadorService } from './operador.service';

describe('OperadorService', () => {
  const url = `${environment.apiUrl}/operador/reportes`;
  const fecha = '2026-11-26T15:04:00';
  const reporte: ReporteDetalleApi = {
    id_reporte: 7, codigo: 'WR-2026-000007', ciudadano: { id_usuario: 3, nombre: 'Ana' },
    categoria: { id_categoria: 2, nombre: 'Pistas' }, distrito: { id_distrito: 1, nombre: 'Huancayo' },
    estado: 'RECIBIDO', prioridad: null, fecha_creacion: fecha,
    descripcion: 'Descripción válida', referencia: 'Referencia válida', latitud: -12.06, longitud: -75.2,
    entidad: null, motivo_rechazo: null, comentario_solucion: null,
    fotos: [], historial: [], fecha_actualizacion: fecha,
  };
  let api: OperadorService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(OperadorService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('envía filtros en snake_case, omite los vacíos y convierte el resultado', async () => {
    const consulta = api.listar({
      estado: 'RECIBIDO', idCategoria: '2', idDistrito: '1', fechaDesde: '2026-11-01', fechaHasta: '',
    });
    const req = http.expectOne(r => r.url === url && r.method === 'GET');
    expect(req.request.params.keys()).toEqual(['estado', 'id_categoria', 'id_distrito', 'fecha_desde']);
    expect(req.request.params.get('id_categoria')).toBe('2');
    expect(req.request.params.get('id_distrito')).toBe('1');
    expect(req.request.params.get('fecha_desde')).toBe('2026-11-01');
    expect(req.request.params.has('fecha_hasta')).toBe(false);
    req.flush([reporte]);
    await expect(consulta).resolves.toMatchObject([{ id: 7, ciudadano: 'Ana', estado: 'RECIBIDO' }]);
  });

  it('envía cada transición al endpoint real con su cuerpo y usa el estado devuelto', async () => {
    const asignar = api.asignar(7, 'ALTA', 3);
    const rechazo = api.rechazar(7, '  Falta información  ');
    const atencion = api.iniciarAtencion(7, '  ');
    const cierre = api.cerrar(7, '  Se reparó la vereda  ');
    const casos = [
      { ruta: 'asignar', cuerpo: { prioridad: 'ALTA', id_entidad: 3 }, estado: 'ASIGNADO', promesa: asignar },
      { ruta: 'rechazar', cuerpo: { motivo: 'Falta información' }, estado: 'RECHAZADO', promesa: rechazo },
      { ruta: 'iniciar-atencion', cuerpo: {}, estado: 'EN_ATENCION', promesa: atencion },
      { ruta: 'cerrar', cuerpo: { comentario_solucion: 'Se reparó la vereda' }, estado: 'CERRADO', promesa: cierre },
    ];
    for (const caso of casos) {
      const req = http.expectOne({ url: `${url}/7/${caso.ruta}`, method: 'POST' });
      expect(req.request.body).toEqual(caso.cuerpo);
      req.flush({ ...reporte, estado: caso.estado });
      await expect(caso.promesa).resolves.toMatchObject({ id: 7, estado: caso.estado });
    }
  });

  it('propaga el conflicto y muestra solo mensajes públicos del contrato', async () => {
    const solicitud = api.asignar(7, 'ALTA', 3);
    http.expectOne(`${url}/7/asignar`).flush({ detail: 'Estado incompatible' }, { status: 409, statusText: 'Conflict' });
    await expect(solicitud).rejects.toMatchObject({ status: 409 });
    expect(errorOperador(new HttpErrorResponse({ status: 409, error: { detail: 'Estado incompatible' } }), 'Error'))
      .toBe('Estado incompatible');
    expect(errorOperador(new HttpErrorResponse({ status: 500, error: { detail: 'Mensaje interno' } }), 'Error'))
      .toBe('Error');
  });

  it('consulta las entidades por categoría y descarta opciones incompatibles', async () => {
    const consulta = TestBed.inject(CatalogoService).entidades(2);
    http.expectOne(`${environment.apiUrl}/entidades?id_categoria=2`).flush([
      { id_entidad: 3, nombre: 'Vías', id_categoria: 2 },
      { id_entidad: 5, nombre: 'Limpieza', id_categoria: 4 },
    ]);
    await expect(consulta).resolves.toEqual([{ id: 3, nombre: 'Vías' }]);
  });
});
