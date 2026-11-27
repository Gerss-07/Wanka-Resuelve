import { FormControl } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { firmaFotoValida, textoRecortado, validarFotos, ReporteForm } from './reporte-form';
import { CatalogoService } from '../../services/catalogo.service';
import { ReporteService } from '../../services/reporte.service';
import { NotificationService } from '../../services/notification.service';
describe('Validaciones de reporte', () => {
  it('mide textos después de recortar los espacios', () => {
    expect(textoRecortado(10, 1000)(new FormControl('  123456789  '))).not.toBeNull();
    expect(textoRecortado(10, 1000)(new FormControl('  1234567890  '))).toBeNull();
    expect(textoRecortado(5, 255)(new FormControl('x'.repeat(256)))).not.toBeNull();
  });
  it('requiere entre una y tres imágenes JPEG o PNG de máximo 2 000 000 bytes', () => {
    const jpg = new File(['x'], 'a.jpg', { type:'image/jpeg' });
    const png = new File(['x'], 'a.png', { type:'image/png' });
    const gif = new File(['x'], 'a.gif', { type:'image/gif' });
    const grande = new File([new Uint8Array(2000001)], 'a.jpg', { type:'image/jpeg' });
    expect(validarFotos([])).not.toBe('');
    expect(validarFotos([jpg, png])).toBe('');
    expect(validarFotos([jpg, jpg, jpg, jpg])).not.toBe('');
    expect(validarFotos([gif])).not.toBe('');
    expect(validarFotos([grande])).not.toBe('');
  });
  it('comprueba la firma y rechaza un GIF renombrado como JPEG', async () => {
    const jpeg = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'foto.jpg', { type: 'image/jpeg' });
    const gif = new File(['GIF89a'], 'foto.jpg', { type: 'image/jpeg' });
    await expect(firmaFotoValida(jpeg)).resolves.toBe(true);
    await expect(firmaFotoValida(gif)).resolves.toBe(false);
  });
  it('no avanza sin pin o foto y conserva datos al regresar del resumen', async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteForm],
      providers: [
        provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: CatalogoService, useValue: { categorias: async () => [{ id: 1, nombre: 'Pistas' }], distritos: async () => [{ id: 1, nombre: 'Huancayo' }] } },
        { provide: ReporteService, useValue: {} }, { provide: NotificationService, useValue: { http: () => '' } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(ReporteForm);
    const componente = fixture.componentInstance;
    await fixture.whenStable();
    componente['form'].setValue({ idCategoria:1, idDistrito:1, descripcion:'Descripción válida', referencia:'Referencia válida' });
    componente['continuar']();
    expect(componente['paso']()).toBe(1);
    componente['punto'].set({ latitud:-12.0651, longitud:-75.2049 });
    componente['continuar']();
    expect(componente['paso']()).toBe(1);
    componente['fotos'].set([{ archivo: new File(['x'], 'foto.jpg', { type:'image/jpeg' }), url: 'blob:prueba' }]);
    componente['continuar']();
    expect(componente['paso']()).toBe(2);
    componente['paso'].set(1);
    expect(componente['form'].value.descripcion).toBe('Descripción válida');
    expect(componente['punto']()?.latitud).toBe(-12.0651);
    expect(componente['fotos']().length).toBe(1);
  });
});
