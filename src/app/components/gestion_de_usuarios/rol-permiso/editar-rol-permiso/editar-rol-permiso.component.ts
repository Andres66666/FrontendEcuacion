import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { OkComponent } from '../../../mensajes/ok/ok.component';
import { Permiso, Rol, RolPermiso } from '../../../../models/models';
import { ServiciosService } from '../../../../services/servicios.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-editar-rol-permiso',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ErrorComponent,
    OkComponent,
  ],
  templateUrl: './editar-rol-permiso.component.html',
  styleUrl: './editar-rol-permiso.component.css',
})
export class EditarRolPermisoComponent implements OnInit {
  form: FormGroup;
  roles: Rol[] = [];
  permisos: Permiso[] = [];
  permisosDisponibles: Permiso[] = [];
  id!: number;
  relacionOriginal!: RolPermiso;
  permisoSeleccionado: number | null = null;

  mensajeExito: string = '';
  mensajeError: string = '';

  constructor(
    private fb: FormBuilder,
    private service: ServiciosService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      id: [null],
      rol: ['', Validators.required],
      permiso: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.id = +this.route.snapshot.paramMap.get('id')!;
    this.loadRoles();
    this.loadPermisos();
    this.loadRelacion();
  }

  loadRoles(): void {
    this.service.getRoles().subscribe({
      next: (data) => {
        this.roles = data.filter((r) => r.estado);
        console.log('✅ Roles cargados:', this.roles);
      },
      error: (error) => {
        console.error('❌ Error al cargar roles:', error);
        this.roles = [];
      },
    });
  }

  loadPermisos(): void {
    this.service.getPermisos().subscribe({
      next: (data) => {
        this.permisos = data.filter((p) => p.estado);
        console.log('✅ Permisos cargados:', this.permisos);
      },
      error: (error) => {
        console.error('❌ Error al cargar permisos:', error);
        this.permisos = [];
      },
    });
  }

  loadRelacion(): void {
    this.service.getRolPermisoID(this.id).subscribe({
      next: (data) => {
        this.relacionOriginal = data;
        console.log('📋 Relación original cargada:', data);

        this.form.patchValue({
          id: data.id,
          rol: data.rol.id,
          permiso: data.permiso.id,
        });

        this.permisoSeleccionado = data.permiso.id;

        // Cargar permisos disponibles para el rol seleccionado
        this.cargarPermisosDisponibles(data.rol.id);
      },
      error: (error) => {
        console.error('❌ Error al cargar la relación:', error);
        this.mensajeError = 'Error al cargar la relación rol-permiso.';
      },
    });
  }

  onRolChange(): void {
    const rolId = +this.form.value.rol;

    if (!rolId) {
      this.permisosDisponibles = [];
      this.permisoSeleccionado = null;
      this.form.patchValue({ permiso: '' });
      return;
    }

    this.permisoSeleccionado = null;
    this.form.patchValue({ permiso: '' });
    this.cargarPermisosDisponibles(rolId);
  }

  onPermisoChange(permisoId: number): void {
    if (this.permisoSeleccionado === permisoId) {
      // Deseleccionar si ya está seleccionado
      this.permisoSeleccionado = null;
      this.form.patchValue({ permiso: '' });
    } else {
      // Seleccionar nuevo permiso
      this.permisoSeleccionado = permisoId;
      this.form.patchValue({ permiso: permisoId });
    }

    this.form.controls['permiso'].markAsTouched();
    this.form.controls['permiso'].updateValueAndValidity();
  }

  isSelected(permisoId: number): boolean {
    return this.permisoSeleccionado === permisoId;
  }

  // Método para obtener el nombre del permiso seleccionado
  getNombrePermisoSeleccionado(): string {
    if (!this.permisoSeleccionado) return '';

    const permiso = this.permisosDisponibles.find(
      (p) => p.id === this.permisoSeleccionado
    );
    return permiso ? permiso.nombre : '';
  }

