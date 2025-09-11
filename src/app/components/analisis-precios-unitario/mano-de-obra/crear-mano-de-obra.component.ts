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
import { ManoDeObra } from '../../../models/models';
import { UNIDADES, unidadTexto } from '../../../models/unidades';
import { ConfirmacionComponent } from '../../mensajes/confirmacion/confirmacion/confirmacion.component';
import { OkComponent } from '../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../mensajes/error/error.component';

@Component({
  selector: 'app-crear-mano-de-obra',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ConfirmacionComponent, OkComponent, ErrorComponent],
  templateUrl: './crear-mano-de-obra.component.html',
  styleUrls: ['./crear-mano-de-obra.component.css'],
})
export class CrearManoDeObraComponent implements OnInit {
  formulario: FormGroup;
  id_gasto_operaciones = 0;
  carga_social = 0;
  iva_efectiva = 0;
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
    private servicio: ServiciosService,
    private route: ActivatedRoute
  ) {
    this.formulario = this.fb.group({
      manoObra: this.fb.array([]),
      cargasSociales: [null, [Validators.required, Validators.min(0.55), Validators.max(0.7118)]],
      iva: [null, [Validators.required, Validators.min(0.01), Validators.max(1)]],
    });

    this.agregarManoDeObra();
  }

  ngOnInit(): void {
    this.recuperarUsuarioLocalStorage();

    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      this.carga_social = Number(params['carga_social']) || 0;
      this.iva_efectiva = Number(params['iva_efectiva']) || 0;
      this.porcentaje_global_100 = Number(params['porcentaje_global_100']) || 0;

      this.formulario.get('cargasSociales')?.setValue(this.carga_social);
      this.formulario.get('iva')?.setValue(this.iva_efectiva);

      if (this.id_gasto_operaciones) this.cargarManoDeObraExistente();
    });
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  }

  // 🔹 Helpers
  get manoObra(): FormArray {
    return this.formulario.get('manoObra') as FormArray;
  }

  get subtotalManoObra(): number {
    return this.manoObra.controls.reduce((acc, control) => {
      const cantidad = control.get('cantidad')?.value || 0;
      const precio = control.get('precio_unitario')?.value || 0;
      return acc + cantidad * precio;
    }, 0);
  }

  get cargasManoObra(): number {
    return this.subtotalManoObra * (this.carga_social / this.porcentaje_global_100);
  }

  get ivaManoObra(): number {
    return (this.subtotalManoObra + this.cargasManoObra) * (this.iva_efectiva / this.porcentaje_global_100);
  }

  get totalManoObra(): number {
    const total = this.subtotalManoObra + this.cargasManoObra + this.ivaManoObra;
    this.servicio.setTotalManoObra(total);
    return total;
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

  // 🔹 CRUD Mano de Obra
  private crearManoDeObraForm(trabajo?: ManoDeObra, esNuevo = true): FormGroup {
    return this.fb.group({
      id: [trabajo?.id ?? null],
      descripcion: [trabajo?.descripcion ?? '', Validators.required],
      unidad: [trabajo?.unidad ?? '', Validators.required],
      cantidad: [trabajo?.cantidad ?? 0, [Validators.required, Validators.min(0)]],
      precio_unitario: [trabajo?.precio_unitario ?? 0, [Validators.required, Validators.min(0)]],
      total: [{ value: trabajo?.total ?? 0, disabled: true }],
      esNuevo: [esNuevo],
      editarUnidad: [esNuevo],
    });
  }

  agregarManoDeObra(): void {
    this.manoObra.push(this.crearManoDeObraForm());
  }

  cargarManoDeObraExistente(): void {
    this.servicio.getManoDeObraIDGasto(this.id_gasto_operaciones).subscribe((manoObra) => {
      this.manoObra.clear();
      manoObra.forEach((trabajo) => this.manoObra.push(this.crearManoDeObraForm(trabajo, false)));
    });
  }

  registrarItem(index: number): void {
    const trabajo = this.manoObra.at(index);
    if (trabajo.invalid) {
      trabajo.markAllAsTouched();
      return;
    }

    const nuevoTrabajo: ManoDeObra = this.crearManoDeObraDesdeForm(trabajo);
    this.servicio.createManoDeObra(nuevoTrabajo).subscribe({
      next: (res) => {
        trabajo.patchValue({ id: res.id, esNuevo: false });
        this.mensajeExito = 'Mano de obra registrada correctamente.';
      },
      error: () => {
        this.mensajeError = 'Error al registrar mano de obra.';
      },
    });
  }

  actualizarItem(index: number): void {
    const trabajo = this.manoObra.at(index);
    if (trabajo.invalid || !trabajo.get('id')?.value) return;

    const trabajoActualizado = this.crearManoDeObraDesdeForm(trabajo);
    this.servicio.updateManoDeObra(trabajoActualizado).subscribe({
      next: () => {
        trabajo.patchValue({ total: trabajoActualizado.total });
        this.mensajeExito = 'Mano de obra actualizada correctamente.';
      },
      error: () => {
        this.mensajeError = 'Error al actualizar mano de obra.';
      },
    });
  }

  eliminarItem(index: number): void {
    this.mostrarConfirmacion = true;
    this.tipoConfirmacion = 'item';
    this.itemIndexAEliminar = index;
    this.mensajeConfirmacion = '¿Estás seguro de eliminar este ítem?';
  }

  manejarAceptar() {
    if (this.tipoConfirmacion === 'item' && this.itemIndexAEliminar !== null) {
      const trabajo = this.manoObra.at(this.itemIndexAEliminar);
      if (trabajo.get('esNuevo')?.value) {
        this.manoObra.removeAt(this.itemIndexAEliminar);
        this.mensajeExito = 'Ítem eliminado exitosamente.';
      } else {
        this.servicio.deleteManoDeObra(trabajo.get('id')?.value).subscribe({
          next: () => {
            this.manoObra.removeAt(this.itemIndexAEliminar!);
            this.mensajeExito = 'Ítem eliminado exitosamente.';
          },
          error: () => {
            this.mensajeError = 'Error al eliminar el ítem.';
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

  private crearManoDeObraDesdeForm(control: AbstractControl): ManoDeObra {
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
