import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OkComponent } from '../../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ServiciosService } from '../../../../services/servicios.service';

@Component({
  selector: 'app-editar-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OkComponent, ErrorComponent],
  templateUrl: './editar-usuario.component.html',
  styleUrl: './editar-usuario.component.css'
})
export class EditarUsuarioComponent implements OnInit {
  form!: FormGroup;
  usuarioOriginal: any;
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
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      id: [null],
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      fecha_nacimiento: [''],
      telefono: [''],
      correo: ['', [Validators.required, Validators.email]],
      password: [''],
      ci: [''],
      imagen_url: [''],
      estado: [true],
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.usuarioService.getUsuarioID(id).subscribe((data) => {
      this.usuarioOriginal = data;
      this.form.patchValue(data);
      this.imagenPreview = data.imagen_url;
    });
  }

  actualizarUsuario(): void {
    const formData = new FormData();

    // Recorremos los valores del formulario
    Object.entries(this.form.value).forEach(([key, value]) => {
      // Evitar null, undefined y objetos
      if (value !== null && value !== undefined && typeof value !== 'object') {
        formData.append(key, String(value));
      }
    });

    // Adjuntamos el archivo si existe
    const inputElement = document.getElementById(
      'imagenInput',
    ) as HTMLInputElement;

    if (inputElement?.files?.length) {
      const file = inputElement.files[0];
      console.log('Archivo de imagen:', file); // Verifica que el archivo se esté adjuntando
      formData.append('imagen_url', file);
    }

    // Obtenemos el ID desde el formulario
    const id = this.form.get('id')?.value;
    if (!id) {
      this.mensajeError = 'ID de usuario no disponible';
      return;
    }

    // Llamamos al servicio con id y formData
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
      this.form.patchValue(this.usuarioOriginal);
      this.imagenPreview = this.usuarioOriginal.imagen_url;
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
      reader.onload = () => {
        this.imagenPreview = reader.result;
      };
      reader.readAsDataURL(file);
    } else {
      this.errorMensaje = 'Por favor, selecciona una imagen válida.';
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
