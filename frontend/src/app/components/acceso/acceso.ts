import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlertaService } from '../../services/alerta.service';

@Component({ selector: 'app-acceso', imports: [ReactiveFormsModule, RouterLink], templateUrl: './acceso.html', styleUrl: './acceso.css' })
export class Acceso {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(AlertaService);
  protected readonly registro = inject(ActivatedRoute).snapshot.data['registro'] === true;
  protected visible = false;
  protected enviando = false;
  protected enviado = false;
  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.maxLength(100)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    contrasena: ['', Validators.required],
    confirmar: ['']
  });
  protected enviar(): void {
    if (this.enviando) return;
    this.enviado = true;
    this.form.markAllAsTouched();
    const { nombre, correo, contrasena, confirmar } = this.form.getRawValue();
    if (!correo.trim() || !contrasena || (this.registro && (!nombre.trim() || !confirmar))) { void this.avisos.error('Completa los campos obligatorios'); return; }
    if (this.form.controls.correo.invalid) { void this.avisos.error('Ingresa un correo electrónico válido'); return; }
    if (this.registro && nombre.trim().length < 2) return;
    if (this.registro && contrasena !== confirmar) { void this.avisos.error('Las contraseñas no coinciden'); return; }
    this.enviando = true;
    const solicitud = this.registro ? this.auth.registrar({ nombre, correo, contrasena }) : this.auth.iniciarSesion(correo, contrasena);
    solicitud.catch(e => this.avisos.errorHttp(e)).finally(() => this.enviando = false);
  }
}
