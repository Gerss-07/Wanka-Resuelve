import { afterNextRender, Component, ElementRef, inject, Injector, OnDestroy, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Catalogo } from '../../interfaces/catalogo.interface';
import { ReporteDatos, ReporteDetalle } from '../../interfaces/reporte.interface';
import { CatalogoService } from '../../services/catalogo.service';
import { ReporteService } from '../../services/reporte.service';
import { AlertaService } from '../../services/alerta.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MapaSelector, Punto } from '../mapa-selector/mapa-selector';

export function textoRecortado(min: number, max: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const length = String(control.value ?? '').trim().length;
    return length >= min && length <= max ? null : { longitud: true };
  };
}
export function validarFotos(fotos: File[]): string {
  if (fotos.length < 1 || fotos.length > 3) return 'Adjunta entre 1 y 3 fotos.';
  if (fotos.some(f => !['image/jpeg', 'image/png'].includes(f.type) || f.size < 1 || f.size > 2000000)) return 'Cada foto debe ser JPEG o PNG de hasta 2 MB.';
  return '';
}
export async function firmaFotoValida(foto: File): Promise<boolean> {
  const firma = foto.type === 'image/jpeg'
    ? [0xff, 0xd8, 0xff]
    : [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const bytes = new Uint8Array(await foto.slice(0, firma.length).arrayBuffer());
  return firma.every((byte, indice) => bytes[indice] === byte);
}
interface FotoSeleccionada { archivo: File; url: string }

@Component({ selector: 'app-reporte-form', imports: [DecimalPipe, ReactiveFormsModule, RouterLink, MapaSelector], templateUrl: './reporte-form.html' })
export class ReporteForm implements OnDestroy {
  private fb = inject(FormBuilder); private catalogo = inject(CatalogoService); private api = inject(ReporteService);
  private alertas = inject(AlertaService); private router = inject(Router); private route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  private destruido = false;
  private readonly idRuta = this.route.snapshot.paramMap.get('id');
  protected readonly id = this.idRuta === null ? null : Number(this.idRuta);
  protected categorias = signal<Catalogo[]>([]); protected distritos = signal<Catalogo[]>([]);
  protected cargando = signal(true); protected error = signal(''); protected enviando = signal(false);
  protected errorCatalogos = signal('');
  protected catalogosListos = signal(false);
  protected errorEnvio = signal('');
  protected errorSeleccion = signal('');
  protected errorUbicacion = signal('');
  protected leyendoFotos = signal(false);
  protected paso = signal<1 | 2>(1); protected intentado = signal(false);
  protected punto = signal<Punto | null>(null);
  protected fotos = signal<FotoSeleccionada[]>([]);
  protected creado = signal<ReporteDetalle | null>(null); protected editable = signal(true);
  protected form = this.fb.nonNullable.group({
    idCategoria: [0, [Validators.required, Validators.min(1)]], idDistrito: [0, [Validators.required, Validators.min(1)]],
    descripcion: ['', textoRecortado(10, 1000)], referencia: ['', textoRecortado(5, 255)]
  });
  constructor() { void this.cargar(); }
  protected async cargar(): Promise<void> {
    if (this.id !== null && (!Number.isSafeInteger(this.id) || this.id <= 0)) {
      this.error.set('El identificador del reporte no es válido.');
      this.cargando.set(false);
      return;
    }
    if (!this.id) {
      await this.cargarCatalogos();
      return;
    }
    this.cargando.set(true);
    this.error.set('');
    try {
      this.aplicar(await this.api.obtener(this.id));
      if (this.editable()) await this.cargarCatalogos();
    } catch (e) { this.error.set(this.alertas.errorHttp(e)); }
    finally { this.cargando.set(false); }
  }
  protected async cargarCatalogos(): Promise<void> {
    this.cargando.set(true);
    this.errorCatalogos.set('');
    this.catalogosListos.set(false);
    try {
      const [categorias, distritos] = await Promise.all([this.catalogo.categorias(), this.catalogo.distritos()]);
      this.categorias.set(categorias);
      this.distritos.set(distritos);
      if (!categorias.length || !distritos.length) {
        this.errorCatalogos.set('Los catálogos todavía no contienen opciones.');
      } else {
        this.catalogosListos.set(true);
      }
    } catch (e) {
      this.errorCatalogos.set(this.alertas.errorHttp(e));
    } finally {
      this.cargando.set(false);
    }
  }
  private aplicar(r: ReporteDetalle): void {
    this.editable.set(r.estado === 'RECIBIDO');
    this.form.setValue({ idCategoria:r.categoria.id, idDistrito:r.distrito.id, descripcion:r.descripcion, referencia:r.referencia });
    this.punto.set({ latitud:r.latitud, longitud:r.longitud });
  }
  protected async seleccionarFotos(input: HTMLInputElement): Promise<void> {
    if (this.leyendoFotos()) return;
    const archivos = Array.from(input.files ?? []);
    if (!archivos.length) return;
    input.value = '';
    const error = validarFotos([...this.fotos().map(foto => foto.archivo), ...archivos]);
    this.errorSeleccion.set(error);
    if (error) return;
    this.leyendoFotos.set(true);
    try {
      const firmas = await Promise.all(archivos.map(firmaFotoValida));
      if (this.destruido) return;
      if (firmas.some(valida => !valida)) {
        this.errorSeleccion.set('Selecciona archivos JPEG o PNG válidos.');
        return;
      }
      this.fotos.update(fotos => [...fotos, ...archivos.map(archivo => ({
        archivo, url: URL.createObjectURL(archivo)
      }))]);
    } catch {
      this.errorSeleccion.set('No pudimos leer las fotografías seleccionadas.');
    } finally {
      this.leyendoFotos.set(false);
    }
  }
  protected quitarFoto(foto: FotoSeleccionada): void {
    this.fotos.update(fotos => fotos.filter(actual => actual !== foto));
    URL.revokeObjectURL(foto.url);
    this.errorSeleccion.set('');
  }
  protected errorFotos(): string { return validarFotos(this.fotos().map(foto => foto.archivo)); }
  protected seleccionarPunto(punto: Punto): void {
    this.punto.set(punto);
    this.errorUbicacion.set('');
  }
  protected usarMiUbicacion(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.errorUbicacion.set('Este navegador no permite consultar tu ubicación.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => this.seleccionarPunto({ latitud: coords.latitude, longitud: coords.longitude }),
      () => this.errorUbicacion.set('No se pudo obtener tu ubicación. Marca un punto en el mapa.'),
      { timeout: 10000 },
    );
  }
  protected ubicacionValida(): boolean {
    const p = this.punto(); return !!p && Number.isFinite(p.latitud) && Number.isFinite(p.longitud) && Math.abs(p.latitud) <= 90 && Math.abs(p.longitud) <= 180;
  }
  protected nombre(lista: Catalogo[], id: number): string { return lista.find(c => c.id === Number(id))?.nombre ?? ''; }
  protected continuar(): void {
    this.errorEnvio.set('');
    this.intentado.set(true); this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (this.leyendoFotos() || !this.catalogosListos() || this.form.invalid || !this.nombre(this.categorias(), v.idCategoria) || !this.nombre(this.distritos(), v.idDistrito) || !this.ubicacionValida() || (!this.id && this.errorFotos())) return;
    if (this.id) void this.guardar(); else this.irAlPaso(2);
  }
  protected irAlPaso(paso: 1 | 2): void {
    this.paso.set(paso);
    this.enfocarTitulo();
  }
  private enfocarTitulo(): void {
    afterNextRender(() => this.titulo()?.nativeElement.focus(), { injector: this.injector });
  }
  protected async guardar(): Promise<void> {
    if (!this.catalogosListos() || this.enviando() || !this.editable() || !this.ubicacionValida()) return;
    const p = this.punto()!; const v = this.form.getRawValue();
    if (this.form.invalid || !this.nombre(this.categorias(), v.idCategoria) || !this.nombre(this.distritos(), v.idDistrito) || (!this.id && (this.paso() !== 2 || this.errorFotos()))) return;
    const datos: ReporteDatos = { ...v, idCategoria: Number(v.idCategoria), idDistrito: Number(v.idDistrito), ...p };
    this.enviando.set(true);
    this.errorEnvio.set('');
    try {
      if (this.id) { const r = await this.api.editar(this.id, datos); void this.alertas.exito('Cambios guardados', 'El reporte se actualizó correctamente.'); await this.router.navigate(['/ciudadano/reportes', r.id]); }
      else {
        const r = await this.api.crear(datos, this.fotos().map(foto => foto.archivo));
        this.creado.set(r);
        this.enfocarTitulo();
        void this.alertas.exito('Reporte registrado', `El código asignado es ${r.codigo}.`);
      }
    } catch (e) {
      this.errorEnvio.set(this.alertas.errorHttp(e));
      if (this.id && e instanceof HttpErrorResponse && e.status === 409) {
        try { this.aplicar(await this.api.obtener(this.id)); } catch (actualizacion) { this.error.set(this.alertas.errorHttp(actualizacion)); }
      }
    } finally { this.enviando.set(false); }
  }
  ngOnDestroy(): void {
    this.destruido = true;
    this.fotos().forEach(foto => URL.revokeObjectURL(foto.url));
  }
}
