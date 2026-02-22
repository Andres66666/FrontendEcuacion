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
  styleUrls: ['./crear-rol-permiso.component.css'],
})
export class CrearRolPermisoComponent implements OnInit {
  form: FormGroup;
  roles: Rol[] = [];
  permisos: Permiso[] = [];
  permisosDisponibles: Permiso[] = [];

  mensajeExito: string = '';
  mensajeError: string = '';
  permisosSeleccionados: number[] = [];

  constructor(
    private fb: FormBuilder,
    private service: ServiciosService,
    private router: Router
  ) {
    this.form = this.fb.group({
      rol: ['', Validators.required],
      permiso: [[], Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadPermisos();

    // Debug completo
    this.service.getRolPermiso().subscribe({
      next: (data) => {
        console.log('DATOS DE ROL_PERMISO DEL BACKEND:');
        console.log('Cantidad de relaciones:', data.length);
        console.log('Datos completos:', data);

        if (data.length > 0) {
          console.log('Primera relación:', data[0]);
          console.log('Tipo de rol:', typeof data[0].rol, data[0].rol);
          console.log(
            'Tipo de permiso:',
            typeof data[0].permiso,
            data[0].permiso
          );
        } else {
          console.warn('El array de rol_permiso está VACÍO');
        }
      },
      error: (error) => {
        console.error('Error al obtener rol_permiso:', error);
      },
    });
  }
  loadPermisos(): void {
    this.service.getPermisos().subscribe({
      next: (data) => {
        this.permisos = data.filter((p) => p.estado);
        console.log('Permisos cargados:', this.permisos);
      },
      error: (error) => {
        console.error('Error al cargar permisos:', error);
        this.permisos = [];
      },
    });
  }

  loadRoles(): void {
    this.service.getRoles().subscribe({
      next: (data) => {
        this.roles = data.filter((r) => r.estado);
        console.log('Roles cargados:', this.roles);
      },
      error: (error) => {
        console.error('Error al cargar roles:', error);
        this.roles = [];
      },
    });
  }
  onRolChange(): void {
    const rolId = +this.form.value.rol; // Asegurar que es número

    // Limpiar
    this.permisosDisponibles = [];
    this.permisosSeleccionados = [];
    this.form.controls['permiso'].setValue([]);

    if (!rolId) {
      this.mensajeError = '';
      return;
    }

    console.log('=== INICIANDO CARGA PARA ROL:', rolId, '===');

    this.service.getRolPermiso().subscribe({
      next: (rolPermisos) => {
        console.log(
          '1. Total de relaciones en el sistema:',
          rolPermisos.length
        );

        if (rolPermisos.length === 0) {
          console.log('No hay relaciones rol-permiso en el sistema');
          this.permisosDisponibles = [...this.permisos];
          return;
        }

        // DEBUG DETALLADO de las primeras 3 relaciones
        console.log('2. Estructura de datos (primeras 3 relaciones):');
        rolPermisos.slice(0, 3).forEach((rp, index) => {
          console.log(`   Relación ${index + 1}:`, {
            'rp.rol': rp.rol,
            'rp.rol.id': rp.rol?.id,
            'rp.rol type': typeof rp.rol,
            'rp.permiso': rp.permiso,
            'rp.permiso.id': rp.permiso?.id,
            'rp.permiso type': typeof rp.permiso,
          });
        });

        // Buscar relaciones de este rol específico
        const relacionesDelRol = rolPermisos.filter((rp) => {
          if (!rp.rol || !rp.permiso) return false;

          const idRol = typeof rp.rol === 'object' ? rp.rol.id : rp.rol;
          return idRol === rolId;
        });

        console.log(
          '3. Relaciones encontradas para rol',
          rolId + ':',
          relacionesDelRol.length
        );

        const permisosAsignados = relacionesDelRol.map((rp) => {
          return typeof rp.permiso === 'object' ? rp.permiso.id : rp.permiso;
        });

        console.log('4. IDs de permisos asignados:', permisosAsignados);
        console.log('5. Total de permisos en sistema:', this.permisos.length);

        // FILTRAR: Solo permisos que NO están asignados
        this.permisosDisponibles = this.permisos.filter(
          (p) => !permisosAsignados.includes(p.id)
        );

        console.log(
          '6. Permisos disponibles para asignar:',
          this.permisosDisponibles.length
        );
        console.log('=== FIN DE CARGA ===');

        // Mensajes
        if (this.permisosDisponibles.length === 0 && this.permisos.length > 0) {
          this.mensajeError = 'Este rol ya tiene todos los permisos asignados.';
        } else {
          this.mensajeError = '';
        }
      },
      error: (error) => {
        console.error('Error:', error);
        this.mensajeError = 'Error al cargar los permisos.';
      },
    });
  }
  onPermisoChange(event: any): void {
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
    this.form.controls['permiso'].setValue(this.permisosSeleccionados);
    this.form.controls['permiso'].markAsTouched();
    this.form.controls['permiso'].updateValueAndValidity();
  }

  isChecked(id: number): boolean {
    return this.permisosSeleccionados.includes(id);
  }

  registrar(): void {
    const rolId: number = this.form.value.rol;

    if (!rolId) {
      this.mensajeError = 'Seleccione un rol.';
      return;
    }

    if (this.permisosSeleccionados.length === 0) {
      this.mensajeError = 'Debe seleccionar al menos un permiso.';
      return;
    }

    console.log('Intentando registrar para rol:', rolId);
    console.log('Permisos seleccionados:', this.permisosSeleccionados);

    let exitos = 0;
    let errores = 0;
    const totalPermisos = this.permisosSeleccionados.length;

    // Obtener permisos ya asignados antes de registrar
    this.service.getRolPermiso().subscribe((data) => {
      console.log('Relaciones rol-permiso existentes:', data);

      this.permisosSeleccionados.forEach((permisoId) => {
        // CORRECIÓN: Verificar correctamente la existencia
        const existe = data.some(
          (rp) => rp.rol.id === rolId && rp.permiso.id === permisoId
        );

        console.log(
          `Verificando rol ${rolId} - permiso ${permisoId}: ${
            existe ? 'YA EXISTE' : 'NO EXISTE'
          }`
        );

        if (!existe) {
          this.service
            .createRolPermiso({ rol: rolId, permiso: permisoId } as any)
            .subscribe({
              next: () => {
                exitos++;
                console.log(`Permiso ${permisoId} asignado exitosamente`);
                this.verificarCompletado(exitos, errores, totalPermisos);
              },
              error: (error) => {
                errores++;
                console.error(`Error asignando permiso ${permisoId}:`, error);
                this.verificarCompletado(exitos, errores, totalPermisos);
              },
            });
        } else {
          errores++;
          console.log(`Permiso ${permisoId} ya estaba asignado`);
          this.verificarCompletado(exitos, errores, totalPermisos);
        }
      });
    });
  }

  // Método auxiliar para verificar cuando terminan todas las operaciones
  private verificarCompletado(
    exitos: number,
    errores: number,
    total: number
  ): void {
    if (exitos + errores === total) {
      if (exitos > 0) {
        this.mensajeExito = `${exitos} permisos asignados correctamente.`;
        this.onRolChange(); // actualizar lista de permisos disponibles
      }
      if (errores > 0) {
        this.mensajeError = `Hubo ${errores} errores en las asignaciones.`;
      }
    }
  }

  volver(): void {
    this.router.navigate(['panel-control/listar-rol-permiso']);
  }

  limpiarFormulario(): void {
    this.form.reset({ rol: null, permiso: null });
    this.permisosDisponibles = [];
    this.permisosSeleccionados = [];
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
