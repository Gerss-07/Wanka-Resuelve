import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { firmaFotoValida, MENSAJES, ModeloReporte, validarFotos, ReporteForm } from './reporte-form';
import { CatalogoService } from '../../services/catalogo.service';
import { ReporteService } from '../../services/reporte.service';
import { AlertaService } from '../../services/alerta.service';

const VALIDO: ModeloReporte = { id_categoria: '1', id_distrito: '1', descripcion: 'Descripción válida', referencia: 'Referencia válida' };
const PIN = { latitud: -12.0651, longitud: -75.2049 };
const foto = () => ({ archivo: new File(['x'], 'foto.jpg', { type: 'image/jpeg' }), url: 'blob:prueba' });

async function crear(id: string | null = null, reporte: object = {}) {
  await TestBed.configureTestingModule({
    imports: [ReporteForm],
    providers: [
      provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => id } } } },
      { provide: CatalogoService, useValue: { categorias: async () => [{ id: 1, nombre: 'Pistas' }], distritos: async () => [{ id: 1, nombre: 'Huancayo' }] } },
      { provide: ReporteService, useValue: reporte }, { provide: AlertaService, useValue: { errorHttp: () => '', exito: async () => undefined } }
    ]
  }).compileComponents();
  const fixture = TestBed.createComponent(ReporteForm);
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, c: fixture.componentInstance as any };
}
const mensajes = (c: any, campo: keyof ModeloReporte): string[] => c.formulario[campo]().errors().map((e: { message: string }) => e.message);
const boton = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement;

describe('Validaciones de reporte', () => {
  it('requiere entre una y tres imágenes JPEG o PNG de máximo 2 000 000 bytes', () => {
    const jpg = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    const png = new File(['x'], 'a.png', { type: 'image/png' });
    const gif = new File(['x'], 'a.gif', { type: 'image/gif' });
    const grande = new File([new Uint8Array(2000001)], 'a.jpg', { type: 'image/jpeg' });
    expect(validarFotos([])).toBe(MENSAJES.cantidadFotos);
    expect(validarFotos([jpg, png])).toBe('');
    expect(validarFotos([jpg, jpg, jpg, jpg])).toBe(MENSAJES.cantidadFotos);
    expect(validarFotos([gif])).toBe(MENSAJES.foto);
    expect(validarFotos([grande])).toBe(MENSAJES.foto);
  });
  it('comprueba la firma y rechaza un GIF renombrado como JPEG', async () => {
    const jpeg = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'foto.jpg', { type: 'image/jpeg' });
    const gif = new File(['GIF89a'], 'foto.jpg', { type: 'image/jpeg' });
    await expect(firmaFotoValida(jpeg)).resolves.toBe(true);
    await expect(firmaFotoValida(gif)).resolves.toBe(false);
  });
});

describe('ReporteForm con Signal Forms', () => {
  it('usa los mensajes de la sección 8 y mide los textos recortados', async () => {
    const { c } = await crear();
    c.modelo.set({ id_categoria: '', id_distrito: '9', descripcion: '123456789', referencia: 'abcd' });
    expect(mensajes(c, 'id_categoria')).toEqual(['Categoría inválida']);
    expect(mensajes(c, 'id_distrito')).toEqual(['Distrito inválido']);
    expect(mensajes(c, 'descripcion')).toEqual(['Describe la incidencia (mínimo 10 caracteres)']);
    expect(mensajes(c, 'referencia')).toEqual(['Indica una dirección o referencia (mínimo 5 caracteres)']);
    c.modelo.set({ ...VALIDO, descripcion: ' '.repeat(12), referencia: '   ab   ' });
    expect(mensajes(c, 'descripcion')).toEqual([MENSAJES.descripcion]);
    expect(mensajes(c, 'referencia')).toEqual([MENSAJES.referencia]);
    c.modelo.set(VALIDO);
    expect(c.formulario().invalid()).toBe(false);
  });

  it('muestra los errores bajo el campo solo después de tocarlo', async () => {
    const { fixture } = await crear();
    const textarea = fixture.nativeElement.querySelector('#descripcion') as HTMLTextAreaElement;
    textarea.value = 'corta'; textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const errores = () => fixture.nativeElement.querySelector('#descripcion-errores').textContent as string;
    expect(errores()).not.toContain(MENSAJES.descripcion);
    textarea.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(errores()).toContain(MENSAJES.descripcion);
  });

  it('deshabilita Continuar sin pin o sin fotos y conserva los datos al volver del resumen', async () => {
    const { fixture, c } = await crear();
    c.modelo.set(VALIDO); fixture.detectChanges();
    expect(boton(fixture).disabled).toBe(true);
    c.punto.set(PIN); fixture.detectChanges();
    expect(boton(fixture).disabled).toBe(true);
    c.fotos.set([foto()]); fixture.detectChanges();
    expect(boton(fixture).disabled).toBe(false);
    c.continuar();
    expect(c.paso()).toBe(2);
    c.irAlPaso(1);
    expect(c.modelo().descripcion).toBe('Descripción válida');
    expect(c.punto()?.latitud).toBe(-12.0651);
    expect(c.fotos().length).toBe(1);
  });

  it('muestra los avisos de pin y fotos cuando ya se tocó el formulario', async () => {
    const { fixture, c } = await crear();
    expect(fixture.nativeElement.textContent).not.toContain(MENSAJES.ubicacion);
    c.formulario().markAsTouched(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(MENSAJES.ubicacion);
    expect(fixture.nativeElement.textContent).toContain(MENSAJES.cantidadFotos);
  });

  it('en edición carga el reporte y no exige fotos para Guardar', async () => {
    const detalle = { id: 5, estado: 'RECIBIDO', categoria: { id: 1, nombre: 'Pistas' }, distrito: { id: 1, nombre: 'Huancayo' }, descripcion: 'Descripción válida', referencia: 'Referencia válida', latitud: PIN.latitud, longitud: PIN.longitud };
    const { fixture, c } = await crear('5', { obtener: async () => detalle });
    expect(c.modelo()).toEqual(VALIDO);
    expect(boton(fixture).textContent).toContain('Guardar cambios');
    expect(boton(fixture).disabled).toBe(false);
  });
});
