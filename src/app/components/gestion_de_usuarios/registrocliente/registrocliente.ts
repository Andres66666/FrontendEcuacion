import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  @Output() notificacion = new EventEmitter<string>();

  correoValido = false;
  validandoCorreo = false;
  mostrarPassword = false;
  mostrarRegistro = true;
  formularioEnviado = false;

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
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.tokenVerificacion = this.route.snapshot.paramMap.get('token');

    if (this.tokenVerificacion) {
      this.servicios.confirmarRegistro(this.tokenVerificacion).subscribe({
        next: (res: any) => {
          this.correoValido = true;
          this.form = res.datos;
          this.mostrarMensaje(
            'Correo verificado correctamente. Revise sus datos y haga clic en Crear Cuenta.',
          );
        },
        error: () => {
          this.correoValido = false;
          this.mostrarMensaje(
            'El enlace de verificación no es válido o expiró.',
          );
        },
      });
    }
  }

  // VALIDACIONES / FILTROS

  soloTexto(event: any, campo: 'nombre' | 'apellido') {
    let valor = event.target.value;

    // Solo letras y espacios, incluyendo tildes y ñ
    valor = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    valor = valor.replace(/\s{2,}/g, ' ');

    this.form[campo] = valor;
  }

  soloNumeros(event: any, campo: 'telefono' | 'ci') {
    let valor = event.target.value.replace(/\D/g, '');

    if (campo === 'telefono') {
      valor = valor.slice(0, 8);
    }

    if (campo === 'ci') {
      valor = valor.slice(0, 9);
    }

    this.form[campo] = valor;
  }

  validarPasswordInput(event: any) {
    let valor = event.target.value;

    valor = valor.replace(/\s/g, '');

    valor = valor.slice(0, 11);

    this.form.password = valor;
  }

  correoModificado() {
    this.correoValido = false;
  }

  passwordValida(password: string): boolean {
    if (password.length !== 11) return false;

    const letras = (password.match(/[A-Za-z]/g) || []).length;
    const numeros = (password.match(/[0-9]/g) || []).length;
    const especiales = (password.match(/[^A-Za-z0-9]/g) || []).length;

    return letras >= 1 && numeros >= 1 && especiales === 1;
  }

  telefonoValido(telefono: string): boolean {
    return /^[67]\d{7}$/.test(telefono);
  }

  ciValido(ci: string): boolean {
    return /^\d{7,8}$/.test(ci);
  }

  nombreValido(nombre: string): boolean {
    return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre.trim());
  }

  emailValido(correo: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  }

  formularioValido(): boolean {
    return (
      this.form.nombre.trim() !== '' &&
      this.nombreValido(this.form.nombre) &&
      this.form.apellido.trim() !== '' &&
      this.nombreValido(this.form.apellido) &&
      this.form.fecha_nacimiento.trim() !== '' &&
      this.telefonoValido(this.form.telefono) &&
      this.emailValido(this.form.correo) &&
      this.passwordValida(this.form.password) &&
      this.ciValido(this.form.ci)
    );
  }

  verificarCorreo() {
    if (!this.formularioValido()) {
      this.mostrarMensaje(
        'Complete correctamente todos los campos antes de validar el correo.',
      );
      return;
    }

    if (!this.emailValido(this.form.correo)) {
      this.mostrarMensaje('Ingrese un correo electrónico válido.');
      return;
    }

    this.validandoCorreo = true;

    this.servicios.validarCorreo(this.form.correo).subscribe({
      next: () => {
        this.servicios.enviarVerificacion(this.form).subscribe({
          next: () => {
            this.mostrarMensaje(
              'Validación correcta. Se envió un correo de verificación. Revise su bandeja de entrada.',
            );
            this.validandoCorreo = false;
          },
          error: (err) => {
            this.mostrarMensaje(
              err.error?.error ||
                'No se pudo enviar el correo de verificación.',
            );
            this.validandoCorreo = false;
          },
        });
      },
      error: (err) => {
        this.mostrarMensaje(err.error?.error || 'Error al validar el correo.');
        this.validandoCorreo = false;
      },
    });
  }

  registrar(formulario: NgForm) {
    this.formularioEnviado = true;

    if (formulario.invalid || !this.formularioValido()) {
      this.mostrarMensaje(
        'Por favor complete correctamente todos los campos obligatorios.',
      );
      return;
    }

    if (!this.correoValido) {
      this.mostrarMensaje('Debe verificar su correo antes de crear la cuenta.');
      return;
    }

    this.servicios.registrarCliente(this.form).subscribe({
      next: () => {
        this.mostrarMensaje('Registro exitoso. Ahora puede iniciar sesión.');
        this.registroCompleto.emit();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.mostrarMensaje(err.error?.error || 'Error al registrar.');
      },
    });
  }

  ocultarRegistro() {
    this.cerrarRegistro.emit();
  }

  private mostrarMensaje(mensaje: string) {
    this.mensajeNotificacion = mensaje;
    this.notificacion.emit(mensaje);
    setTimeout(() => (this.mensajeNotificacion = null), 4000);
  }

  mensajeNotificacion: string | null = null;

  onNotificacion(msg: string) {
    this.mensajeNotificacion = msg;
    setTimeout(() => (this.mensajeNotificacion = null), 4000);
  }
}
