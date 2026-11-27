import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({ selector: 'app-acceso', imports: [ReactiveFormsModule, RouterLink], templateUrl: './acceso.html', styleUrl: './acceso.css' })
export class Acceso {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(NotificationService);
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
    if (!correo.trim() || !contrasena || (this.registro && (!nombre.trim() || !confirmar))) { this.avisos.warning('Completa los campos obligatorios'); return; }
    if (this.form.controls.correo.invalid) { this.avisos.warning('Ingresa un correo electrónico válido'); return; }
    if (this.registro && nombre.trim().length < 2) return;
    if (this.registro && contrasena !== confirmar) { this.avisos.warning('Las contraseñas no coinciden'); return; }
    this.enviando = true;
    const solicitud = this.registro ? this.auth.registrar(nombre.trim(), correo.trim(), contrasena) : this.auth.iniciarSesion(correo.trim(), contrasena);
    solicitud.pipe(finalize(() => this.enviando = false)).subscribe({ error: () => this.avisos.error('El servicio de autenticación aún no está disponible.') });
  }
}
