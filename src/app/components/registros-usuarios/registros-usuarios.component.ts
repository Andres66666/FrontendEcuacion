import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServiciosService } from '../../services/servicios.service';
import { Router } from '@angular/router';
import { Usuario } from '../../models/models';
import { CommonModule } from '@angular/common';
import { OkComponent } from '../mensajes/ok/ok.component';
import { ErrorComponent } from '../mensajes/error/error.component';
import { CustomValidatorsService } from '../../shared/custom-validators.service';

@Component({
  selector: 'app-registros-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OkComponent, ErrorComponent],
  templateUrl: './registros-usuarios.component.html',
  styleUrl: './registros-usuarios.component.css'
})
export class RegistrosUsuariosComponent implements OnInit {
  form!: FormGroup;
  imagenPreview: string | ArrayBuffer | null = null;
  errorMensaje: string | null = null;
  mensajeExito: string = '';
  mensajeError: string = '';
  showPassword: boolean = false;
  imagenArchivo?: File;

  constructor(
    private fb: FormBuilder,
    private usuarioService: ServiciosService,
    private router: Router,
    private customValidators: CustomValidatorsService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), this.customValidators.soloTexto()]],
      apellido: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), this.customValidators.soloTexto()]],
      correo: ['', [Validators.required, Validators.email], [this.customValidators.validateEmail()]],
      telefono: ['', [Validators.required], [this.customValidators.validatePhone()]],
      ci: ['', [Validators.required], [this.customValidators.validateCI()]],
      fecha_nacimiento: ['', [Validators.required, this.customValidators.validateDateOfBirth()]],
      password: ['', [Validators.required, this.customValidators.validatePassword()]],
      estado: [true],
      imagen_url: [''],
    });
  }

  onFileChange(event: any): void {
    const inputElement = event.target as HTMLInputElement;

    if (inputElement.files && inputElement.files.length > 0) {
      const file = inputElement.files[0];
      const validExtensions = ['image/png', 'image/jpeg'];
      if (!validExtensions.includes(file.type)) {
        this.errorMensaje = 'Formato de archivo incorrecto. Solo PNG y JPG.';
        this.imagenPreview = null;
        this.imagenArchivo = undefined;
        return;
      }
      this.imagenArchivo = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.imagenPreview = reader.result;
      };
      reader.readAsDataURL(file);
    } else {
      this.errorMensaje = 'Por favor, selecciona un archivo.';
      this.imagenPreview = null;
      this.imagenArchivo = undefined;
    }
  }

  onSubmit(): void {
    if (this.form.valid) {
      const usuarioCrear = {
        nombre: this.form.get('nombre')?.value,
        apellido: this.form.get('apellido')?.value,
        fecha_nacimiento: this.form.get('fecha_nacimiento')?.value,
        telefono: this.form.get('telefono')?.value,
        correo: this.form.get('correo')?.value,
        password: this.form.get('password')?.value,
        ci: this.form.get('ci')?.value,
        estado: this.form.get('estado')?.value,
      };
      

      this.usuarioService.createCliente(usuarioCrear, this.imagenArchivo).subscribe({
        next: () => {
          this.mensajeExito = 'Cliente registrado con éxito.';
          this.limpiarFormulario();
          this.router.navigate(['/index']);
        },
        error: (error) => {
          this.mensajeError = 'Error al registrar cliente.';
          console.error(error);
        },
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  limpiarFormulario(): void {
    this.form.reset({ estado: true });
    this.imagenPreview = null;
    this.imagenArchivo = undefined;
    this.errorMensaje = null;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
  navigateToHome(): void {
    this.router.navigate(['/index']);
  }

  // Métodos para corregir errores del template
  volver(): void {
    this.router.navigate(['/index']); // Cambiar a la ruta correcta
  }

  manejarOk(): void {
    this.mensajeExito = '';
  }

  manejarError(): void {
    this.mensajeError = '';
  }
}