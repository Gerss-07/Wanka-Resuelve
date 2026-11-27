import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { CatalogoService } from '../../services/catalogo.service';
import { AlertaService } from '../../services/alerta.service';
import { OperadorService } from '../../services/operador.service';
import { rutasOperador } from '../operador-layout/operador.routes';
import { BandejaOperador } from './bandeja-operador';

describe('BandejaOperador', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [{ provide: AlertaService, useValue: { error: vi.fn() } }] }));
  it('rechaza un rango invertido, aplica los filtros y permite limpiar la búsqueda', async () => {
    const listar = vi.fn().mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: OperadorService, useValue: { listar } },
        { provide: CatalogoService, useValue: {
          categorias: async () => [{ id: 2, nombre: 'Pistas' }], distritos: async () => [],
        } },
      ],
    });
    const fixture = TestBed.createComponent(BandejaOperador);
    await fixture.whenStable();
    const vista: HTMLElement = fixture.nativeElement;
    const desde = vista.querySelector<HTMLInputElement>('#desde')!;
    const hasta = vista.querySelector<HTMLInputElement>('#hasta')!;
    const formulario = vista.querySelector('form')!;

    desde.value = '2026-11-25';
    desde.dispatchEvent(new Event('input'));
    hasta.value = '2026-11-01';
    hasta.dispatchEvent(new Event('input'));
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(vista.querySelector('#error-hasta')?.textContent).toContain('La fecha final');
    expect(listar).toHaveBeenCalledTimes(1);

    hasta.value = '2026-11-26';
    hasta.dispatchEvent(new Event('input'));
    const categoria = vista.querySelector<HTMLSelectElement>('#categoria')!;
    categoria.value = '2';
    categoria.dispatchEvent(new Event('input'));
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({
      fechaDesde: '2026-11-25', fechaHasta: '2026-11-26', idCategoria: '2',
    }));
    vista.querySelector<HTMLButtonElement>('form button[type=button]')!.click();
    await fixture.whenStable();
    expect(listar).toHaveBeenLastCalledWith({ estado: '', idCategoria: '', idDistrito: '', fechaDesde: '', fechaHasta: '' });
    expect(categoria.value).toBe('');
  });

  it('muestra el error de la API y distingue una respuesta vacía al reintentar', async () => {
    const listar = vi.fn().mockRejectedValueOnce(new HttpErrorResponse({
      status: 403, error: { detail: 'Se requiere el rol de operador' },
    })).mockResolvedValueOnce([]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: OperadorService, useValue: { listar } },
        { provide: CatalogoService, useValue: { categorias: async () => [], distritos: async () => [] } },
      ],
    });
    const fixture = TestBed.createComponent(BandejaOperador);
    await fixture.whenStable();
    const vista: HTMLElement = fixture.nativeElement;
    expect(vista.querySelector('[role=alert]')?.textContent).toContain('Se requiere el rol de operador');
    expect(vista.querySelector('.indicadores dd')?.textContent).toBe('—');
    vista.querySelector<HTMLButtonElement>('.resultados button')!.click();
    await fixture.whenStable();
    expect(vista.querySelector('[role=alert]')).toBeNull();
    expect(vista.textContent).toContain('No hay reportes');
    expect(vista.querySelector('.indicadores dd')?.textContent).toBe('0');
  });

  it('calcula los indicadores y los gráficos con los reportes de la consulta', async () => {
    const base = {
      ciudadano: 'Ana', distrito: { id: 1, nombre: 'Huancayo' },
      categoria: { id: 2, nombre: 'Pistas' }, prioridad: null,
    };
    const reportes = [
      { ...base, id: 7, codigo: 'WR-2026-000007', estado: 'RECIBIDO', fechaCreacion: '2026-10-26T15:04:00' },
      { ...base, id: 8, codigo: 'WR-2026-000008', estado: 'EN_ATENCION', fechaCreacion: '2026-11-26T15:04:00' },
      { ...base, id: 9, codigo: 'WR-2026-000009', estado: 'CERRADO', fechaCreacion: '2026-11-26T15:04:00' },
    ];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: OperadorService, useValue: { listar: async () => reportes } },
        { provide: CatalogoService, useValue: { categorias: async () => [], distritos: async () => [] } },
      ],
    });
    const fixture = TestBed.createComponent(BandejaOperador);
    await fixture.whenStable();
    const vista: HTMLElement = fixture.nativeElement;
    expect(Array.from(vista.querySelectorAll('.indicadores dd'), x => x.textContent)).toEqual(['3', '1', '1', '1']);
    expect(Array.from(vista.querySelectorAll('.meses strong'), x => x.textContent)).toEqual(['1', '2']);
    expect(vista.querySelector('.distribucion [data-estado=RECHAZADO] strong')?.textContent).toBe('0');
    expect(vista.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(vista.querySelector('tbody td')?.textContent).toBe('Ana');
    expect(vista.querySelector('.dona')?.getAttribute('style')).toContain('conic-gradient');
    vista.querySelector<HTMLButtonElement>('.distribucion [data-estado=CERRADO] button')!.click();
    vista.querySelector<HTMLButtonElement>('.meses button')!.click();
    await fixture.whenStable();
    expect(vista.querySelector('.dona strong')?.textContent).toBe('1');
    expect(vista.querySelector('.meses button')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('busca por código desde la barra, marca la sección y conserva el enlace al detalle', async () => {
    const reporte = {
      id: 7, codigo: 'WR-2026-000007', ciudadano: 'Ana', distrito: { id: 1, nombre: 'Huancayo' },
      categoria: { id: 2, nombre: 'Pistas' }, prioridad: null, estado: 'RECIBIDO', fechaCreacion: '2026-11-26T15:04:00',
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'operador', children: rutasOperador.map(ruta => ({ ...ruta, providers: [] })) }]),
        { provide: OperadorService, useValue: { listar: async () => [reporte, { ...reporte, id: 8, codigo: 'WR-2026-000008' }] } },
        { provide: CatalogoService, useValue: { categorias: async () => [], distritos: async () => [] } },
      ],
    });
    const harness = await RouterTestingHarness.create('/operador/reportes');
    const vista = harness.routeNativeElement!;
    const busqueda = vista.querySelector<HTMLInputElement>('input[type=search]')!;
    busqueda.value = ' wr-2026-000007 ';
    busqueda.dispatchEvent(new Event('input'));
    busqueda.form!.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/operador/reportes?codigo=wr-2026-000007#resultados');
    expect(vista.querySelector('nav [aria-current]')?.textContent).toContain('Reportes');
    expect(vista.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(vista.querySelector('tbody a')?.getAttribute('href')).toBe('/operador/reportes/7?codigo=wr-2026-000007');
    expect(vista.querySelector('.indicadores dd')?.textContent).toBe('2');
    const enfocarResultados = vi.spyOn(vista.querySelector<HTMLElement>('#resultados')!, 'focus');
    busqueda.form!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(enfocarResultados).toHaveBeenCalledWith({ preventScroll: true });
    vista.querySelector<HTMLButtonElement>('.op-contraer')!.click();
    await harness.fixture.whenStable();
    expect(vista.querySelector('.op-lateral')?.classList.contains('op-compacto')).toBe(true);

    await harness.navigateByUrl('/operador/reportes');
    vista.querySelector<HTMLAnchorElement>('nav [title="Gestión de incidencias"]')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/operador/reportes#filtros');
    expect(vista.querySelector('nav [aria-current]')?.textContent).toContain('Gestión de incidencias');
    expect(busqueda.value).toBe('');
  });
});
