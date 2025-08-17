import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { OkComponent } from '../../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { Rol, Usuario } from '../../../../models/models';
import { ServiciosService } from '../../../../services/servicios.service';
import { Router } from '@angular/router';
import { CustomValidatorsService } from '../../../../shared/custom-validators.service';

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
  styleUrl: './crear-usuario-rol.component.css'
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
    private router: Router,
    private customValidators: CustomValidatorsService,
  ) {
    this.form = this.fb.group({
      usuario: ['', Validators.required],
      rol: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadUsuarios();
    this.loadRoles();
  }

  loadUsuarios() {
    this.service.getUsuarios().subscribe((data) => {
      this.usuarios = data.filter((u) => u.estado); // solo usuarios activos
    });
  }

  loadRoles() {
    this.service.getRoles().subscribe((data) => {
      this.roles = data;
    });
  }
  registrar(): void {
    if (this.form.valid) {
      const usuarioSeleccionado: Usuario = this.form.value.usuario;

      this.service.getUsuarioRoles().subscribe((asignaciones) => {
        const existe = asignaciones.some(
          (asig: any) => asig.usuario.id === usuarioSeleccionado.id,
        );

        if (existe) {
          this.mensajeError =
            'Este usuario ya tiene asignado un rol.';
        } else {
          this.service.createUsuarioRol(this.form.value).subscribe({
            next: () => {
              this.mensajeExito =
                'Usuario Rol registrado correctamente';
            },
            error: () => {
              this.mensajeError = 'Error al registrar el Usuario Rol';
            },
          });
        }
      });
    }
  }

  volver(): void {
    this.router.navigate(['panel-control/listar-usuario-rol']);
  }

  limpiarFormulario(): void {
    this.form.reset({
      usuario: null,
      rol: null,
      sucursal: null,
    });
  }
  manejarOk() {
    this.mensajeExito = '';
    this.router.navigate(['panel-control/listar-usuario-rol']);
  }

  manejarError() {
    this.mensajeError = '';
  }
}
