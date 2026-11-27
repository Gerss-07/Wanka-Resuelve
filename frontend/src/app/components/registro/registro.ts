import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, maxLength, minLength, required, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlertaService } from '../../services/alerta.service';

// Textos de la sección 8.
export const MENSAJES_REGISTRO = {
  nombre: 'El nombre debe tener entre 2 y 100 caracteres',
  correo: 'Correo inválido',
  contrasena: 'La contraseña debe tener al menos 8 caracteres',
  confirmacion: 'Las contraseñas no coinciden',
} as const;

interface ModeloRegistro { nombre: string; correo: string; contrasena: string; confirmacion: string }

@Component({ selector: 'app-registro', imports: [FormField, RouterLink], templateUrl: './registro.html', styleUrl: '../login/login.css' })
export class Registro {
  private readonly auth = inject(AuthService);
  private readonly alertas = inject(AlertaService);
  private readonly router = inject(Router);
  protected readonly visible = signal(false);
  protected readonly enviando = signal(false);
  protected readonly errorEnvio = signal('');

  protected readonly modelo = signal<ModeloRegistro>({ nombre: '', correo: '', contrasena: '', confirmacion: '' });
  protected readonly formulario = form(this.modelo, (esquema) => {
    required(esquema.nombre, { message: MENSAJES_REGISTRO.nombre });
    minLength(esquema.nombre, 2, { message: MENSAJES_REGISTRO.nombre });
    maxLength(esquema.nombre, 100, { message: MENSAJES_REGISTRO.nombre });
    // La sección 8 mide el texto recortado.
    validate(esquema.nombre, ({ value }) => value().length >= 2 && value().trim().length < 2 ? { kind: 'recortado', message: MENSAJES_REGISTRO.nombre } : undefined);
    required(esquema.correo, { message: MENSAJES_REGISTRO.correo });
    email(esquema.correo, { message: MENSAJES_REGISTRO.correo });
    maxLength(esquema.correo, 150, { message: MENSAJES_REGISTRO.correo });
    required(esquema.contrasena, { message: MENSAJES_REGISTRO.contrasena });
    minLength(esquema.contrasena, 8, { message: MENSAJES_REGISTRO.contrasena });
    maxLength(esquema.contrasena, 128, { message: MENSAJES_REGISTRO.contrasena });
    validate(esquema.confirmacion, ({ value, valueOf }) => value() !== valueOf(esquema.contrasena) ? { kind: 'confirmacion', message: MENSAJES_REGISTRO.confirmacion } : undefined);
  });

  protected async enviar(evento?: Event): Promise<void> {
    evento?.preventDefault();
    if (this.enviando() || this.formulario().invalid()) { this.formulario().markAsTouched(); return; }
    const { nombre, correo, contrasena } = this.modelo();
    this.enviando.set(true);
    this.errorEnvio.set('');
    try {
      await this.auth.registrar({ nombre, correo, contrasena });
      void this.alertas.exito('Cuenta creada', 'Ya puedes iniciar sesión con tu correo y contraseña.');
      await this.router.navigate(['/login']);
    } catch (e) {
      this.errorEnvio.set(this.alertas.errorHttp(e));
    } finally {
      this.enviando.set(false);
    }
  }
}
