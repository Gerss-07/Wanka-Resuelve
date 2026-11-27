import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { Categoria, Distrito, ReporteResumen } from '../../interfaces/ciudadano';
import { CiudadanoService } from '../../services/ciudadano.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-ciudadano',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './ciudadano.html',
  styleUrl: './ciudadano.css',
})
export class Ciudadano implements OnInit {
  private readonly servicio = inject(CiudadanoService);
  private readonly route = inject(ActivatedRoute);
  private readonly cambios = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  protected readonly nuevo = this.route.snapshot.data['nuevo'] === true;
  protected readonly desarrollo = !environment.production;
  protected categorias: Categoria[] = [];
  protected distritos: Distrito[] = [];
  protected reportes: ReporteResumen[] = [];
  protected cargando = true;
  protected enviando = false;
  protected error = '';
  protected mensaje = '';
  protected archivos: File[] = [];
  protected readonly form = this.fb.nonNullable.group({
    id_categoria: ['', Validators.required], id_distrito: ['', Validators.required],
    descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    referencia: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
    latitud: ['', [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitud: ['', [Validators.required, Validators.min(-180), Validators.max(180)]],
  });
  ngOnInit(): void {
    if (this.nuevo) {
      forkJoin({ categorias: this.servicio.categorias(), distritos: this.servicio.distritos() }).pipe(
        finalize(() => this.terminarCarga()),
      ).subscribe({
        next: (datos) => { this.categorias = datos.categorias; this.distritos = datos.distritos; },
        error: () => { this.error = 'No fue posible cargar los catálogos. Verifica la conexión con la API.'; },
      });
    } else {
      this.servicio.reportes().pipe(finalize(() => this.terminarCarga())).subscribe({
        next: (reportes) => { this.reportes = reportes; },
        error: () => { this.error = 'No fue posible cargar tus reportes. Verifica la conexión con la API.'; },
      });
    }
  }
  private terminarCarga(): void {
    this.cargando = false;
    this.cambios.markForCheck();
  }
  protected fotos(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const fotos = Array.from(input.files ?? []);
    this.archivos = [];
    if (fotos.length > 3) this.error = 'Puedes adjuntar como máximo 3 fotografías.';
    else if (fotos.some((f) => !['image/jpeg', 'image/png'].includes(f.type))) this.error = 'Solo se permiten imágenes JPG o PNG.';
    else if (fotos.some((f) => f.size > 2000000 || f.size === 0)) this.error = 'Cada fotografía debe pesar hasta 2 MB.';
    else { this.error = ''; this.archivos = fotos; return; }
    input.value = '';
  }
  protected ubicacion(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { this.error = 'La geolocalización no está disponible en este navegador.'; return; }
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        this.form.patchValue({ latitud: posicion.coords.latitude.toFixed(6), longitud: posicion.coords.longitude.toFixed(6) });
        this.error = '';
        this.cambios.markForCheck();
      },
      () => {
        this.error = 'No se pudo obtener la ubicación. Comprueba los permisos o ingresa las coordenadas.';
        this.cambios.markForCheck();
      },
      { timeout: 10000 },
    );
  }
  protected guardar(): void {
    if (this.enviando || this.mensaje) return;
    const valor = this.form.getRawValue();
    if (this.form.invalid || valor.descripcion.trim().length < 10 || valor.referencia.trim().length < 5 || this.archivos.length < 1) {
      this.form.markAllAsTouched(); this.error = 'Completa los campos válidos y adjunta entre 1 y 3 fotografías.'; return;
    }
    const datos = new FormData();
    for (const [clave, contenido] of Object.entries(valor)) datos.append(clave, String(contenido).trim());
    for (const foto of this.archivos) datos.append('fotos', foto, foto.name);
    this.enviando = true; this.error = '';
    this.servicio.crear(datos).pipe(finalize(() => {
      this.enviando = false;
      this.cambios.markForCheck();
    })).subscribe({
      next: (reporte) => { this.mensaje = `Reporte ${reporte.codigo} registrado correctamente.`; },
      error: () => { this.error = 'No se pudo registrar la incidencia. Revisa los datos e inténtalo nuevamente.'; },
    });
  }
}
