import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { OkComponent } from '../../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { Router } from '@angular/router';
import { ServiciosService } from '../../../../services/servicios.service';
import { Usuario } from '../../../../models/models';
import { CustomValidatorsService } from '../../../../../validators/custom-validators.service';

@Component({
  selector: 'app-crear-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OkComponent, ErrorComponent],
  templateUrl: './crear-usuario.component.html',
  styleUrl: './crear-usuario.component.css',
})
export class CrearUsuarioComponent implements OnInit {
  form!: FormGroup;

  errorMensaje: string | null = null; // Mensaje de error
  imagenPreview: string | ArrayBuffer | null = null; // Variable to hold the image preview
  showPassword: boolean = false;

  mensajeExito: string = '';
  mensajeError: string = '';

  roles: any[] = [];
  constructor(
    private fb: FormBuilder,
    private usuarioService: ServiciosService,
    private router: Router,
    private customValidators: CustomValidatorsService
  ) {}

  ngOnInit(): void {
    this.loadRoles();
    this.form = this.fb.group({
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
          this.customValidators.soloTexto(),
          this.customValidators.limpiarEspaciosValidator(),
        ],
      ],
      apellido: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
          this.customValidators.soloTexto(),
          this.customValidators.limpiarEspaciosValidator(),
        ],
      ],
      correo: [
        '',
        [Validators.required, this.customValidators.correoValido()],
        [this.customValidators.correoUnico()],
      ],
      telefono: [
        '',
        [
          Validators.required,
          this.customValidators.telefonoValido(),
          this.customValidators.soloNumeros(),
        ],
        [this.customValidators.telefonoUnico()],
      ],
      ci: [
        '',
        [Validators.required, this.customValidators.ciValido()],
        [this.customValidators.ciUnico()],
      ],
      fecha_nacimiento: [
        '',
        [Validators.required, this.customValidators.mayorDeEdad()],
      ],
      password: [
        '',
        [Validators.required, this.customValidators.passwordSegura()],
      ],
      imagen_url: [''], // opcional
      estado: [true],
      rol: [''], // no requerido
    });
  }

  loadRoles(): void {
    this.usuarioService.getRoles().subscribe((data) => {
      this.roles = data.filter((r) => r.estado); // Solo roles activos
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      const formData = new FormData();
      // Agregamos cada campo manualmente
      formData.append('nombre', this.form.get('nombre')?.value);
      formData.append('apellido', this.form.get('apellido')?.value);
      formData.append('correo', this.form.get('correo')?.value);
      formData.append('telefono', this.form.get('telefono')?.value);
      formData.append('ci', this.form.get('ci')?.value);
      formData.append(
        'fecha_nacimiento',
        this.form.get('fecha_nacimiento')?.value
      );
      formData.append('password', this.form.get('password')?.value);
      formData.append('estado', this.form.get('estado')?.value);
      formData.append('rol', this.form.get('rol')?.value);

      // Adjuntamos la imagen si existe
      const inputElement = document.getElementById(
        'imagenInput'
      ) as HTMLInputElement;
      if (inputElement && inputElement.files && inputElement.files.length > 0) {
        const file = inputElement.files[0];
        formData.append('imagen_url', file); // este nombre debe coincidir con el nombre en el backend
      }

      console.log('FormData a enviar:', formData);

      this.usuarioService
        .createUsuario(formData as unknown as Usuario)
        .subscribe({
          next: () => {
            this.mensajeExito = 'Usuario registrado con éxito';
          },
          error: (error) => {
            this.mensajeError = 'Ocurrió un error al registrar el Usuario';
            console.error('Error al registrar Usuario:', error);
          },
        });
    } else {
      this.form.markAllAsTouched();
    }
  }

  volver(): void {
    this.router.navigate(['panel-control/listar-usuario']);
  }
  // Agregar este método en la clase CrearUsuarioComponent
  quitarImagen(): void {
    this.imagenPreview = null;
    this.errorMensaje = null;
    const inputElement = document.getElementById(
      'imagenInput'
    ) as HTMLInputElement;
    if (inputElement) {
      inputElement.value = '';
    }
    this.form.patchValue({
      imagen_url: null,
    });
  }

  limpiarFormulario(): void {
    this.form.reset({
      estado: true,
      imagen_url: null,
    });
    this.quitarImagen(); // Usar la nueva función para limpiar la imagen
  }

  onFileChange(event: any): void {
    const inputElement = event.target as HTMLInputElement;

    // Check if files are not null and has at least one file
    if (inputElement.files && inputElement.files.length > 0) {
      const file = inputElement.files[0];

      // Validate the file type
      const validExtensions = ['image/png', 'image/jpeg'];
      if (!validExtensions.includes(file.type)) {
        this.errorMensaje =
          'Formato de archivo incorrecto. Solo se permiten PNG y JPG.'; // Error message
        this.imagenPreview = null; // Clear the preview
        return;
      }

      // If valid, update the form and show the preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagenPreview = reader.result; // Set the image preview
      };
      reader.readAsDataURL(file); // Read the file as a data URL
    } else {
      this.errorMensaje = 'Por favor, selecciona un archivo.'; // Error message if no file
      this.imagenPreview = null; // Clear the preview
    }
  }
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
  manejarOk() {
    this.mensajeExito = '';
    // Moved the navigation here, after the modal is closed
    this.router.navigate(['panel-control/listar-usuario']);
  }

  manejarError() {
    this.mensajeError = '';
  }
}
