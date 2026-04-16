import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CustomValidatorsService } from '../../../../../validators/custom-validators.service';
import { Usuario } from '../../../../models/models';
import { ServiciosService } from '../../../../services/servicios.service';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { OkComponent } from '../../../mensajes/ok/ok.component';

@Component({
  selector: 'app-crear-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OkComponent, ErrorComponent],
  templateUrl: './crear-usuario.component.html',
  styleUrl: './crear-usuario.component.css',
})
export class CrearUsuarioComponent implements OnInit {
  form!: FormGroup;

  errorMensaje: string | null = null;
  imagenPreview: string | ArrayBuffer | null = null;
  showPassword: boolean = false;

  mensajeExito: string = '';
  mensajeError: string = '';

  roles: any[] = [];
  constructor(
    private fb: FormBuilder,
    private usuarioService: ServiciosService,
    private router: Router,
    private customValidators: CustomValidatorsService,
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
      imagen_url: [''],
      estado: [true],
      rol: [''],
    });
  }

  loadRoles(): void {
    this.usuarioService.getRoles().subscribe((data) => {
      this.roles = data.filter((r) => r.estado);
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      const formData = new FormData();
      formData.append('nombre', this.form.get('nombre')?.value);
      formData.append('apellido', this.form.get('apellido')?.value);
      formData.append('correo', this.form.get('correo')?.value);
      formData.append('telefono', this.form.get('telefono')?.value);
      formData.append('ci', this.form.get('ci')?.value);
      formData.append(
        'fecha_nacimiento',
        this.form.get('fecha_nacimiento')?.value,
      );
      formData.append('password', this.form.get('password')?.value);
      formData.append('estado', this.form.get('estado')?.value);
      formData.append('rol', this.form.get('rol')?.value);

      const inputElement = document.getElementById(
        'imagenInput',
      ) as HTMLInputElement;
      if (inputElement && inputElement.files && inputElement.files.length > 0) {
        const file = inputElement.files[0];
        formData.append('imagen_url', file);
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
  quitarImagen(): void {
    this.imagenPreview = null;
    this.errorMensaje = null;
    const inputElement = document.getElementById(
      'imagenInput',
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
    this.quitarImagen();
  }

  onFileChange(event: any): void {
    const inputElement = event.target as HTMLInputElement;

    if (inputElement.files && inputElement.files.length > 0) {
      const file = inputElement.files[0];

      const validExtensions = ['image/png', 'image/jpeg'];
      if (!validExtensions.includes(file.type)) {
        this.errorMensaje =
          'Formato de archivo incorrecto. Solo se permiten PNG y JPG.';
        this.imagenPreview = null;
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.imagenPreview = reader.result;
      };
      reader.readAsDataURL(file);
    } else {
      this.errorMensaje = 'Por favor, selecciona un archivo.';
      this.imagenPreview = null;
    }
  }
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
  manejarOk() {
    this.mensajeExito = '';
    this.router.navigate(['panel-control/listar-usuario']);
  }

  manejarError() {
    this.mensajeError = '';
  }
}
