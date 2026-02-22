import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { OkComponent } from '../../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { Rol, Usuario } from '../../../../models/models';
import { ServiciosService } from '../../../../services/servicios.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-editar-usuario-rol',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    OkComponent,
    ErrorComponent,
  ],
  templateUrl: './editar-usuario-rol.component.html',
  styleUrls: ['./editar-usuario-rol.component.css'],
})
export class EditarUsuarioRolComponent implements OnInit {
  form: FormGroup;
  usuarios: Usuario[] = [];
  roles: Rol[] = [];

  id!: number; // ID del registro a editar
  mensajeExito: string = '';
  mensajeError: string = '';
  originalData: any = {};

  constructor(
    private fb: FormBuilder,
    private service: ServiciosService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      id: [null],
      usuario: ['', Validators.required],
      rol: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.id = +this.route.snapshot.paramMap.get('id')!;
    this.loadRelacion(); // Cargar datos actuales primero
  }

  loadRelacion() {
    this.service.getUsuarioRolID(this.id).subscribe((data) => {
      this.originalData = {
        usuario: data.usuario.id,
        rol: data.rol.id,
      };

      this.form.patchValue({
        id: data.id,
        usuario: data.usuario.id,
        rol: data.rol.id,
      });

      // Cargar usuarios y roles disponibles después de cargar el registro
      this.loadUsuarios(data.usuario.id);
      this.loadRoles();
    });
  }

  loadUsuarios(usuarioActualId: number) {
    this.service.getUsuarios().subscribe((data) => {
      // Solo usuarios activos que NO tengan rol asignado o el usuario que estamos editando
      this.service.getUsuarioRoles().subscribe((asignaciones) => {
        const usuariosConRol = asignaciones.map((a) => a.usuario.id);
        this.usuarios = data.filter(
          (u) =>
            u.estado &&
            (!usuariosConRol.includes(u.id) || u.id === usuarioActualId)
        );
      });
    });
  }

  loadRoles() {
    this.service.getRoles().subscribe((data) => {
      this.roles = data.filter((r) => r.estado); // solo roles activos
    });
  }

  actualizar() {
    if (this.form.invalid) {
      this.mensajeError = 'Complete todos los campos correctamente.';
      return;
    }

    const formData = this.form.value;

    // Validación: usuario no puede tener otro rol diferente al original
    this.service.getUsuarioRoles().subscribe((registros) => {
      const existe = registros.some(
        (r: any) => r.id !== formData.id && r.usuario.id === formData.usuario
      );

      if (existe) {
        this.mensajeError =
          'Este usuario ya tiene un rol asignado. No se puede asignar otro.';
      } else {
        this.enviarActualizacion(formData);
      }
    });
  }

  enviarActualizacion(formData: any) {
    this.service.updateUsuarioRol(formData).subscribe({
      next: () => {
        this.mensajeExito = 'Usuario-Rol actualizado correctamente.';
      },
      error: () => {
        this.mensajeError =
          'Error al actualizar el Usuario-Rol. Intente nuevamente.';
      },
    });
  }

  volver(): void {
    this.router.navigate(['panel-control/listar-usuario-rol']);
  }

  limpiarFormulario(): void {
    this.form.patchValue({
      usuario: this.originalData.usuario,
      rol: this.originalData.rol,
    });
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
