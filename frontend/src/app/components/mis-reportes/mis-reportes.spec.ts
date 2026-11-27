import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MisReportes } from './mis-reportes';
import { ReporteResumenApi } from '../../interfaces/reporte.interface';
import { ReporteService } from '../../services/reporte.service';
import { AlertaService } from '../../services/alerta.service';
import { environment } from '../../../environments/environment';

describe('MisReportes', () => {
  it('vuelve a consultar FastAPI al abrir el listado de nuevo', async () => {
    TestBed.configureTestingModule({
      imports: [MisReportes],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    const http = TestBed.inject(HttpTestingController);
    const reporte: ReporteResumenApi = {
      id_reporte: 7,
      codigo: 'WR-2026-000007',
      ciudadano: { id_usuario: 3, nombre: 'Ana' },
      categoria: { id_categoria: 2, nombre: 'Pistas y veredas' },
      distrito: { id_distrito: 1, nombre: 'Huancayo' },
      estado: 'RECIBIDO',
      prioridad: null,
      fecha_creacion: '2026-11-26T15:04:00'
    };
    const url = `${environment.apiUrl}/reportes/mis-reportes`;
    const primeraVisita = TestBed.createComponent(MisReportes);
    http.expectOne({ method: 'GET', url }).flush([]);
    await primeraVisita.whenStable();
    expect(primeraVisita.nativeElement.textContent).not.toContain(reporte.codigo);
    primeraVisita.destroy();

    const nuevaVisita = TestBed.createComponent(MisReportes);
    http.expectOne({ method: 'GET', url }).flush([reporte]);
    await nuevaVisita.whenStable();
    expect(nuevaVisita.nativeElement.textContent).toContain(reporte.codigo);
    http.verify();
  });

  it('oculta editar y eliminar cuando está asignado', async () => {
    const r = { id: 1, codigo: 'WR-2026-000001', ciudadano: 'Ana', categoria: { id:1, nombre:'Pistas' }, distrito: { id:1, nombre:'Huancayo' }, estado:'ASIGNADO', prioridad:'ALTA', fechaCreacion:'2026-11-26T10:00:00' };
    await TestBed.configureTestingModule({
      imports: [MisReportes], providers: [provideRouter([]), { provide: ReporteService, useValue: { listar: () => Promise.resolve([r]) } }, { provide: AlertaService, useValue: { errorHttp: () => '' } }]
    }).compileComponents();
    const fixture = TestBed.createComponent(MisReportes);
    await fixture.whenStable(); fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Ver');
    expect(texto).not.toContain('Editar');
    expect(texto).not.toContain('Eliminar');
  });
  it('no elimina si se cancela la confirmación', async () => {
    let llamadas = 0;
    const r = { id: 1, codigo: 'WR-2026-000001', ciudadano:'Ana', categoria:{id:1,nombre:'Pistas'}, distrito:{id:1,nombre:'Huancayo'}, estado:'RECIBIDO', prioridad:null, fechaCreacion:'2026-11-26T10:00:00' };
    await TestBed.configureTestingModule({
      imports: [MisReportes], providers: [provideRouter([]), { provide: ReporteService, useValue: { listar: () => Promise.resolve([r]), eliminar: () => { llamadas++; } } }, { provide: AlertaService, useValue: { confirmar: async () => false, errorHttp: () => '' } }]
    }).compileComponents();
    const fixture = TestBed.createComponent(MisReportes);
    await fixture.whenStable(); fixture.detectChanges();
    const boton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(b => b.textContent?.includes('Eliminar'));
    expect(boton).toBeDefined();
    boton!.click(); await fixture.whenStable();
    expect(llamadas).toBe(0);
  });
});
