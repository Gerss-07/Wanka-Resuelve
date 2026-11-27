import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlertaService } from '../../services/alerta.service';
import { inicioPorRol } from '../../services/sesion.service';

export const MENSAJES_LOGIN = {
  correo: 'Correo inválido',
  contrasena: 'Ingresa tu contraseña',
} as const;

interface ModeloLogin { correo: string; contrasena: string }

@Component({ selector: 'app-login', imports: [FormField, RouterLink], templateUrl: './login.html', styleUrl: './login.css' })
export class Login {
  private readonly auth = inject(AuthService);
  private readonly alertas = inject(AlertaService);
  private readonly router = inject(Router);
  protected readonly visible = signal(false);
  protected readonly enviando = signal(false);
  protected readonly errorEnvio = signal('');

  protected readonly modelo = signal<ModeloLogin>({ correo: '', contrasena: '' });
  protected readonly formulario = form(this.modelo, (esquema) => {
    required(esquema.correo, { message: MENSAJES_LOGIN.correo });
    email(esquema.correo, { message: MENSAJES_LOGIN.correo });
    required(esquema.contrasena, { message: MENSAJES_LOGIN.contrasena });
  });

  protected async enviar(evento?: Event): Promise<void> {
    evento?.preventDefault();
    if (this.enviando() || this.formulario().invalid()) { this.formulario().markAsTouched(); return; }
    const { correo, contrasena } = this.modelo();
    this.enviando.set(true);
    this.errorEnvio.set('');
    try {
      const usuario = await this.auth.iniciarSesion(correo, contrasena);
      await this.router.navigateByUrl(this.destino(usuario.rol));
    } catch (e) {
      // Un 401 trae «Credenciales inválidas» en detail.
      this.errorEnvio.set(this.alertas.errorHttp(e));
    } finally {
      this.enviando.set(false);
    }
  }

  protected destino(rol: Parameters<typeof inicioPorRol>[0]): string {
    return inicioPorRol(rol);
  }
}
