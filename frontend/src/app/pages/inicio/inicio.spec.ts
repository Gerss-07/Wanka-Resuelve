import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { Inicio } from './inicio';

describe('Inicio', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));
  it('muestra el aviso, las categorías y el logo oficial', async () => {
    await TestBed.configureTestingModule({ imports: [Inicio] }).compileComponents();
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Prototipo académico');
    expect(element.querySelectorAll('.category-card').length).toBe(5);
    expect(element.textContent).not.toContain('Simulación académica');
    expect(element.textContent).toContain('Drenaje y alcantarillas');
    expect(element.querySelectorAll('.district-card').length).toBe(3);
    expect(element.querySelector('img')?.getAttribute('src')).toBe('/images/logo-wanka-resuelve.png');
  });

  it('informa que el acceso aún no está disponible', async () => {
    const open = vi.fn();
    await TestBed.configureTestingModule({ imports: [Inicio], providers: [{ provide: MatDialog, useValue: { open } }] }).compileComponents();
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((item) => item.textContent?.includes('Iniciar sesión'));
    button?.click();
    expect(open).toHaveBeenCalledOnce();
  });

  it('cambia las imágenes y conserva las noticias con fuentes', async () => {
    await TestBed.configureTestingModule({ imports: [Inicio] }).compileComponents();
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.news-card').length).toBe(3);
    expect(element.querySelectorAll('.news-card a[href^="https://www.gob.pe/"]').length).toBe(3);
    element.querySelector<HTMLButtonElement>('[aria-label="Imagen siguiente"]')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.hero h1')?.textContent).toContain('Nuestro valle');
    expect(element.querySelector('[aria-label="Ir a imagen 2"]')?.getAttribute('aria-current')).toBe('true');
  });

  it('vincula cada opción del encabezado con una sección única y cierra el menú', async () => {
    await TestBed.configureTestingModule({ imports: [Inicio] }).compileComponents();
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const ids = ['categorias', 'noticias', 'galeria', 'como-funciona', 'distritos'];
    for (const id of ids) {
      expect(element.querySelectorAll(`section[id="${id}"]`).length).toBe(1);
      const enlace = element.querySelector<HTMLAnchorElement>(`header a[href="/#${id}"]`);
      expect(enlace).not.toBeNull();
      element.querySelector<HTMLButtonElement>('.menu-toggle')!.click();
      fixture.detectChanges();
      enlace!.click();
      fixture.detectChanges();
      expect(element.querySelector('.menu-toggle')?.getAttribute('aria-expanded')).toBe('false');
    }
    expect(element.querySelector('header a[href="#"]')).toBeNull();
  });

  it('mantiene los avisos de las tres acciones del encabezado', async () => {
    const open = vi.fn();
    await TestBed.configureTestingModule({ imports: [Inicio], providers: [{ provide: MatDialog, useValue: { open } }] }).compileComponents();
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('header button'));
    for (const titulo of ['Iniciar sesión', 'Registrarme', 'Reportar incidencia']) {
      buttons.find((button) => button.textContent?.includes(titulo))!.click();
      expect(open).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ data: titulo }));
    }
  });
});