  private cargarPermisosDisponibles(rolId: number): void {
    console.log('🔄 Cargando permisos disponibles para rol:', rolId);

    this.service.getRolPermiso().subscribe({
      next: (rolPermisos) => {
        // Obtener permisos ya asignados a este rol
        const permisosAsignados = rolPermisos
          .filter((rp) => {
            const idRol = typeof rp.rol === 'object' ? rp.rol.id : rp.rol;
            return idRol === rolId;
          })
          .map((rp) => {
            return typeof rp.permiso === 'object' ? rp.permiso.id : rp.permiso;
          });

        console.log('❌ Permisos asignados al rol:', permisosAsignados);

        // Filtrar permisos disponibles (excluyendo los ya asignados)
        // PERO incluir el permiso actual de la relación que estamos editando
        const permisoActual = this.relacionOriginal?.permiso?.id;
        this.permisosDisponibles = this.permisos.filter(
          (p) => !permisosAsignados.includes(p.id) || p.id === permisoActual
        );

        console.log(
          '✅ Permisos disponibles para seleccionar:',
          this.permisosDisponibles
        );

        // Si hay un permiso seleccionado previamente, verificar si sigue disponible
        if (
          this.permisoSeleccionado &&
          !this.permisosDisponibles.some(
            (p) => p.id === this.permisoSeleccionado
          )
        ) {
          this.permisoSeleccionado = null;
          this.form.patchValue({ permiso: '' });
        }

        // Mostrar mensaje si no hay permisos disponibles
        if (this.permisosDisponibles.length === 0) {
          this.mensajeError = 'Este rol ya tiene todos los permisos asignados.';
        } else {
          this.mensajeError = '';
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar permisos disponibles:', error);
        this.mensajeError = 'Error al cargar los permisos disponibles.';
      },
    });
  }

  actualizar(): void {
    if (this.form.valid) {
      const formData = this.form.value;
      const rolId = formData.rol;
      const permisoId = formData.permiso;

      console.log('📤 Intentando actualizar relación:', formData);

      // Verificar si es el mismo que el original (no hay cambio)
      if (
        this.relacionOriginal &&
        this.relacionOriginal.rol.id === rolId &&
        this.relacionOriginal.permiso.id === permisoId
      ) {
        this.mensajeError = 'No se realizaron cambios en la relación.';
        return;
      }

      // Verificar si ya existe otra relación con el mismo rol y permiso
      this.service.getRolPermiso().subscribe({
        next: (data) => {
          const existe = data.some(
            (rp) =>
              rp.rol.id === rolId &&
              rp.permiso.id === permisoId &&
              rp.id !== this.id
          );

          if (existe) {
            this.mensajeError =
              'Ya existe otra relación con ese Rol y Permiso.';
          } else {
            this.service.updateRolPermiso(formData).subscribe({
              next: () => {
                this.mensajeExito = 'Rol-Permiso actualizado correctamente.';
                console.log('✅ Relación actualizada exitosamente');
              },
              error: (error) => {
                console.error('❌ Error al actualizar:', error);
                this.mensajeError = 'Error al actualizar el Rol-Permiso.';
              },
            });
          }
        },
        error: (error) => {
          console.error('❌ Error al verificar existencia:', error);
          this.mensajeError = 'Error al verificar la relación.';
        },
      });
    } else {
      this.form.markAllAsTouched();
      if (!this.form.get('permiso')?.value) {
        this.mensajeError = 'Por favor, seleccione un permiso.';
      } else {
        this.mensajeError = 'Por favor, complete todos los campos requeridos.';
      }
    }
  }

  volver(): void {
    this.router.navigate(['panel-control/listar-rol-permiso']);
  }

  limpiarFormulario(): void {
    this.loadRelacion();
    this.mensajeError = '';
  }

  manejarOk(): void {
    this.mensajeExito = '';
    this.router.navigate(['panel-control/listar-rol-permiso']);
  }

  manejarError(): void {
    this.mensajeError = '';
  }
}
