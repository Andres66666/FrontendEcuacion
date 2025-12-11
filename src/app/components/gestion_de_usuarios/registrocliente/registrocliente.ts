import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { ServiciosService } from '../../../services/servicios.service';

@Component({
  selector: 'app-registrocliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registrocliente.html',
  styleUrls: ['./registrocliente.css'],
})
export class Registrocliente {
  @Output() registroCompleto = new EventEmitter<void>();
  @Output() cerrarRegistro = new EventEmitter<void>();
  @Output() notificacion = new EventEmitter<string>(); // Evento para mostrar mensajes

  correoValido = false;
  validandoCorreo = false;
  mostrarPassword = false;
  mostrarRegistro = true;

  tokenVerificacion: string | null = null;

  form = {
    nombre: '',
    apellido: '',
    fecha_nacimiento: '',
    telefono: '',
    correo: '',
    password: '',
    ci: '',
  };

  constructor(
    private servicios: ServiciosService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.tokenVerificacion = this.route.snapshot.paramMap.get('token');

    if (this.tokenVerificacion) {
      this.servicios.confirmarRegistro(this.tokenVerificacion).subscribe({
        next: (res: any) => {
          this.correoValido = true;
          this.form = res.datos;
          this.mostrarMensaje(
            'Correo verificado. Revise los datos y haga clic en Crear Cuenta.'
          );
        },
        error: () => {
          this.mostrarMensaje(
            'El enlace de verificación no es válido o expiró.'
          );
        },
      });
    }
  }

  verificarCorreo() {
    if (!this.form.correo) {
      this.mostrarMensaje('Ingresa un correo primero');
      return;
    }

    this.validandoCorreo = true;

    this.servicios.validarCorreo(this.form.correo).subscribe({
      next: () => {
        this.servicios.enviarVerificacion(this.form).subscribe({
          next: () => {
            this.mostrarMensaje('Se envió un correo para verificar tus datos.');
            this.validandoCorreo = false;
          },
          error: (err) => {
            this.mostrarMensaje(
              err.error.error || 'No se pudo enviar verificación'
            );
            this.validandoCorreo = false;
          },
        });
      },
      error: (err) => {
        this.mostrarMensaje(err.error.error || 'Error al validar correo');
        this.validandoCorreo = false;
      },
    });
  }

  registrar() {
    if (!this.correoValido) {
      this.mostrarMensaje('Debes verificar tu correo antes de registrar');
      return;
    }

    this.servicios.registrarCliente(this.form).subscribe({
      next: () => {
        this.mostrarMensaje('Registro exitoso. Ahora puede iniciar sesión.');
        this.registroCompleto.emit();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.mostrarMensaje(err.error.error || 'Error al registrar');
      },
    });
  }

  ocultarRegistro() {
    this.cerrarRegistro.emit();
  }

  // Función para emitir notificaciones de manera segura
  private mostrarMensaje(mensaje: string) {
    this.notificacion.emit(mensaje);
  }
  mensajeNotificacion: string | null = null;

  onNotificacion(msg: string) {
    this.mensajeNotificacion = msg;
    setTimeout(() => (this.mensajeNotificacion = null), 4000);
  }
}
