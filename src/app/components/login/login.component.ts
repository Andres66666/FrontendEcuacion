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
    Advertencia  // ← CORREGIDO
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent {
  correo: string = '';
  password: string = '';
  showPassword: boolean = false;
  isLoading: boolean = false;
  mensajeExito: string = '';
  mensajeError: string = '';
  mensajeAdvertencia: string = '';  // Para warnings

  correoReset: string = '';
  usuarioId: number | null = null;
  codigo2FA: string = '';
  codigoEnviado = false;
  loading: boolean = false;
  qrBase64: string | null = null;
  metodoSeleccionado: 'correo' | 'totp' | null = null;  // ← NUEVO: Rastrear método elegido

  // ← NUEVO: Variables temporales para datos del login (usadas después de 2FA)
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

  // En LoginComponent (agrega al enum y variables)
  vistaActual: 'login' | 'olvide' | 'cambiar_password_temp' | 'seleccion_2fa' | '2fa' = 'login';  // ← AGREGADO: 'cambiar_password_temp'
  tempToken: string = '';  // ← NUEVO: Token del reset
  tempPass: string = '';   // ← NUEVO: Input para temp_pass
  nuevaPassword: string = '';  // ← NUEVO: Nueva password
  confirmarPassword: string = '';  // ← NUEVO: Confirmación
  tempVerificado: boolean = false;  // ← NUEVO: Si temp_pass verificada

  constructor(
    public router: Router,
    private service: ServiciosService,
  ) { }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Validación mejorada
  isFormValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.correo.trim() !== '' && 
           this.password.trim().length >= 6 && 
           emailRegex.test(this.correo.trim());
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

        if (res.requiere_2fa) {
          // ← NUEVO: Almacenar datos temporales del login
          this.usuarioId = res.usuario_id;
          this.tempRoles = res.roles || [];
          this.tempPermisos = res.permisos || [];
          this.tempNombreUsuario = res.nombre_usuario || '';
          this.tempApellido = res.apellido || '';
          this.tempImagenUrl = res.imagen_url || null;
          this.tempMensajeAdicional = res.mensaje_adicional || '';
          this.tempTipoMensaje = res.tipo_mensaje || 'exito';
          this.tempDiasTranscurridos = res.dias_transcurridos || 0;
          this.tempRequiereCambioPassword = res.requiere_cambio_password || false;
          this.tempMensajeUrgente = res.mensaje_urgente || false;

          // ← NUEVO: Manejar mensajes inmediatamente (se muestran en selección o 2FA)
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
          } else if (this.tempTipoMensaje === 'advertencia' || this.tempTipoMensaje === 'advertencia_urgente') {
            this.mensajeAdvertencia = mensajeCompleto;
            if (this.tempMensajeUrgente || this.tempRequiereCambioPassword) {
              // Espera cierre manual para urgentes
              console.log('Mensaje urgente: Esperando clic del usuario...');
            } else {
              // Auto-cierra en 7s para warnings normales
              setTimeout(() => {
                this.mensajeAdvertencia = '';
              }, 7000);
            }
          }

          // ← NUEVO: Cambiar a vista de selección de método 2FA
          this.vistaActual = 'seleccion_2fa';
          this.codigoEnviado = false;
          this.qrBase64 = null;
          this.metodoSeleccionado = null;
        } else {
          // Caso sin 2FA (raro, pero por si acaso)
          this.guardarSesionYRedirigir(res);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.mensajeError = err.error?.error || 'Correo o contraseña incorrectos.';
      }
    });
  }

  // ← NUEVO: Método para seleccionar método 2FA
  seleccionarMetodo(metodo: 'correo' | 'totp'): void {
    this.metodoSeleccionado = metodo;
    this.vistaActual = '2fa';
    this.mensajeError = '';
    this.codigo2FA = '';
    this.codigoEnviado = false;
    this.qrBase64 = null;
    this.loading = true;

    if (metodo === 'correo') {
      this.usarCorreo();
    } else if (metodo === 'totp') {
      this.usarAuthenticator();
    }
  }

  // ← CORREGIDO: Enviar código por correo (sin tempToken)
  usarCorreo(): void {
    if (!this.usuarioId) {
      this.mensajeError = 'No hay usuario para enviar código';
      this.loading = false;
      return;
    }
    this.service.enviarCodigoCorreo(this.usuarioId).subscribe({  // ← CORREGIDO: Solo 1 argumento
      next: () => {
        this.mensajeExito = 'Código enviado a su correo. Ingréselo abajo.';
        this.codigoEnviado = true;
        this.loading = false;
      },
      error: (err: any) => {
        this.mensajeError = err.error?.error || 'No se pudo enviar el código';
        this.loading = false;
      }
    });
  }

  // ← CORREGIDO: Usar Authenticator (llama a generarQR)
  usarAuthenticator(): void {
    if (!this.usuarioId) {
      this.mensajeError = 'No hay usuario para generar QR';
      this.loading = false;
      return;
    }
    this.service.generarQR(this.usuarioId).subscribe({
      next: (res: any) => {
        this.mensajeAdvertencia = 'Escanee este código QR con Google Authenticator.';
        if (res.qr_base64) {
          this.qrBase64 = 'data:image/png;base64,' + res.qr_base64;
        } else {
          this.mensajeError = 'No se pudo generar el código QR. Intente nuevamente.';
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.mensajeError = err.error?.error || 'No se pudo generar el código QR';
        this.loading = false;
      }
    });
  }

  // ← CORREGIDO: Verificar código 2FA (envía metodo)
  verificarCodigo(): void {
    this.mensajeError = '';
    if (!this.usuarioId) {
      this.mensajeError = 'Usuario no definido';
      return;
    }
    if (!this.codigo2FA.trim()) {
      this.mensajeError = 'Ingrese el código recibido o generado';
      return;
    }
    if (!this.metodoSeleccionado) {
      this.mensajeError = 'Método de verificación no seleccionado';
      return;
    }

    this.loading = true;
    this.service.verificar2FA(this.usuarioId, this.codigo2FA, this.metodoSeleccionado).subscribe({  // ← CORREGIDO: 3 argumentos
      next: (res: any) => {
        this.loading = false;
        // ← NUEVO: Usar datos temporales para completar la sesión
        const usuarioData = {
          id: res.usuario_id || this.usuarioId!,
          nombre: this.tempNombreUsuario,
          apellido: this.tempApellido,
          imagen_url: this.tempImagenUrl,
          roles: res.roles || this.tempRoles,
          permisos: this.tempPermisos,
          dias_transcurridos: this.tempDiasTranscurridos
        };
        localStorage.setItem('access_token', JSON.stringify(res.access_token));
        localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioData));

        this.mensajeExito = 'Autenticación 2FA exitosa';

        // ← NUEVO: Manejar redirección basada en datos temporales
        if (this.tempRequiereCambioPassword && this.tempMensajeUrgente) {
          // Caso urgente: Redirigir a cambio de password
          setTimeout(() => {
            this.router.navigate(['/cambiar-password']);
          }, 2000);
        } else if (this.tempRequiereCambioPassword) {
          // Cambio obligatorio sin urgencia
          setTimeout(() => {
            this.router.navigate(['/cambiar-password']);
          }, 5000);
        } else {
          // Redirección normal
          setTimeout(() => {
            this.router.navigate(['/panel-control']);
          }, 2000);
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.mensajeError = err.error?.error || 'Código incorrecto o caducado';
      }
    });
  }

  // ← NUEVO: Método helper para guardar sesión y redirigir (usado en casos sin 2FA)
  private guardarSesionYRedirigir(res: any): void {
    localStorage.setItem('access_token', JSON.stringify(res.access_token));
    const usuario = {
      id: res.usuario_id,
      nombre: res.nombre_usuario,
      apellido: res.apellido,
      imagen_url: res.imagen_url,
      roles: res.roles,
      permisos: res.permisos,
      dias_transcurridos: res.dias_transcurridos
    };
    localStorage.setItem('usuarioLogueado', JSON.stringify(usuario));

    // Manejo de redirección
    if (res.requiere_cambio_password && res.mensaje_urgente) {
      setTimeout(() => {
        this.router.navigate(['/cambiar-password']);
      }, 2000);
    } else if (res.requiere_cambio_password) {
      setTimeout(() => {
        this.router.navigate(['/cambiar-password']);
      }, 5000);
    } else {
      setTimeout(() => {
        this.router.navigate(['/panel-control']);
      }, 5000);
    }
  }

  // ← MODIFICADO: enviarCorreoReset (cambia vista y setea token)
  enviarCorreoReset() {
    this.mensajeError = '';
    if (!this.correoReset.trim()) {
      this.mensajeError = 'Ingrese su correo para enviar la contraseña temporal';
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
        this.usuarioId = res.usuario_id;  // Setea ID para cambio
        this.tempToken = res.temp_token;  // Setea token para validación en backend
        this.mensajeExito = `Contraseña temporal enviada a ${this.correoReset}. Revise su correo (incluyendo spam). Ahora ingrese su nueva contraseña.`;
        this.vistaActual = 'cambiar_password_temp';  // ← CAMBIADO: Directo a nueva/confirmar
        this.correoReset = '';  // Limpia input
      },
      error: (err: any) => {
        this.isLoading = false;
        this.mensajeError = err.error?.error || 'No se pudo enviar el correo. Verifique el correo ingresado.';
      }
    });
  }


  // ← NUEVO: Verificar temp_pass
  verificarTempPassword(): void {
      if (!this.usuarioId || !this.tempToken || !this.tempPass.trim()) {
        this.mensajeError = 'Ingrese la contraseña temporal recibida';
        return;
      }
      this.loading = true;
      this.service.verificarTempPassword(this.usuarioId, this.tempToken, this.tempPass).subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.valid) {
            this.tempVerificado = true;
            this.mensajeExito = res.mensaje || 'Contraseña temporal verificada correctamente.';
            this.tempPass = '';  // Limpia input
            this.mensajeError = '';  // Limpia errores previos
          } else {
            this.mensajeError = res.error || 'Contraseña temporal incorrecta. Revise el correo.';
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.mensajeError = err.error?.error || 'Error en verificación. Intente reenviar el correo.';
        }
      });
    }

  // ← MODIFICADO: Llama service con 4 params (incluye confirmarPassword)
  cambiarPasswordTemp(): void {
    if (!this.usuarioId || !this.tempToken || !this.nuevaPassword || !this.confirmarPassword) {
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
    // ← CAMBIADO: Pasa confirmarPassword al service
    this.service.cambiarPasswordTemp(this.usuarioId, this.tempToken, this.nuevaPassword, this.confirmarPassword).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.mensajeExito = res.mensaje || 'Contraseña actualizada exitosamente. Ahora inicie sesión con su nueva contraseña.';
        this.nuevaPassword = '';
        this.confirmarPassword = '';
        this.tempVerificado = false;  // Reset (si usas)
        setTimeout(() => {
          this.volverLogin();  // Vuelve a login
        }, 3000);
      },
      error: (err: any) => {
        this.loading = false;
        this.mensajeError = err.error?.error || 'Error al cambiar contraseña. Intente de nuevo.';
      }
    });
  }


  // ← MODIFICADO: irAOlvide (sin resetExitoso)
  irAOlvide(): void {
    this.vistaActual = 'olvide';
    this.correoReset = this.correo;  // Prellena opcional
    this.mensajeExito = '';
    this.mensajeError = '';
  }

  volverLogin() {
    this.vistaActual = 'login';
    this.mensajeError = '';
    this.mensajeExito = '';
    this.mensajeAdvertencia = '';
    this.codigo2FA = '';
    this.codigoEnviado = false;
    this.qrBase64 = null;
    this.metodoSeleccionado = null;
    this.loading = false;
    this.tempVerificado = false;  // ← QUITAR si no usas, pero mantén por compatibilidad
    this.tempPass = '';  // ← AGREGADO: Limpia (aunque no se usa)
    this.nuevaPassword = '';
    this.confirmarPassword = '';
    this.tempToken = '';
    this.usuarioId = null;
    this.correoReset = '';
    // ← NUEVO: Resetear temporales del login (para 2FA)
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
    this.correoReset = '';  // ← AGREGADO: Limpia correo de reset
  }

  // Manejo de modales
  manejarOk() {
    this.mensajeExito = '';
  }

  manejarAdvertencia() {
    this.mensajeAdvertencia = '';
    // ← NUEVO: Si es urgente, redirigir a cambio de password (para casos de 2FA)
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
