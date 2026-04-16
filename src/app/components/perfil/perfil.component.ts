import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Usuario } from '../../models/models';
import { ServiciosService } from '../../services/servicios.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css'],
})
export class PerfilComponent implements OnInit {
  usuarios: Usuario[] = [];
  usuario_id: number = 0;
  usuarioSeleccionado: Usuario | null = null;
  form: FormGroup;

  imagePreviewUrl: string | null = null;
  selectedImage: File | null = null;

  isPasswordVisible = false;
  rolUsuario: string = '';

  constructor(
    private perfilService: ServiciosService,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      fecha_nacimiento: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', this.passwordValidator],
      ci: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      estado: [true],
      imagen_url: [null],
    });
  }

  ngOnInit(): void {
    this.getUsuarios();
    this.recuperarUsuario();
  }
  getUsuarios() {
    this.perfilService.getUsuarios().subscribe((data) => {
      this.usuarios = data;
    });
  }

  private getUsuarioLocalStorage() {
    if (typeof window !== 'undefined') {
      try {
        const usuario = localStorage.getItem('usuarioLogueado');
        return usuario ? JSON.parse(usuario) : null;
      } catch (error) {
        console.error('Error al recuperar usuario de localStorage', error);
        return null;
      }
    }
    return null;
  }

  recuperarUsuario() {
    const usuario = this.getUsuarioLocalStorage();
    if (usuario) {
      this.usuario_id = usuario.usuario_id ?? usuario.id ?? 0;
      this.rolUsuario = usuario.rol ?? usuario.roles ?? '';

      this.perfilService.getUsuarioID(this.usuario_id).subscribe(
        (usuarioExistente: Usuario) => {
          console.log('Usuario existente:', usuarioExistente);
          if (usuarioExistente) {
            this.usuarioSeleccionado = usuarioExistente;
            this.cargarDatosEnFormulario(usuarioExistente);
            this.controlarPermisosDeEdicion();
          } else {
            console.error('Usuario no encontrado');
          }
        },
        (error) => {
          console.error('Error al obtener el usuario:', error);
        },
      );
    } else {
      console.warn('No se encontró el usuario en localStorage');
    }
  }
  private controlarPermisosDeEdicion() {
    if (this.rolUsuario !== 'Administrador') {
      Object.keys(this.form.controls).forEach((field) => {
        if (field !== 'password') {
          this.form.get(field)?.disable();
        }
      });
    }
  }

  private cargarDatosEnFormulario(usuario: Usuario) {
    this.form.patchValue({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      fecha_nacimiento: usuario.fecha_nacimiento,
      telefono: usuario.telefono,
      correo: usuario.correo,
      ci: usuario.ci,
      estado: usuario.estado,
    });
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedImage = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedImage);
    } else {
      this.selectedImage = null;
      this.imagePreviewUrl = null;
    }
  }

  onSubmit() {
    if (this.form.valid) {
      const usuarioActualizado: FormData = new FormData();
      usuarioActualizado.append('nombre', this.form.get('nombre')?.value);
      usuarioActualizado.append('apellido', this.form.get('apellido')?.value);
      usuarioActualizado.append(
        'fecha_nacimiento',
        this.form.get('fecha_nacimiento')?.value,
      );
      usuarioActualizado.append('telefono', this.form.get('telefono')?.value);
      usuarioActualizado.append('correo', this.form.get('correo')?.value);
      const passwordValue = this.form.get('password')?.value;
      if (passwordValue) {
        usuarioActualizado.append('password', passwordValue);
      }
      usuarioActualizado.append('ci', this.form.get('ci')?.value);
      usuarioActualizado.append(
        'estado',
        this.form.get('estado')?.value ? 'true' : 'false',
      );

      if (this.selectedImage) {
        usuarioActualizado.append(
          'imagen_url',
          this.selectedImage,
          this.selectedImage.name,
        );
      }

      this.perfilService
        .editarUsuario(this.usuario_id, usuarioActualizado)
        .subscribe(
          (response) => {
            alert('Usuario actualizado exitosamente');
          },
          (error) => {
            console.error('Error al actualizar el usuario:', error);
            alert(
              'Hubo un error al actualizar el usuario. Inténtalo de nuevo.',
            );
          },
        );
    } else {
      const invalidFields = Object.keys(this.form.controls).filter(
        (field) => this.form.get(field)?.invalid,
      );
      if (invalidFields.length > 0) {
        alert('Por favor, completa todos los campos obligatorios.');
      }
    }
  }

  togglePasswordVisibility() {
    this.isPasswordVisible = !this.isPasswordVisible;
  }
  passwordValidator(control: AbstractControl) {
    const value = control.value;

    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const isValidLength = value.length >= 6;

    const valid =
      hasUpperCase &&
      hasLowerCase &&
      hasNumber &&
      hasSpecialChar &&
      isValidLength;

    return valid ? null : { invalidPassword: true };
  }
}
