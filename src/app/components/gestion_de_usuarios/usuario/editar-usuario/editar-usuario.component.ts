import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ServiciosService } from '../../../../services/servicios.service';
import { OkComponent } from '../../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { of } from 'rxjs';
import { CustomValidatorsService } from '../../../../../validators/custom-validators.service';

@Component({
  selector: 'app-editar-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OkComponent, ErrorComponent],
  templateUrl: './editar-usuario.component.html',
  styleUrl: './editar-usuario.component.css',
})
export class EditarUsuarioComponent implements OnInit {
  form!: FormGroup;
  usuarioOriginal: any;
  roles: any[] = [];
  rolAsignado: any = null;
  imagenPreview: string | ArrayBuffer | null = null;
  errorMensaje: string | null = null;
  mensajeExito: string = '';
  mensajeError: string = '';
  showPassword: boolean = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: ServiciosService,
    private customValidators: CustomValidatorsService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      id: [null],
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
          this.customValidators.soloTextoUnEspacio(),
        ],
      ],
      apellido: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
          this.customValidators.soloTextoUnEspacio(),
        ],
      ],
      correo: [
        '',
        [Validators.required, this.customValidators.correoValido()],
        [
          (control) => {
            if (!control.value || !this.usuarioOriginal) return of(null);
            if (control.value === this.usuarioOriginal.correo) return of(null);
            return this.customValidators.correoUnico()(control);
          },
        ],
      ],
      telefono: [
        '',
        [
          Validators.required,
          this.customValidators.telefonoValido(),
          this.customValidators.soloNumeros(),
        ],
        [
          (control) => {
            if (!control.value || !this.usuarioOriginal) return of(null);
            if (control.value === this.usuarioOriginal.telefono)
              return of(null);
            return this.customValidators.telefonoUnico()(control);
          },
        ],
      ],
      ci: [
        '',
        [Validators.required, this.customValidators.soloNumeros()],
        [
          (control) => {
            if (!control.value || !this.usuarioOriginal) return of(null);
            if (control.value === this.usuarioOriginal.ci) return of(null);
            return this.customValidators.ciUnico()(control);
          },
        ],
      ],
      fecha_nacimiento: [
        '',
        [Validators.required, this.customValidators.mayorDeEdad()],
      ],
      password: [
        '',
        [
          this.customValidators.passwordSeguraeditar(), // opcional si se ingresa
        ],
      ],
      imagen_url: [''],
      rol: [''],
      estado: [true],
    });

    // Cargar datos iniciales
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarUsuarioYRoles(id);
  }

  private cargarUsuarioYRoles(id: number): void {
    this.usuarioService.getUsuarioID(id).subscribe({
      next: (usuarioData) => {
        this.usuarioOriginal = usuarioData;
        (usuarioData as any).password = '';
        this.form.patchValue(usuarioData);
        this.imagenPreview = usuarioData.imagen_url;

        this.usuarioService.getRoles().subscribe({
          next: (rolesData) => {
            this.roles = rolesData;
            this.usuarioService.getUsuarioRoles().subscribe({
              next: (usuarioRoles) => {
                const relacion = usuarioRoles.find(
                  (ur) => ur.usuario.id === usuarioData.id
                );
                if (relacion) {
                  this.rolAsignado = relacion.rol;
                  this.form.patchValue({ rol: this.rolAsignado.id });
                }
              },
            });
          },
        });

        // ✅ Marcar el formulario como "sin cambios" después de cargar datos
        setTimeout(() => this.form.markAsPristine(), 0);
      },
      error: (err) => {
        console.error('Error al obtener usuario:', err);
      },
    });
  }

  actualizarUsuario(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = new FormData();

    // ✅ Solo agrega los campos válidos
    Object.entries(this.form.value).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        // ⚠️ No enviar el password si está vacío
        if (key === 'password' && (!value || String(value).trim() === ''))
          return;

        formData.append(key, String(value));
      }
    });

    // Imagen
    const inputElement = document.getElementById(
      'imagenInput'
    ) as HTMLInputElement;
    if (inputElement?.files?.length) {
      formData.append('imagen_url', inputElement.files[0]);
    }

    const id = this.form.get('id')?.value;
    if (!id) {
      this.mensajeError = 'ID de usuario no disponible';
      return;
    }

    this.usuarioService.editarUsuario(id, formData).subscribe({
      next: () => {
        this.mensajeExito = 'Usuario actualizado con éxito';
      },
      error: (err: any) => {
        this.mensajeError = 'Error al actualizar el usuario';
        console.error('Error al actualizar usuario:', err);
      },
    });
  }

  volver(): void {
    this.router.navigate(['panel-control/listar-usuario']);
  }

  restablecerFormulario(): void {
    if (this.usuarioOriginal) {
      const copia = { ...this.usuarioOriginal };
      delete copia.password;
      this.form.patchValue(copia);
      this.imagenPreview = copia.imagen_url;
    }
  }

  onFileChange(event: any): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length > 0) {
      const file = inputElement.files[0];
      const validExtensions = ['image/png', 'image/jpeg'];

      if (!validExtensions.includes(file.type)) {
        this.errorMensaje =
          'Formato no válido. Solo se permiten imágenes PNG y JPG.';
        this.imagenPreview = null;
        return;
      }

      const reader = new FileReader();
      reader.onload = () => (this.imagenPreview = reader.result);
      reader.readAsDataURL(file);
    } else {
      this.errorMensaje = 'Por favor, selecciona una imagen válida.';
      this.imagenPreview = null;
    }
  }

  quitarImagen(): void {
    this.imagenPreview = null;
    this.errorMensaje = null;
    const inputElement = document.getElementById(
      'imagenInput'
    ) as HTMLInputElement;
    if (inputElement) inputElement.value = '';
    this.form.patchValue({ imagen_url: null });
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
