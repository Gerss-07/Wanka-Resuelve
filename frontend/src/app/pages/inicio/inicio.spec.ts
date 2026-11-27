import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
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

  it('abre la pantalla de login desde el encabezado y enlaza con el registro', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const harness = await RouterTestingHarness.create('/');
    harness.routeNativeElement!.querySelector<HTMLAnchorElement>('.login-button')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement!.querySelector('.bienvenida img')?.getAttribute('src')).toBe('/images/logo-wanka-resuelve.png');
    expect(harness.routeNativeElement!.querySelector('.formulario h2')?.textContent).toBe('Iniciar sesión');

    harness.routeNativeElement!.querySelector<HTMLAnchorElement>('a[href="/registro"]')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/registro');
    expect(harness.routeNativeElement!.querySelector('.formulario h2')?.textContent).toBe('Crear cuenta');
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

  it('abre registro desde el encabezado y envía al login las acciones de reporte sin sesión', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create('/');
    harness.routeNativeElement!.querySelector<HTMLAnchorElement>('.register-button')!.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/registro');

    for (const selector of ['.report-button', '.hero-link', '.feature-report']) {
      await harness.navigateByUrl('/');
      harness.routeNativeElement!.querySelector<HTMLAnchorElement>(selector)!.click();
      await harness.fixture.whenStable();
      const url = router.parseUrl(router.url);
      expect(url.root.children['primary'].segments.map(segment => segment.path)).toEqual(['login']);
      expect(url.queryParams['destino']).toBe('/ciudadano/reportes/nuevo');
    }
  });
});
