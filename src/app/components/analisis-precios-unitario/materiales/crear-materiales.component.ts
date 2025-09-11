import { Component, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ServiciosService } from '../../../services/servicios.service';
import { Materiales } from '../../../models/models';
import { UNIDADES, unidadTexto } from '../../../models/unidades';
import { ConfirmacionComponent } from '../../mensajes/confirmacion/confirmacion/confirmacion.component';
import { OkComponent } from '../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../mensajes/error/error.component';

@Component({
  selector: 'app-crear-materiales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule,ConfirmacionComponent, OkComponent, ErrorComponent],
  templateUrl: './crear-materiales.component.html',
  styleUrl: './crear-materiales.component.css',
})
export class CrearMaterialesComponent implements OnInit {
  formulario: FormGroup;
  id_gasto_operaciones = 0;

  usuario_id = 0;
  nombre_usuario = '';
  apellido = '';
  roles: string[] = [];
  permisos: string[] = [];

  unidades = UNIDADES; // importadas del archivo externo
  
  // ✅ Mensajes y estado UI
  formatoInvalido = false;
  mostrarConfirmacion = false;
  tipoConfirmacion: 'proyecto' | 'item' | null = null;
  itemIndexAEliminar: number | null = null;
  mensajeConfirmacion = '';
  mensajeExito = '';
  mensajeError = '';
  constructor(
    private fb: FormBuilder,
    private servicio: ServiciosService,
    private route: ActivatedRoute
  ) {
    this.formulario = this.fb.group({
      materiales: this.fb.array([]),
    });
    this.agregarMaterial();
  }

