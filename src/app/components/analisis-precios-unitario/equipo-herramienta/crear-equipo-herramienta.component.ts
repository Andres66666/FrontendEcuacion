import { Component, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ServiciosService } from '../../../services/servicios.service';
import { EquipoHerramienta } from '../../../models/models';
import { UNIDADES, unidadTexto } from '../../../models/unidades';
import { ConfirmacionComponent } from '../../mensajes/confirmacion/confirmacion/confirmacion.component';
import { OkComponent } from '../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../mensajes/error/error.component';

@Component({
  selector: 'app-crear-equipo-herramienta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ConfirmacionComponent, OkComponent, ErrorComponent],
  templateUrl: './crear-equipo-herramienta.component.html',
  styleUrls: ['./crear-equipo-herramienta.component.css'],
})
export class CrearEquipoHerramientaComponent implements OnInit {
  formulario: FormGroup;
  id_gasto_operaciones = 0;
  herramientas = 0;
  totalManoObra = 0;
  porcentaje_global_100 = 0;

  usuario_id = 0;
  nombre_usuario = '';
  apellido = '';
  roles: string[] = [];
  permisos: string[] = [];

  unidades = UNIDADES;

  // ✅ Mensajes y estado UI
  mostrarConfirmacion = false;
  tipoConfirmacion: 'item' | null = null;
  itemIndexAEliminar: number | null = null;
  mensajeConfirmacion = '';
  mensajeExito = '';
  mensajeError = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private servicio: ServiciosService
  ) {
    this.formulario = this.fb.group({
      equipos: this.fb.array([]),
      herramientas: [0, [Validators.required, Validators.min(0)]],
    });

    this.agregarEquipo();
  }

  ngOnInit(): void {
    this.recuperarUsuarioLocalStorage();

    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      this.herramientas = Number(params['herramientas']) || 0;
      this.porcentaje_global_100 = Number(params['porcentaje_global_100']) || 0;

      this.formulario.get('herramientas')?.setValue(this.herramientas);

      if (this.id_gasto_operaciones) this.cargarEquipoHerramientaExistente();
    });

    this.servicio.totalManoObra$.subscribe((total) => (this.totalManoObra = total));
  }

  // 🔹 Helpers
  get equipos(): FormArray {
    return this.formulario.get('equipos') as FormArray;
  }

  get subtotalEquipos(): number {
    return this.equipos.controls.reduce((acc, control) => {
      const cantidad = control.get('cantidad')?.value || 0;
      const precio = control.get('precio_unitario')?.value || 0;
      return acc + cantidad * precio;
    }, 0);
  }

  get herramientasPorcentaje(): number {
    return this.totalManoObra * (this.herramientas / this.porcentaje_global_100);
  }

  get totalEquipos(): number {
    const total = this.subtotalEquipos + this.herramientasPorcentaje;
    this.servicio.setTotalEquipos(total);
    return total;
  }
    // Para mostrar el total con 2 decimales
  get totalEquiposFormateado(): string {
    return this.formatearNumero(this.totalEquipos);
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  }

  // 🔹 Usuario
  private recuperarUsuarioLocalStorage() {
    const usuarioStr = localStorage.getItem('usuarioLogueado');
    if (!usuarioStr) return;

    try {
      const datosUsuario = JSON.parse(usuarioStr);
      this.usuario_id = datosUsuario.id ?? 0;
      this.nombre_usuario = datosUsuario.nombre ?? '';
      this.apellido = datosUsuario.apellido ?? '';
      this.roles = datosUsuario.rol ?? [];
      this.permisos = datosUsuario.permiso ?? [];
    } catch (error) {
      console.error('Error al parsear usuario desde localStorage', error);
    }
  }

  // 🔹 CRUD Equipos
  private crearEquipoForm(equipo?: EquipoHerramienta, esNuevo = true): FormGroup {
    return this.fb.group({
      id: [equipo?.id ?? null],
      descripcion: [equipo?.descripcion ?? '', Validators.required],
      unidad: [equipo?.unidad ?? '', Validators.required],
      cantidad: [equipo?.cantidad ?? 0, [Validators.required, Validators.min(0)]],
      precio_unitario: [equipo?.precio_unitario ?? 0, [Validators.required, Validators.min(0)]],
      total: [{ value: equipo?.total ?? 0, disabled: true }],
      esNuevo: [esNuevo],
      editarUnidad: [esNuevo],
    });
  }

  agregarEquipo(): void {
    this.equipos.push(this.crearEquipoForm());
  }

  cargarEquipoHerramientaExistente(): void {
    this.servicio.getEquipoHerramientas(this.id_gasto_operaciones).subscribe((equipos) => {
      this.equipos.clear();
      equipos.forEach((equipo) => this.equipos.push(this.crearEquipoForm(equipo, false)));
    });
  }

  registrarItem(index: number): void {
    const equipo = this.equipos.at(index);
    if (equipo.invalid) {
      equipo.markAllAsTouched();
      return;
    }
    const nuevoEquipo: EquipoHerramienta = this.crearEquipoDesdeForm(equipo);
    this.servicio.createEquipoHerramienta(nuevoEquipo).subscribe({
      next: (res) => {
        equipo.patchValue({ id: res.id, esNuevo: false });
        this.mensajeExito = 'Equipo/herramienta registrada correctamente.';
      },
      error: () => {
        this.mensajeError = 'Error al registrar equipo/herramienta.';
      },
    });
  }

  actualizarItem(index: number): void {
    const equipo = this.equipos.at(index);
    if (equipo.invalid || !equipo.get('id')?.value) return;

    const equipoActualizado = this.crearEquipoDesdeForm(equipo);
    this.servicio.updateEquipoHerramienta(equipoActualizado).subscribe({
      next: () => {
        equipo.patchValue({ total: equipoActualizado.total });
        this.mensajeExito = 'Equipo/herramienta actualizada correctamente.';
      },
      error: () => {
        this.mensajeError = 'Error al actualizar equipo/herramienta.';
      },
    });
  }
  eliminarItem(index: number): void {
    const equipo = this.equipos.at(index);
    if (equipo.get('esNuevo')?.value) {
      // Si es nuevo, se puede eliminar directamente
      this.equipos.removeAt(index);
      this.mensajeExito = 'Ítem eliminado exitosamente.';
    } else {
      // Si ya existe en BD, mostrar confirmación
      this.mostrarConfirmacion = true;
      this.tipoConfirmacion = 'item';
      this.itemIndexAEliminar = index;
      this.mensajeConfirmacion = '¿Estás seguro de eliminar este ítem?';
    }
  }
  private crearEquipoDesdeForm(control: AbstractControl): EquipoHerramienta {
    const cantidad = control.get('cantidad')?.value || 0;
    const precio = control.get('precio_unitario')?.value || 0;

    return {
      id: control.get('id')?.value ?? 0,
      id_gasto_operacion: this.id_gasto_operaciones,
      descripcion: control.get('descripcion')?.value || '',
      unidad: control.get('unidad')?.value || '',
      cantidad,
      precio_unitario: precio,
      total: cantidad * precio,
      creado_por: this.usuario_id,
      modificado_por: this.usuario_id,
    };
  }

  // 🔹 Manejo de confirmación
  manejarAceptar(): void {
    if (this.tipoConfirmacion === 'item' && this.itemIndexAEliminar !== null) {
      const equipo = this.equipos.at(this.itemIndexAEliminar);
      this.servicio.deleteEquipoHerramienta(equipo.get('id')?.value).subscribe({
        next: () => {
          this.equipos.removeAt(this.itemIndexAEliminar!);
          this.mensajeExito = 'Ítem eliminado exitosamente.';
        },
        error: () => {
          this.mensajeError = 'Error al eliminar el ítem.';
        }
      });
    }
    this.mostrarConfirmacion = false;
    this.tipoConfirmacion = null;
    this.itemIndexAEliminar = null;
  }

  manejarCancelar(): void {
    this.mostrarConfirmacion = false;
    this.tipoConfirmacion = null;
    this.itemIndexAEliminar = null;
    this.mensajeConfirmacion = '';
  }

  manejarOk(): void {
    this.mensajeExito = '';
  }

  manejarError(): void {
    this.mensajeError = '';
  }


  actualizarPrecioParcial(control: AbstractControl): void {
    const cantidad = control.get('cantidad')?.value || 0;
    const precio = control.get('precio_unitario')?.value || 0;
    control.get('total')?.setValue(cantidad * precio, { emitEvent: false });
  }

  onCantidadChange(control: AbstractControl): void {
    control.get('cantidad')?.markAsTouched();
    this.actualizarPrecioParcial(control);
  }

  onPrecioUniChange(control: AbstractControl): void {
    control.get('precio_unitario')?.markAsTouched();
    this.actualizarPrecioParcial(control);
  }

  onUnidadChange(control: AbstractControl): void {
    control.get('unidad')?.markAsTouched();
  }

  blockE(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  }

  unidadTexto = unidadTexto;
}
