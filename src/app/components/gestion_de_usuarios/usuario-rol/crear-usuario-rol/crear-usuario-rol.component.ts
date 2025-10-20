import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors,
} from '@angular/forms';
import { OkComponent } from '../../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { Rol, Usuario } from '../../../../models/models';
import { ServiciosService } from '../../../../services/servicios.service';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-crear-usuario-rol',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    OkComponent,
    ErrorComponent,
  ],
  templateUrl: './crear-usuario-rol.component.html',
  styleUrls: ['./crear-usuario-rol.component.css'],
})
export class CrearUsuarioRolComponent {
  form: FormGroup;
  usuarios: Usuario[] = [];
  roles: Rol[] = [];

  mensajeExito: string = '';
  mensajeError: string = '';

  constructor(
    private fb: FormBuilder,
    private service: ServiciosService,
    private router: Router
  ) {
    this.form = this.fb.group(
      {
        usuario: ['', Validators.required],
        rol: ['', Validators.required],
      },
      { asyncValidators: this.usuarioRolUnico() } // Validación asíncrona de duplicados
    );
  }

  ngOnInit(): void {
    this.loadUsuarios();
    this.loadRoles();
  }

  loadUsuarios() {
    this.service.getUsuarios().subscribe((data) => {
      this.service.getUsuarioRoles().subscribe((asignaciones) => {
        const usuariosConRol = asignaciones.map((a) => a.usuario.id);
        this.usuarios = data.filter(
          (u) => u.estado && !usuariosConRol.includes(u.id)
        ); // solo usuarios activos sin rol asignado
      });
    });
  }

  loadRoles() {
    this.service.getRoles().subscribe((data) => {
      this.roles = data.filter((r) => r.estado); // solo roles activos
    });
  }

  // Validador asíncrono para evitar duplicados y que un usuario tenga más de un rol
  usuarioRolUnico(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const usuario = control.get('usuario')?.value;
      const rol = control.get('rol')?.value;

      if (!usuario || !rol) return of(null);

      return this.service.getUsuarioRoles().pipe(
        map((asignaciones) => {
          // Verifica si el usuario ya tiene el mismo rol
          const mismoRol = asignaciones.some(
            (asig: any) =>
              asig.usuario.id === usuario.id && asig.rol.id === rol.id
          );

          if (mismoRol) {
            return { rolAsignado: true }; // ya tiene este rol
          }

          // Verifica si el usuario tiene cualquier rol asignado
          const tieneOtroRol = asignaciones.some(
            (asig: any) => asig.usuario.id === usuario.id
          );

          if (tieneOtroRol) {
            return { usuarioConRol: true }; // ya tiene otro rol
          }

          return null;
        })
      );
    };
  }

  registrar(): void {
    if (this.form.invalid) {
      if (this.form.errors?.['rolAsignado']) {
        this.mensajeError =
          'Este usuario ya tiene asignado el rol seleccionado.';
      } else if (this.form.errors?.['usuarioConRol']) {
        this.mensajeError =
          'Este usuario ya tiene un rol asignado. No puede asignarse otro.';
      } else {
        this.mensajeError =
          'Por favor, complete todos los campos correctamente.';
      }
      return;
    }

    this.service.createUsuarioRol(this.form.value).subscribe({
      next: () => {
        this.mensajeExito = 'Usuario-Rol registrado correctamente.';
        this.form.reset();
      },
      error: () => {
        this.mensajeError = 'Error al registrar el Usuario-Rol.';
      },
    });
  }

  volver(): void {
    this.router.navigate(['panel-control/listar-usuario-rol']);
  }

  limpiarFormulario(): void {
    this.form.reset();
    this.mensajeError = '';
    this.mensajeExito = '';
  }

  manejarOk() {
    this.mensajeExito = '';
    this.router.navigate(['panel-control/listar-usuario-rol']);
  }

  manejarError() {
    this.mensajeError = '';
  }
}