  ngOnInit(): void {
    this.recuperarUsuarioLocalStorage();

    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      if (this.id_gasto_operaciones) this.cargarMaterialesExistentes();
    });
  }
  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  }


  // 🔹 Helpers
  get materiales(): FormArray {
    return this.formulario.get('materiales') as FormArray;
  }

  get totalMateriales(): number {
    const total = this.materiales.controls.reduce((acc, mat) => {
      const cantidad = mat.get('cantidad')?.value || 0;
      const precio = mat.get('precio_unitario')?.value || 0;
      return acc + cantidad * precio; // operaciones con todos los decimales
    }, 0);
    this.servicio.setTotalMateriales(total); // guardamos el total sin formatear
    return total;
  }


  unidadTexto = unidadTexto; // usamos la función importada

  // 🔹 Métodos de usuario
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

  // 🔹 Formulario
  private crearMaterialForm(mat?: Materiales, esNuevo = true): FormGroup {
    return this.fb.group({
      id: [mat?.id ?? null],
      descripcion: [mat?.descripcion ?? '', Validators.required],
      unidad: [mat?.unidad ?? '', Validators.required],
      cantidad: [mat?.cantidad ?? 0, [Validators.required, Validators.min(0)]],
      precio_unitario: [mat?.precio_unitario ?? 0, [Validators.required, Validators.min(0)]],
      total: [{ value: mat?.total ?? 0, disabled: true }],
      esNuevo: [esNuevo],
      editarUnidad: [esNuevo],
    });
  }

  agregarMaterial(): void {
    this.materiales.push(this.crearMaterialForm());
  }

  cargarMaterialesExistentes(): void {
    this.servicio.getMaterialesIDGasto(this.id_gasto_operaciones).subscribe((materiales) => {
      this.materiales.clear();
      materiales.forEach((mat) => {
        this.materiales.push(this.crearMaterialForm(mat, false));
      });
    });
  }

  // 🔹 CRUD
  registrarItem(index: number): void {
    const mat = this.materiales.at(index);
    if (mat.invalid) {
      mat.markAllAsTouched();
      return;
    }

    const nuevoMaterial: Materiales = this.crearMaterialDesdeForm(mat);
    this.servicio.createMaterial(nuevoMaterial).subscribe({
      next: (res: Materiales) => {
        mat.patchValue({ id: res.id, esNuevo: false, total: res.total });
        this.actualizarTotalGlobal();
        this.mensajeExito = 'Material registrado exitosamente.'; // ✅ modal OK
      },
      error: () => {
        this.mensajeError = 'Error al registrar material.'; // ✅ modal Error
      },
    });
  }

  actualizarItem(index: number): void {
    const mat = this.materiales.at(index);
    if (mat.invalid || !mat.get('id')?.value) return;

    const materialActualizado: Materiales = this.crearMaterialDesdeForm(mat);
    this.servicio.updateMaterial(materialActualizado).subscribe({
      next: () => {
        mat.patchValue({ total: materialActualizado.total });
        this.actualizarTotalGlobal();
        this.mensajeExito = 'Material actualizado correctamente.'; // ✅ modal OK
      },
      error: () => {
        this.mensajeError = 'Error al actualizar material.'; // ✅ modal Error
      },
    });
  }


  eliminarItem(index: number): void {
    const mat = this.materiales.at(index);

    // 🔹 Mostrar confirmación antes de eliminar
    this.mostrarConfirmacion = true;
    this.tipoConfirmacion = 'item';
    this.itemIndexAEliminar = index;
    this.mensajeConfirmacion = '¿Estás seguro de eliminar este material?';
  }


  // 🔹 Helpers para cálculos
  private crearMaterialDesdeForm(control: AbstractControl): Materiales {
    return {
      id: control.get('id')?.value ?? 0,
      id_gasto_operacion: this.id_gasto_operaciones,
      descripcion: control.get('descripcion')?.value || '',
      unidad: control.get('unidad')?.value || '',
      cantidad: control.get('cantidad')?.value || 0,
      precio_unitario: control.get('precio_unitario')?.value || 0,
      total: (control.get('cantidad')?.value || 0) * (control.get('precio_unitario')?.value || 0),
      creado_por: this.usuario_id,
      modificado_por: this.usuario_id,
    };
  }

  private actualizarTotalGlobal() {
    const total = this.totalMateriales;
    this.servicio.setTotalMateriales(total);
  }

  /* mensajes */
  manejarAceptar() {
    if (this.tipoConfirmacion === 'item' && this.itemIndexAEliminar !== null) {
      const mat = this.materiales.at(this.itemIndexAEliminar);
      if (mat.get('esNuevo')?.value) {
        this.materiales.removeAt(this.itemIndexAEliminar);
        this.mensajeExito = 'Ítem eliminado exitosamente.';
      } else {
        this.servicio.deleteMaterial(mat.get('id')?.value).subscribe({
          next: () => {
            this.materiales.removeAt(this.itemIndexAEliminar!);
            this.mensajeExito = 'Ítem eliminado exitosamente.';
          },
          error: () => {
            this.mensajeError = 'Error al eliminar el material.';
          },
        });
      }
    }
    this.mostrarConfirmacion = false;
    this.tipoConfirmacion = null;
    this.itemIndexAEliminar = null;
  }


  manejarCancelar() {
    this.mostrarConfirmacion = false;
    this.tipoConfirmacion = null;
    this.itemIndexAEliminar = null;
    this.mensajeConfirmacion = '';
    
  }
  manejarOk() {
    this.mensajeExito = '';
  }

  manejarError() {
    this.mensajeError = '';
  }


  // 🔹 Eventos UI
  actualizarPrecioParcial(control: AbstractControl): void {
    const cantidad = control.get('cantidad')?.value || 0;
    const precio_unitario = control.get('precio_unitario')?.value || 0;
    control.get('total')?.setValue(cantidad * precio_unitario, { emitEvent: false });
  }

  onCantidadChange(control: AbstractControl): void {
    control.get('cantidad')?.markAsTouched();
    this.actualizarPrecioParcial(control);
  }

  onPrecioUniChange(control: AbstractControl): void {
    control.get('precio_unitario')?.markAsTouched();
    this.actualizarPrecioParcial(control);
  }

  blockE(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  }
}
