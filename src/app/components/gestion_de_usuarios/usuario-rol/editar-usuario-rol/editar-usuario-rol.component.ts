import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Rol, Usuario } from '../../../../models/models';
import { ServiciosService } from '../../../../services/servicios.service';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { OkComponent } from '../../../mensajes/ok/ok.component';

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

  id!: number;
  mensajeExito: string = '';
  mensajeError: string = '';
  originalData: any = {};

  constructor(
    private fb: FormBuilder,
    private service: ServiciosService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.form = this.fb.group({
      id: [null],
      usuario: ['', Validators.required],
      rol: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.id = +this.route.snapshot.paramMap.get('id')!;
    this.loadRelacion();
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

      this.loadUsuarios(data.usuario.id);
      this.loadRoles();
    });
  }

  loadUsuarios(usuarioActualId: number) {
    this.service.getUsuarios().subscribe((data) => {
      this.service.getUsuarioRoles().subscribe((asignaciones) => {
        const usuariosConRol = asignaciones.map((a) => a.usuario.id);
        this.usuarios = data.filter(
          (u) =>
            u.estado &&
            (!usuariosConRol.includes(u.id) || u.id === usuarioActualId),
        );
      });
    });
  }

  loadRoles() {
    this.service.getRoles().subscribe((data) => {
      this.roles = data.filter((r) => r.estado);
    });
  }

  actualizar() {
    if (this.form.invalid) {
      this.mensajeError = 'Complete todos los campos correctamente.';
      return;
    }

    const formData = this.form.value;

    this.service.getUsuarioRoles().subscribe((registros) => {
      const existe = registros.some(
        (r: any) => r.id !== formData.id && r.usuario.id === formData.usuario,
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
