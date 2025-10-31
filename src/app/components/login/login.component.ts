import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ServiciosService } from '../../services/servicios.service';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ErrorComponent } from '../mensajes/error/error.component';
import { OkComponent } from '../mensajes/ok/ok.component';
import { Advertencia } from '../mensajes/advertencia/advertencia';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ErrorComponent,
    OkComponent,
    Advertencia,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  correo: string = '';
  password: string = '';
  showPassword: boolean = false;
  isLoading: boolean = false;
  mensajeExito: string = '';
  mensajeError: string = '';
  mensajeAdvertencia: string = '';
  correoReset: string = '';
  usuarioId: number | null = null;
  codigo2FA: string = '';
  codigoEnviado = false;
  loading: boolean = false;
  qrBase64: string | null = null;
  metodoSeleccionado: 'correo' | 'totp' | null = null;

  // NUEVO: Array para manejar los 6 inputs de forma separada
  codigoInputs: string[] = ['', '', '', '', '', ''];

  tempRoles: string[] = [];
  tempPermisos: string[] = [];
  tempNombreUsuario: string = '';
  tempApellido: string = '';
  tempImagenUrl: string | null = null;
  tempMensajeAdicional: string = '';
  tempTipoMensaje: string = '';
  tempDiasTranscurridos: number = 0;
  tempRequiereCambioPassword: boolean = false;
  tempMensajeUrgente: boolean = false;

  vistaActual:
    | 'login'
    | 'olvide'
    | 'cambiar_password_temp'
    | 'seleccion_2fa'
    | '2fa' = 'login';
  tempToken: string = '';
  tempPass: string = '';
  nuevaPassword: string = '';
  confirmarPassword: string = '';
  tempVerificado: boolean = false;

  constructor(public router: Router, private service: ServiciosService) {}

  onInputCode(
    event: Event,
    index: number,
    nextInput: HTMLInputElement | null
  ): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    value = value.replace(/[^0-9]/g, '');
    if (value.length > 1) {
      value = value.charAt(0);
    }

    this.codigoInputs[index] = value;
    this.codigo2FA = this.codigoInputs.join('');
    if (value && value.length === 1 && index < 5 && nextInput) {
      nextInput.focus();
    }
  }
  onBackspace(
    event: any,
    index: number,
    prevInput: HTMLInputElement | null
  ): void {
    const input = event.target as HTMLInputElement;

    if (input.value === '' && index > 0 && prevInput) {
      event.preventDefault();

      this.codigoInputs[index - 1] = '';

      this.codigo2FA = this.codigoInputs.join('');

      prevInput.focus();
    }
  }
  onPaste(event: ClipboardEvent, startIndex: number): void {
    event.preventDefault();

    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const pastedText = clipboardData.getData('text/plain');
    const digits = pastedText
      .replace(/[^0-9]/g, '')
      .substring(0, 6)
      .split('');
    this.codigoInputs = ['', '', '', '', '', ''];
    for (let i = 0; i < digits.length && i < 6; i++) {
      this.codigoInputs[i] = digits[i];
    }

    this.codigo2FA = this.codigoInputs.join('');
    for (let i = 0; i < 6; i++) {
      const inputEl = document.getElementById(
        `input${i}`
      ) as HTMLInputElement | null;
      if (inputEl) {
        inputEl.value = this.codigoInputs[i];
      }
    }
    const lastFilledIndex = Math.min(digits.length - 1, 5);
    const nextFocusIndex = Math.min(lastFilledIndex + 1, 5);
    const nextInputEl = document.getElementById(
      `input${nextFocusIndex}`
    ) as HTMLInputElement | null;
    if (nextInputEl) {
      nextInputEl.focus();
      if (digits.length < 6) {
        nextInputEl.select();
      }
    }
  }
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  isFormValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      this.correo.trim() !== '' &&
      this.password.trim().length >= 6 &&
      emailRegex.test(this.correo.trim())
    );
  }
  onSubmit(form: NgForm) {
    this.mensajeError = '';
    if (!form.valid) {
      this.mensajeError = 'Debe completar correo y contraseña';
      return;
    }

    this.isLoading = true;
    this.service.login(this.correo, this.password).subscribe({
      next: (res: any) => {
        this.isLoading = false;

        // Verificar si es admin
        const esAdmin = res.roles && res.roles.includes('Administrador');

        if (res.requiere_cambio_password && !esAdmin) {
          // Modificación: Para primer acceso de no-admin, ir a 'olvide' con correo pre-llenado
          this.vistaActual = 'olvide';
          this.correoReset = this.correo;
          this.mensajeExito =
            'Como es su primer acceso, debe cambiar su contraseña. Ingrese su correo para recibir una temporal.';
          setTimeout(() => {
            this.mensajeExito = '';
          }, 5000);
        } else if (res.requiere_2fa) {
          this.usuarioId = res.usuario_id;
          this.tempRoles = res.roles || [];
          this.tempPermisos = res.permisos || [];
          this.tempNombreUsuario = res.nombre_usuario || '';
          this.tempApellido = res.apellido || '';
          this.tempImagenUrl = res.imagen_url || null;
          this.tempMensajeAdicional = res.mensaje_adicional || '';
          this.tempTipoMensaje = res.tipo_mensaje || 'exito';
          this.tempDiasTranscurridos = res.dias_transcurridos || 0;
          this.tempRequiereCambioPassword =
            res.requiere_cambio_password || false;
          this.tempMensajeUrgente = res.mensaje_urgente || false;
          const mensajePrincipal = res.mensaje || '¡Inicio de sesión exitoso!';
          let mensajeCompleto = mensajePrincipal;
          if (this.tempMensajeAdicional) {
            mensajeCompleto += ` - ${this.tempMensajeAdicional}`;
          }

          if (this.tempTipoMensaje === 'exito') {
            this.mensajeExito = mensajeCompleto;
            setTimeout(() => {
              this.mensajeExito = '';
            }, 5000);
          } else if (
            this.tempTipoMensaje === 'advertencia' ||
            this.tempTipoMensaje === 'advertencia_urgente'
          ) {
            this.mensajeAdvertencia = mensajeCompleto;
            if (this.tempMensajeUrgente || this.tempRequiereCambioPassword) {
              console.log('Mensaje urgente: Esperando clic del usuario...');
            } else {
              setTimeout(() => {
                this.mensajeAdvertencia = '';
              }, 7000);
            }
          }
          this.vistaActual = 'seleccion_2fa';
          this.codigoEnviado = false;
          this.qrBase64 = null;
          this.metodoSeleccionado = null;
        } else {
          this.guardarSesionYRedirigir(res);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.mensajeError =
          err.error?.error || 'Correo o contraseña incorrectos.';
      },
    });
  }
  seleccionarMetodo(metodo: 'correo' | 'totp'): void {
    this.metodoSeleccionado = metodo;
    this.vistaActual = '2fa';
    this.mensajeError = '';
    this.codigo2FA = '';
    this.codigoInputs = ['', '', '', '', '', ''];
    this.codigoEnviado = false;
    this.qrBase64 = null;
    this.loading = true;

    if (metodo === 'correo') {
      this.usarCorreo();
    } else if (metodo === 'totp') {
      this.usarAuthenticator();
    }
  }

  usarCorreo(): void {
    if (!this.usuarioId) {
      this.mensajeError = 'No hay usuario para enviar código';
      this.loading = false;
      return;
    }
    this.service.enviarCodigoCorreo(this.usuarioId).subscribe({
      next: () => {
        this.mensajeExito = 'Código enviado a su correo. Ingréselo abajo.';
        this.codigoEnviado = true;
        this.loading = false;
      },
      error: (err: any) => {
        this.mensajeError = err.error?.error || 'No se pudo enviar el código';
        this.loading = false;
      },
    });
  }

  usarAuthenticator(): void {
    if (!this.usuarioId) {
      this.mensajeError = 'No hay usuario para generar QR';
      this.loading = false;
      return;
    }
    this.service.generarQR(this.usuarioId).subscribe({
      next: (res: any) => {
        if (res.qr_base64) {
          this.qrBase64 = 'data:image/png;base64,' + res.qr_base64;
        } else {
          this.mensajeError =
            'No se pudo generar el código QR. Intente nuevamente.';
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.mensajeError =
          err.error?.error || 'No se pudo generar el código QR';
        this.loading = false;
      },
    });
  }

  verificarCodigo(): void {
    this.mensajeError = '';
    if (!this.usuarioId) {
      this.mensajeError = 'Usuario no definido';
      return;
    }
    if (this.codigo2FA.length !== 6) {
      this.mensajeError = 'Ingrese los 6 dígitos del código de verificación';
      return;
    }
    if (!this.metodoSeleccionado) {
      this.mensajeError = 'Método de verificación no seleccionado';
      return;
    }

    this.loading = true;
    this.service
      .verificar2FA(this.usuarioId, this.codigo2FA, this.metodoSeleccionado)
      .subscribe({
        next: (res: any) => {
          this.loading = false;

          const usuarioData = {
            id: res.usuario_id || this.usuarioId!,
            nombre: this.tempNombreUsuario,
            apellido: this.tempApellido,
            imagen_url: this.tempImagenUrl,
            roles: res.roles || this.tempRoles,
            permisos: this.tempPermisos,
            dias_transcurridos: this.tempDiasTranscurridos,
          };
          localStorage.setItem(
            'access_token',
            JSON.stringify(res.access_token)
          );
          localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioData));

          this.mensajeExito = 'Autenticación 2FA exitosa';

          // Modificación: Solo redirigir a cambiar contraseña si no es admin y requiere cambio
          const esAdmin =
            usuarioData.roles && usuarioData.roles.includes('Administrador');
          if (
            !esAdmin &&
            this.tempRequiereCambioPassword &&
            this.tempMensajeUrgente
          ) {
            setTimeout(() => {
              this.router.navigate(['/cambiar-password']);
            }, 2000);
          } else if (!esAdmin && this.tempRequiereCambioPassword) {
            setTimeout(() => {
              this.router.navigate(['/cambiar-password']);
            }, 5000);
          } else {
            setTimeout(() => {
              this.router.navigate(['/panel-control']);
            }, 2000);
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.mensajeError =
            err.error?.error || 'Código incorrecto o caducado';
        },
      });
  }

  private guardarSesionYRedirigir(res: any): void {
    localStorage.setItem('access_token', JSON.stringify(res.access_token));
    const usuario = {
      id: res.usuario_id,
      nombre: res.nombre_usuario,
      apellido: res.apellido,
      imagen_url: res.imagen_url,
      roles: res.roles,
      permisos: res.permisos,
      dias_transcurridos: res.dias_transcurridos,
    };
    localStorage.setItem('usuarioLogueado', JSON.stringify(usuario));
    // Modificación: Solo redirigir a cambiar contraseña si no es admin y requiere cambio
    const esAdmin = usuario.roles && usuario.roles.includes('Administrador');
    if (!esAdmin && res.requiere_cambio_password && res.mensaje_urgente) {
      setTimeout(() => {
        this.router.navigate(['/cambiar-password']);
      }, 2000);
    } else if (!esAdmin && res.requiere_cambio_password) {
      setTimeout(() => {
        this.router.navigate(['/cambiar-password']);
      }, 5000);
    } else {
      setTimeout(() => {
        this.router.navigate(['/panel-control']);
      }, 5000);
    }
  }

  enviarCorreoReset() {
    this.mensajeError = '';
    if (!this.correoReset.trim()) {
      this.mensajeError =
        'Ingrese su correo para enviar la contraseña temporal';
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.correoReset.trim())) {
      this.mensajeError = 'Ingrese un correo válido';
      return;
    }
    this.isLoading = true;
    this.service.resetPassword(this.correoReset).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.usuarioId = res.usuario_id;
        this.tempToken = res.temp_token;
        this.mensajeExito = `Contraseña temporal enviada a ${this.correoReset}. Revise su correo (incluyendo spam). Ahora ingrese su nueva contraseña.`;
        this.vistaActual = 'cambiar_password_temp';
        this.correoReset = '';
      },
      error: (err: any) => {
        this.isLoading = false;
        this.mensajeError =
          err.error?.error ||
          'No se pudo enviar el correo. Verifique el correo ingresado.';
      },
    });
  }

  verificarTempPassword(): void {
    if (!this.usuarioId || !this.tempToken || !this.tempPass.trim()) {
      this.mensajeError = 'Ingrese la contraseña temporal recibida';
      return;
    }
    this.loading = true;
    this.service
      .verificarTempPassword(this.usuarioId, this.tempToken, this.tempPass)
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.valid) {
            this.tempVerificado = true;
            this.mensajeExito =
              res.mensaje || 'Contraseña temporal verificada correctamente.';
            this.tempPass = '';
            this.mensajeError = '';
          } else {
            this.mensajeError =
              res.error || 'Contraseña temporal incorrecta. Revise el correo.';
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.mensajeError =
            err.error?.error ||
            'Error en verificación. Intente reenviar el correo.';
        },
      });
  }

  cambiarPasswordTemp(): void {
    if (
      !this.usuarioId ||
      !this.tempToken ||
      !this.nuevaPassword ||
      !this.confirmarPassword
    ) {
      this.mensajeError = 'Complete nueva contraseña y confirmación';
      return;
    }
    if (this.nuevaPassword !== this.confirmarPassword) {
      this.mensajeError = 'Las contraseñas no coinciden';
      return;
    }
    if (this.nuevaPassword.length < 8) {
      this.mensajeError = 'Nueva contraseña debe tener al menos 8 caracteres';
      return;
    }
    this.loading = true;

    this.service
      .cambiarPasswordTemp(
        this.usuarioId,
        this.tempToken,
        this.nuevaPassword,
        this.confirmarPassword
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.mensajeExito =
            res.mensaje ||
            'Contraseña actualizada exitosamente. Ahora inicie sesión con su nueva contraseña.';
          this.nuevaPassword = '';
          this.confirmarPassword = '';
          this.tempVerificado = false;
          setTimeout(() => {
            this.volverLogin();
          }, 3000);
        },
        error: (err: any) => {
          this.loading = false;
          this.mensajeError =
            err.error?.error ||
            'Error al cambiar contraseña. Intente de nuevo.';
        },
      });
  }

  irAOlvide(): void {
    this.vistaActual = 'olvide';
    this.correoReset = this.correo;
    this.mensajeExito = '';
    this.mensajeError = '';
  }

  volverLogin() {
    this.vistaActual = 'login';
    this.mensajeError = '';
    this.mensajeExito = '';
    this.mensajeAdvertencia = '';
    this.codigo2FA = '';
    this.codigoInputs = ['', '', '', '', '', '']; // Reset de los inputs separados
    this.codigoEnviado = false;
    this.qrBase64 = null;
    this.metodoSeleccionado = null;
    this.loading = false;
    this.tempVerificado = false;
    this.tempPass = '';
    this.nuevaPassword = '';
    this.confirmarPassword = '';
    this.tempToken = '';
    this.usuarioId = null;
    this.correoReset = '';
    this.tempRoles = [];
    this.tempPermisos = [];
    this.tempNombreUsuario = '';
    this.tempApellido = '';
    this.tempImagenUrl = null;
    this.tempMensajeAdicional = '';
    this.tempTipoMensaje = '';
    this.tempDiasTranscurridos = 0;
    this.tempRequiereCambioPassword = false;
    this.tempMensajeUrgente = false;
    this.correoReset = '';
  }
  // Manejo de modales
  manejarOk() {
    this.mensajeExito = '';
  }

  manejarAdvertencia() {
    this.mensajeAdvertencia = '';
    if (this.tempMensajeUrgente && this.tempRequiereCambioPassword) {
      this.router.navigate(['/cambiar-password']);
    }
  }

  manejarError() {
    this.mensajeError = '';
  }

  navigateToHome(): void {
    this.router.navigate(['/index']);
  }
}
