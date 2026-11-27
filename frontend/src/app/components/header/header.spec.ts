import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Header } from './header';

describe('Header', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));
  it('abre el menú y lo cierra al elegir Iniciar sesión', async () => {
    await TestBed.configureTestingModule({ imports: [Header] }).compileComponents();
    const fixture = TestBed.createComponent(Header);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector<HTMLButtonElement>('.menu-toggle')!;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const login = element.querySelector<HTMLAnchorElement>('.login-button')!;
    login.click();
    fixture.detectChanges();
    expect(login.getAttribute('href')).toBe('/login');
    expect(navegar).toHaveBeenCalledOnce();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('cierra el menú al seleccionar una sección', async () => {
    await TestBed.configureTestingModule({ imports: [Header] }).compileComponents();
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector<HTMLButtonElement>('.menu-toggle')!;
    toggle.click();
    fixture.detectChanges();
    element.querySelector<HTMLAnchorElement>('a[href="/#categorias"]')!.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('vuelve arriba desde la portada sin recargar', async () => {
    await TestBed.configureTestingModule({ imports: [Header] }).compileComponents();
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const logo = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.brand')!;
    logo.click();
    expect(logo.getAttribute('href')).toBe('/');
    expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    scroll.mockRestore();
    raf.mockRestore();
  });

  it('usa el router para regresar desde otra ruta', async () => {
    const base = document.createElement('base');
    base.href = '/';
    document.head.appendChild(base);
    await TestBed.configureTestingModule({ imports: [Header] }).compileComponents();
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    window.history.pushState(null, '', '/otra-ruta');
    (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.brand')!.click();
    expect(navegar).toHaveBeenCalledWith('/');
    window.history.replaceState(null, '', '/');
    base.remove();
  });

  it('desplaza cada enlace a su destino después de cerrar el menú', async () => {
    await TestBed.configureTestingModule({ imports: [Header] }).compileComponents();
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    const desplazamiento = vi.fn();
    const destino = { scrollIntoView: desplazamiento } as unknown as HTMLElement;
    const buscar = vi.spyOn(document, 'getElementById').mockReturnValue(destino);
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const element = fixture.nativeElement as HTMLElement;
    for (const id of ['categorias', 'noticias', 'galeria', 'como-funciona', 'distritos']) {
      element.querySelector<HTMLButtonElement>('.menu-toggle')!.click();
      fixture.detectChanges(false);
      element.querySelector<HTMLAnchorElement>(`a[href="/#${id}"]`)!.click();
      fixture.detectChanges(false);
      expect(buscar).toHaveBeenCalledWith(id);
      expect(desplazamiento).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
      expect(element.querySelector('.menu-toggle')?.getAttribute('aria-expanded')).toBe('false');
    }
    raf.mockRestore();
    buscar.mockRestore();
    window.history.replaceState(null, '', '/');
  });
});
