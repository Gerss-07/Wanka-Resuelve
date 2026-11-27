import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlertaService } from '../../services/alerta.service';
import { destinoPermitido, inicioPorRol } from '../../services/sesion.service';
import { Rol } from '../../interfaces/auth.interface';

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
  private readonly ruta = inject(ActivatedRoute);
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

  /** Va al destino pedido si el rol puede entrar ahí; si no, al inicio de su rol. */
  protected destino(rol: Rol): string {
    const destino = this.ruta.snapshot.queryParamMap.get('destino');
    return destinoPermitido(destino, rol) ? destino : inicioPorRol(rol);
  }
}
