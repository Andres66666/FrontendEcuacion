import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  styleUrl: './editar-usuario-rol.component.css'
})
export class EditarUsuarioRolComponent implements OnInit {
  form: FormGroup;
  usuarios: Usuario[] = [];
  roles: Rol[] = [];

  id!: number; // ID para obtener la relación a editar

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
      usuario: ['', Validators.required], // <--- debe ser un ID (número o string)
      rol: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.id = +this.route.snapshot.paramMap.get('id')!;
    this.loadUsuarios();
    this.loadRoles();
    this.loadRelacion(); // Cargar datos actuales
  }

  loadUsuarios() {
    this.service.getUsuarios().subscribe((data) => (this.usuarios = data));
  }

  loadRoles() {
    this.service.getRoles().subscribe((data) => (this.roles = data));
  }

  loadRelacion() {
    this.service.getUsuarioRolID(this.id).subscribe((data) => {
      this.form.patchValue({
        id: data.id,
        usuario: data.usuario.id,
        rol: data.rol.id,
      });

      // Guardamos los valores originales
      this.originalData = {
        usuario: data.usuario.id,
        rol: data.rol.id,
      };
    });
  }

  actualizar() {
    if (this.form.valid) {
      const formData = this.form.value;

      // 1. Verificar si no cambió nada
      const noCambio =
        formData.usuario === this.originalData.usuario &&
        formData.rol === this.originalData.rol;

      if (noCambio) {
        // No cambió nada, actualizar normalmente
        this.enviarActualizacion(formData);
      } else {
        // 2. Verificar si ya existe otro registro con los mismos datos
        this.service.getUsuarioRoles().subscribe((registros) => {
          const existe = registros.some((r: any) => {
            return (
              r.id !== formData.id &&
              r.usuario.id === formData.usuario &&
              r.rol.id === formData.rol
            );
          });

          if (existe) {
            this.mensajeError =
              'Ya existe un registro con este Usuario, Rol y Sucursal.';
          } else {
            this.enviarActualizacion(formData);
          }
        });
      }
    }
  }
  enviarActualizacion(formData: any) {
    this.service.updateUsuarioRol(formData).subscribe({
      next: () => {
        this.mensajeExito = 'Usuario Rol Sucursal actualizado correctamente';
      },
      error: () => {
        this.mensajeError =
          'Error al actualizar el Usuario Rol Sucursal. Intente nuevamente.';
      },
    });
  }

  volver(): void {
    this.router.navigate(['panel-control/listar-usuario-rol']);
  }

  limpiarFormulario(): void {
    this.loadRelacion(); // restablece el formulario a su estado original
  }
  manejarOk() {
    this.mensajeExito = '';
    this.router.navigate(['panel-control/listar-usuario-rol']);
  }

  manejarError() {
    this.mensajeError = '';
  }
}

