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
import { CommonModule } from '@angular/common';
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

  imagePreviewUrl: string | null = null; // Nueva propiedad para la vista previa de la imagen
  selectedImage: File | null = null; // Propiedad para almacenar la imagen seleccionada

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
      password: ['', this.passwordValidator], // Solo el validador personalizado, sin Validators.required
      ci: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      estado: [true], // Cambiado a 'estado' para coincidir con la interfaz
      imagen_url: [null], // Cambiado a 'imagen_url' para coincidir con la interfaz
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
        // Aseguramos que siempre sea string JSON
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
      // Aquí estandarizamos las claves (id / usuario_id)
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
      // Deshabilita todos los campos excepto 'password'
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
      estado: usuario.estado, // Cambiado a 'estado' para coincidir con la interfaz
      // No se carga la contraseña por razones de seguridad
    });
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedImage = input.files[0]; // Almacena la imagen seleccionada
      const reader = new FileReader();
      reader.onload = (e) => {
        // Establece la URL de la vista previa
        this.imagePreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedImage); // Lee la imagen como URL
    } else {
      this.selectedImage = null; // Resetea la imagen seleccionada si no hay archivo
      this.imagePreviewUrl = null; // Resetea la vista previa
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

      // Solo agregar la contraseña si se ha proporcionado
      const passwordValue = this.form.get('password')?.value;
      if (passwordValue) {
        usuarioActualizado.append('password', passwordValue);
      }

      usuarioActualizado.append('ci', this.form.get('ci')?.value);
      usuarioActualizado.append(
        'estado',
        this.form.get('estado')?.value ? 'true' : 'false',
      ); // Cambiado a 'estado'

      // Solo agregar la imagen si se ha seleccionado una nueva
      if (this.selectedImage) {
        usuarioActualizado.append(
          'imagen_url',
          this.selectedImage,
          this.selectedImage.name,
        ); // Cambiado a 'imagen_url'
      }

      // Llama al servicio para editar el usuario
      this.perfilService
        .editarUsuario(this.usuario_id, usuarioActualizado)
        .subscribe(
          (response) => {
            alert('Usuario actualizado exitosamente');
            // Aquí puedes redirigir o hacer otra acción
          },
          (error) => {
            console.error('Error al actualizar el usuario:', error);
            alert(
              'Hubo un error al actualizar el usuario. Inténtalo de nuevo.',
            );
          },
        );
    } else {
      // Solo muestra el mensaje de error si hay campos obligatorios que no se han completado
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
  // Validador de contraseña
  passwordValidator(control: AbstractControl) {
    const value = control.value;

    // Si el campo está vacío, no se aplica la validación
    if (!value) {
      return null; // No hay error
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
