import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { OkComponent } from '../../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { Permiso, Rol } from '../../../../models/models';
import { ServiciosService } from '../../../../services/servicios.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-crear-rol-permiso',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    OkComponent,
    ErrorComponent,
  ],
  templateUrl: './crear-rol-permiso.component.html',
  styleUrl: './crear-rol-permiso.component.css'
})
export class CrearRolPermisoComponent {
  form: FormGroup;
  roles: Rol[] = [];
  permisos: Permiso[] = [];

  mensajeExito: string = '';
  mensajeError: string = '';

  permisosSeleccionados: number[] = [];
  constructor(
    private fb: FormBuilder,
    private service: ServiciosService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      rol: ['', Validators.required], // Será rol_id (número)
      permiso: [[], Validators.required], // Será permiso_id (número)
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadPermisos();
  }

  loadRoles(): void {
    this.service.getRoles().subscribe((data) => {
      this.roles = data.filter((r) => r.estado); // Solo roles activos
    });
  }

  loadPermisos(): void {
    this.service.getPermisos().subscribe((data) => {
      this.permisos = data.filter((p) => p.estado); // Solo permisos activos
    });
  }
  onPermisoChange(event: any) {
    const permisoId = +event.target.value;

    if (event.target.checked) {
      if (!this.permisosSeleccionados.includes(permisoId)) {
        this.permisosSeleccionados.push(permisoId);
      }
    } else {
      this.permisosSeleccionados = this.permisosSeleccionados.filter(
        (id) => id !== permisoId
      );
    }

    // Actualizar el FormControl para que Angular lo considere válido/inválido
    this.form.controls['permiso'].setValue(this.permisosSeleccionados);
    this.form.controls['permiso'].markAsTouched();
    this.form.controls['permiso'].updateValueAndValidity();
  }


  isChecked(id: number): boolean {
    return this.permisosSeleccionados.includes(id);
  }
    
  registrar(): void {
    const rolId: number = this.form.value.rol;

    if (this.permisosSeleccionados.length === 0) {
      this.mensajeError = 'Debe seleccionar al menos un permiso.';
      return;
    }

    let exitos = 0;
    let errores = 0;

    this.permisosSeleccionados.forEach((permisoId) => {
      this.service.getRolPermiso().subscribe((data) => {
        const existe = data.some(
          (rp) => rp.rol.id === rolId && rp.permiso.id === permisoId
        );

        if (!existe) {
          this.service
            .createRolPermiso({ rol: rolId, permiso: permisoId } as any)
            .subscribe({
              next: () => {
                exitos++;
                if (exitos + errores === this.permisosSeleccionados.length) {
                  this.mensajeExito = `${exitos} permisos asignados correctamente.`;
                }
              },
              error: () => {
                errores++;
                if (exitos + errores === this.permisosSeleccionados.length) {
                  this.mensajeError = `Hubo errores en ${errores} asignaciones.`;
                }
              },
            });
        } else {
          errores++;
          if (exitos + errores === this.permisosSeleccionados.length) {
            this.mensajeError = `Algunos permisos ya estaban asignados.`;
          }
        }
      });
    });
  }

  volver(): void {
    this.router.navigate(['panel-control/listar-rol-permiso']);
  }

  limpiarFormulario(): void {
    this.form.reset({
      rol: null,
      permiso: null,
    });
  }
  manejarOk() {
    this.mensajeExito = '';
    this.router.navigate(['panel-control/listar-rol-permiso']);
  }

  manejarError() {
    this.mensajeError = '';
  }
}
