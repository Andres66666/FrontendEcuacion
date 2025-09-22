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

  onSubmit(form: NgForm): void {
    if (!this.isFormValid() || form.invalid) {
      this.mensajeError = 'Por favor, complete todos los campos correctamente (email válido y contraseña de al menos 6 caracteres).';
      return;
    }
    this.mensajeError = '';
    this.mensajeExito = '';
    this.mensajeAdvertencia = '';
    this.iniciarSesion();
  }

  iniciarSesion(): void {
    this.isLoading = true;

    this.service.login(this.correo, this.password).subscribe({
      next: (response) => {
        localStorage.setItem('access_token', JSON.stringify(response.access_token));

        const usuario = {
          id: response.usuario_id,
          nombre: response.nombre_usuario,
          apellido: response.apellido,
          imagen_url: response.imagen_url,
          roles: response.roles,
          permisos: response.permisos,
          dias_transcurridos: response.dias_transcurridos
        };
        localStorage.setItem('usuarioLogueado', JSON.stringify(usuario));
        
        // Manejo de mensajes por tipo
        const mensajePrincipal = response.mensaje || '¡Inicio de sesión exitoso!';
        let mensajeCompleto = mensajePrincipal;
        if (response.mensaje_adicional) {
          mensajeCompleto += ` - ${response.mensaje_adicional}`;
        }

        if (response.tipo_mensaje === 'exito') {
          this.mensajeExito = mensajeCompleto;
          // ← CAMBIO: Timeout más largo (5s) para éxito simple
          setTimeout(() => {
            this.mensajeExito = '';  // Cierra modal
            this.router.navigate(['/panel-control']);
          }, 5000);
        } else if (response.tipo_mensaje === 'advertencia' || response.tipo_mensaje === 'advertencia_urgente') {
          this.mensajeAdvertencia = mensajeCompleto;
          // ← CAMBIO: No auto-cierra; espera clic del usuario
          if (response.mensaje_urgente || response.requiere_cambio_password) {
            // Para mensajes urgentes/primer login: Espera cierre manual, no timeout
            console.log('Mensaje urgente: Esperando clic del usuario...');
          } else {
            // Para warnings normales (días 88/89): Auto-cierra en 7s
            setTimeout(() => {
              this.mensajeAdvertencia = '';
              this.router.navigate(['/panel-control']);
            }, 7000);
          }
        }

        // ← CAMBIO: Redirección solo manual para casos urgentes
        if (response.requiere_cambio_password && response.mensaje_urgente) {
          // No redirige aquí; se maneja en manejarAdvertencia()
        } else if (response.requiere_cambio_password) {
          // Para cambio obligatorio sin urgencia: Redirige en 5s
          setTimeout(() => {
            this.router.navigate(['/cambiar-password']);
          }, 5000);
        } else if (response.tipo_mensaje !== 'advertencia' && response.tipo_mensaje !== 'advertencia_urgente') {
          // Redirección normal si no hay advertencia
          setTimeout(() => {
            this.router.navigate(['/panel-control']);
          }, 5000);
        }
      },
      error: (error) => {
        console.error('Error al iniciar sesión:', error);
        this.mensajeError = error.error?.error || 'Correo electrónico o contraseña incorrectos.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  // Manejo de modales
  manejarOk() {
    this.mensajeExito = '';
    this.router.navigate(['/panel-control']);
  }

  manejarAdvertencia() {
    this.mensajeAdvertencia = '';
    // ← CAMBIO: Si es urgente o requiere cambio, redirige a cambiar-password
    // (Asume que guardas el estado en localStorage o queryParams si necesitas)
    if (localStorage.getItem('requiere_cambio_password') === 'true') {  // O usa una prop en el componente
      localStorage.setItem('requiere_cambio_password', 'true');  // Persiste para la ruta
      this.router.navigate(['/cambiar-password']);
    } else {
      this.router.navigate(['/panel-control']);  // Redirige normal para otros warnings
    }
  }

  manejarError() {
    this.mensajeError = '';
  }

  navigateToHome(): void {
    this.router.navigate(['/index']);
  }
}
