import { afterNextRender, Component, computed, ElementRef, inject, Injector, OnDestroy, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { form, FormField, maxLength, minLength, required, validate } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Catalogo } from '../../interfaces/catalogo.interface';
import { ReporteDatos, ReporteDetalle } from '../../interfaces/reporte.interface';
import { CatalogoService } from '../../services/catalogo.service';
import { ReporteService } from '../../services/reporte.service';
import { AlertaService } from '../../services/alerta.service';
import { MapaSelector, Punto } from '../mapa-selector/mapa-selector';

// Textos de la sección 8.
export const MENSAJES = {
  categoria: 'Categoría inválida',
  distrito: 'Distrito inválido',
  descripcion: 'Describe la incidencia (mínimo 10 caracteres)',
  referencia: 'Indica una dirección o referencia (mínimo 5 caracteres)',
  ubicacion: 'Marca la ubicación en el mapa',
  cantidadFotos: 'Adjunta entre 1 y 3 fotos',
  foto: 'Cada foto debe ser JPEG o PNG de hasta 2 MB',
} as const;

export function validarFotos(fotos: File[]): string {
  if (fotos.length < 1 || fotos.length > 3) return MENSAJES.cantidadFotos;
  if (fotos.some(f => !['image/jpeg', 'image/png'].includes(f.type) || f.size < 1 || f.size > 2000000)) return MENSAJES.foto;
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
/** Los ids van como texto porque un <select> entrega su valor como texto. */
export interface ModeloReporte { id_categoria: string; id_distrito: string; descripcion: string; referencia: string }

@Component({ selector: 'app-reporte-form', imports: [DecimalPipe, FormField, RouterLink, MapaSelector], templateUrl: './reporte-form.html' })
export class ReporteForm implements OnDestroy {
  private catalogo = inject(CatalogoService); private api = inject(ReporteService);
  private alertas = inject(AlertaService); private router = inject(Router); private route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  private destruido = false;
  private readonly idRuta = this.route.snapshot.paramMap.get('id');
  protected readonly id = this.idRuta === null ? null : Number(this.idRuta);
  protected readonly mensajes = MENSAJES;
  protected categorias = signal<Catalogo[]>([]); protected distritos = signal<Catalogo[]>([]);
  protected cargando = signal(true); protected error = signal(''); protected enviando = signal(false);
  protected errorCatalogos = signal('');
  protected catalogosListos = signal(false);
  protected errorEnvio = signal('');
  protected errorSeleccion = signal('');
  protected errorUbicacion = signal('');
  protected leyendoFotos = signal(false);
  protected fotosTocadas = signal(false);
  protected paso = signal<1 | 2>(1);
  protected punto = signal<Punto | null>(null);
  protected fotos = signal<FotoSeleccionada[]>([]);
  protected creado = signal<ReporteDetalle | null>(null); protected editable = signal(true);

  protected readonly modelo = signal<ModeloReporte>({ id_categoria: '', id_distrito: '', descripcion: '', referencia: '' });
  protected readonly formulario = form(this.modelo, (esquema) => {
    required(esquema.id_categoria, { message: MENSAJES.categoria });
    validate(esquema.id_categoria, ({ value }) => this.fueraDeCatalogo(this.categorias(), value()) ? { kind: 'catalogo', message: MENSAJES.categoria } : undefined);
    required(esquema.id_distrito, { message: MENSAJES.distrito });
    validate(esquema.id_distrito, ({ value }) => this.fueraDeCatalogo(this.distritos(), value()) ? { kind: 'catalogo', message: MENSAJES.distrito } : undefined);
    required(esquema.descripcion, { message: MENSAJES.descripcion });
    minLength(esquema.descripcion, 10, { message: MENSAJES.descripcion });
    maxLength(esquema.descripcion, 1000, { message: MENSAJES.descripcion });
    validate(esquema.descripcion, ({ value }) => soloEspacios(value(), 10) ? { kind: 'recortado', message: MENSAJES.descripcion } : undefined);
    required(esquema.referencia, { message: MENSAJES.referencia });
    minLength(esquema.referencia, 5, { message: MENSAJES.referencia });
    maxLength(esquema.referencia, 255, { message: MENSAJES.referencia });
    validate(esquema.referencia, ({ value }) => soloEspacios(value(), 5) ? { kind: 'recortado', message: MENSAJES.referencia } : undefined);
  });
  protected readonly pinValido = computed(() => {
    const p = this.punto();
    return !!p && Number.isFinite(p.latitud) && Number.isFinite(p.longitud) && Math.abs(p.latitud) <= 90 && Math.abs(p.longitud) <= 180;
  });
  /** Las fotos solo cuentan al crear: en edición no se cambian. */
  protected readonly fotosValidas = computed(() => this.id !== null || !this.errorFotos());
  /** Los avisos de pin y fotos aparecen cuando la persona ya empezó a llenar el formulario. */
  protected readonly mostrarAvisos = computed(() => this.formulario().touched() || this.fotosTocadas());

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
    this.modelo.set({ id_categoria: String(r.categoria.id), id_distrito: String(r.distrito.id), descripcion: r.descripcion, referencia: r.referencia });
    this.punto.set({ latitud: r.latitud, longitud: r.longitud });
  }
  private fueraDeCatalogo(lista: Catalogo[], id: string): boolean {
    return id !== '' && !lista.some(item => String(item.id) === id);
  }
  protected async seleccionarFotos(input: HTMLInputElement): Promise<void> {
    if (this.leyendoFotos()) return;
    const archivos = Array.from(input.files ?? []);
    if (!archivos.length) return;
    input.value = '';
    this.fotosTocadas.set(true);
    const error = validarFotos([...this.fotos().map(foto => foto.archivo), ...archivos]);
    this.errorSeleccion.set(error);
    if (error) return;
    this.leyendoFotos.set(true);
    try {
      const firmas = await Promise.all(archivos.map(firmaFotoValida));
      if (this.destruido) return;
      if (firmas.some(valida => !valida)) {
        this.errorSeleccion.set(MENSAJES.foto);
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
  protected nombre(lista: Catalogo[], id: string): string { return lista.find(c => String(c.id) === id)?.nombre ?? ''; }
  protected listo(): boolean {
    return this.catalogosListos() && !this.formulario().invalid() && this.pinValido() && this.fotosValidas() && !this.leyendoFotos();
  }
  protected continuar(evento?: Event): void {
    evento?.preventDefault();
    this.errorEnvio.set('');
    if (!this.listo()) { this.formulario().markAsTouched(); return; }
    if (this.id) void this.guardar(); else this.irAlPaso(2);
  }
  protected irAlPaso(paso: 1 | 2): void {
    this.paso.set(paso);
    this.enfocarTitulo();
  }
  private enfocarTitulo(): void {
    afterNextRender(() => this.titulo()?.nativeElement.focus(), { injector: this.injector });
  }
  private datos(): ReporteDatos {
    const v = this.modelo(); const p = this.punto()!;
    return { idCategoria: Number(v.id_categoria), idDistrito: Number(v.id_distrito), descripcion: v.descripcion, referencia: v.referencia, latitud: p.latitud, longitud: p.longitud };
  }
  protected async guardar(): Promise<void> {
    if (this.enviando() || !this.editable() || !this.listo() || (!this.id && this.paso() !== 2)) return;
    this.enviando.set(true);
    this.errorEnvio.set('');
    try {
      if (this.id) {
        const r = await this.api.editar(this.id, this.datos());
        void this.alertas.exito('Cambios guardados', 'El reporte se actualizó correctamente.');
        await this.router.navigate(['/ciudadano/reportes', r.id]);
      } else {
        const r = await this.api.crear(this.datos(), this.fotos().map(foto => foto.archivo));
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

/** La sección 8 mide el texto recortado: falla si solo alcanza el mínimo gracias a los espacios. */
function soloEspacios(valor: string, minimo: number): boolean {
  return valor.length >= minimo && valor.trim().length < minimo;
}
