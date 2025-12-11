import { Component, HostListener, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  FormsModule,
  FormControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ServiciosService } from '../../../services/servicios.service';
import { ManoDeObra } from '../../../models/models';
import { ConfirmacionComponent } from '../../mensajes/confirmacion/confirmacion/confirmacion.component';
import { OkComponent } from '../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../mensajes/error/error.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-crear-mano-de-obra',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ConfirmacionComponent,
    OkComponent,
    ErrorComponent,
  ],
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

  // Mensajes y estado UI
  mostrarConfirmacion = false;
  tipoConfirmacion: 'item' | null = null;
  itemIndexAEliminar: number | null = null;
  mensajeConfirmacion = '';
  mensajeExito = '';
  mensajeError = '';

  unidadesUsadas: string[] = [];
  unidadesFiltradas: string[][] = [];
  mostrarLista: boolean[] = [];
  descripcionesUsadas: string[] = [];
  descripcionesFiltradas: string[][] = [];
  mostrarListaDescripcion: boolean[] = [];
  catalogoManodeObra: { descripcion: string; ultimo_precio: number }[] = [];

  constructor(
    private fb: FormBuilder,
    private servicio: ServiciosService,
    private route: ActivatedRoute
  ) {
    this.formulario = this.fb.group({
      manoObra: this.fb.array([]),
      cargasSociales: [
        null,
        [Validators.required, Validators.min(0.55), Validators.max(0.7118)],
      ],
      iva: [
        null,
        [Validators.required, Validators.min(0.01), Validators.max(1)],
      ],
    });
    this.formulario = this.fb.group({
      manoObra: this.fb.array([]),
    });
    this.agregarManoDeObra();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      this.carga_social = Number(params['carga_social']) || 0;
      this.iva_efectiva = Number(params['iva_efectiva']) || 0;
      this.porcentaje_global_100 = Number(params['porcentaje_global_100']) || 0;

      this.formulario.get('cargasSociales')?.setValue(this.carga_social);
      this.formulario.get('iva')?.setValue(this.iva_efectiva);

      this.cargarCatalogoManoDeObra();

      this.route.queryParams.subscribe((params) => {
        this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
        if (this.id_gasto_operaciones) {
          this.cargarManoDeObraExistente();
          this.cargarUnidades();
        }
      });
    });
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  }
  getDescripcionControl(index: number): FormControl {
    return this.manoObra.at(index).get('descripcion') as FormControl;
  }
  // Filtrar mientras escribe
  filtrarDescripciones(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;
    valor = valor.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '');
    valor = valor.replace(/\s{2,}/g, ' ');
    input.value = valor;
    this.manoObra.at(index).get('descripcion')?.setValue(valor);
    this.descripcionesFiltradas[index] = this.descripcionesUsadas.filter((d) =>
      d.toLowerCase().includes(valor.toLowerCase())
    );
  }
  // Mostrar descripciones al hacer focus en la fila
  mostrarDescripcionesFila(index: number): void {
    this.mostrarListaDescripcion = this.mostrarListaDescripcion.map(
      () => false
    );
    this.mostrarListaDescripcion[index] = true;
    this.descripcionesFiltradas[index] = [...this.descripcionesUsadas];
  }

  seleccionarDescripcion(i: number, descripcion: string) {
    const control = this.manoObra.at(i);
    control.get('descripcion')?.setValue(descripcion);
    // Buscar el último precio en el catálogo y asignar precio unitario
    const item = this.catalogoManodeObra.find(
      (m) => m.descripcion === descripcion
    );
    if (item) {
      control.get('precio_unitario')?.setValue(item.ultimo_precio);
      this.actualizarPrecioParcial(control);
    }
    this.mostrarListaDescripcion[i] = false;
  }
  cargarUnidades(): void {
    this.servicio.getUnidadesManoDeObra().subscribe({
      next: (res) => {
        this.unidadesUsadas = res || [];
      },
      error: (err) => {
        console.error('Error cargando unidades:', err);
      },
    });
  }

  guardarDescripcionPersonalizada(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = input.value.trim();
    if (valor) {
      this.manoObra.at(index).get('descripcion')?.setValue(valor);
      this.agregarDescripcionSiNoExiste(valor);
    } else {
      this.manoObra.at(index).get('descripcion')?.setValue('');
    }
  }
  cargarCatalogoManoDeObra(): void {
    this.servicio.getManoDeObra().subscribe({
      next: (manoObra) => {
        this.catalogoManodeObra = manoObra.map((m) => ({
          descripcion: m.descripcion.trim(),
          ultimo_precio: m.precio_unitario,
        }));
        this.descripcionesUsadas = [
          ...new Set(manoObra.map((m) => m.descripcion.trim())),
        ];
        this.descripcionesFiltradas = this.manoObra.controls.map(() => [
          ...this.descripcionesUsadas,
        ]);
        this.mostrarListaDescripcion = this.manoObra.controls.map(() => false);
      },
      error: (err) =>
        console.error('Error cargando catálogo de mano de obra:', err),
    });
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
    return (
      this.subtotalManoObra * (this.carga_social / this.porcentaje_global_100)
    );
  }

  get ivaManoObra(): number {
    return (
      (this.subtotalManoObra + this.cargasManoObra) *
      (this.iva_efectiva / this.porcentaje_global_100)
    );
  }

  get totalManoObra(): number {
    const total =
      this.subtotalManoObra + this.cargasManoObra + this.ivaManoObra;
    this.servicio.setTotalManoObra(total);
    return total;
  }

  // 🔹 CRUD Mano de Obra
  private crearManoDeObraForm(trabajo?: ManoDeObra, esNuevo = true): FormGroup {
    return this.fb.group({
      id: [trabajo?.id ?? null],
      descripcion: [trabajo?.descripcion ?? '', Validators.required],
      unidad: [trabajo?.unidad ?? '', Validators.required],
      cantidad: [
        trabajo?.cantidad ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      precio_unitario: [
        trabajo?.precio_unitario ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      total: [{ value: trabajo?.total ?? 0, disabled: true }],
      esNuevo: [esNuevo],
      editarUnidad: [esNuevo],
    });
  }
  agregarManoDeObra(): void {
    this.manoObra.push(this.crearManoDeObraForm());
    this.unidadesFiltradas.push([...this.unidadesUsadas]);
    this.mostrarLista.push(false);

    this.descripcionesFiltradas.push([...this.descripcionesUsadas]);
    this.mostrarListaDescripcion.push(false);
  }

  cargarManoDeObraExistente(): void {
    this.servicio
      .getManoDeObraIDGasto(this.id_gasto_operaciones)
      .subscribe((manoObra) => {
        this.manoObra.clear();
        this.unidadesFiltradas = [];
        this.mostrarLista = [];
        this.descripcionesFiltradas = [];
        this.mostrarListaDescripcion = [];

        manoObra.forEach((trabajo) => {
          this.manoObra.push(this.crearManoDeObraForm(trabajo, false));
          this.agregarUnidadSiNoExiste(trabajo.unidad);
          this.agregarDescripcionSiNoExiste(trabajo.descripcion);

          this.unidadesFiltradas.push([...this.unidadesUsadas]);
          this.mostrarLista.push(false);

          this.descripcionesFiltradas.push([...this.descripcionesUsadas]);
          this.mostrarListaDescripcion.push(false);
        });
      });
  }

  // Agregar unidad si no existe en la lista global
  private agregarUnidadSiNoExiste(unidad: string) {
    const normalizado = unidad.trim();
    if (normalizado && !this.unidadesUsadas.includes(normalizado)) {
      this.unidadesUsadas.push(normalizado);
    }
  }

  private agregarDescripcionSiNoExiste(descripcion: string) {
    const normalizado = descripcion.trim();
    if (normalizado && !this.descripcionesUsadas.includes(normalizado)) {
      this.descripcionesUsadas.push(normalizado);
    }
  }

  filtrarUnidades(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;
    valor = valor.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '');
    valor = valor.replace(/\s{2,}/g, ' ');
    input.value = valor;
    this.manoObra.at(index).get('unidad')?.setValue(valor);
    this.unidadesFiltradas[index] = this.unidadesUsadas.filter((u) =>
      u.toLowerCase().includes(valor.toLowerCase())
    );
  }
  mostrarTodasUnidades(index: number): void {
    this.unidadesFiltradas[index] = [...this.unidadesUsadas];
  }

  mostrarUnidadesFila(index: number): void {
    this.mostrarLista = this.mostrarLista.map(() => false);
    this.mostrarLista[index] = true;
    this.unidadesFiltradas[index] = [...this.unidadesUsadas];
  }

  seleccionarUnidad(index: number, unidad: string): void {
    this.manoObra.at(index).get('unidad')?.setValue(unidad);
    this.mostrarLista[index] = false;
  }

  guardarUnidadPersonalizada(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = input.value.trim();

    if (valor) {
      this.manoObra.at(index).get('unidad')?.setValue(valor);
      this.agregarUnidadSiNoExiste(valor);
    } else {
      this.manoObra.at(index).get('unidad')?.setValue('');
    }
  }

  actualizarPrecioPorDescripcion(descripcion: string, nuevoPrecio: number) {
    descripcion = descripcion.trim().toLowerCase();
    this.manoObra.controls.forEach((control) => {
      const descControl = control
        .get('descripcion')
        ?.value.trim()
        .toLowerCase();
      if (descControl === descripcion) {
        control
          .get('precio_unitario')
          ?.setValue(nuevoPrecio, { emitEvent: false });
        this.actualizarPrecioParcial(control);
      }
    });
  }

  // Método que se llama al cambiar el precio unitario en la UI
  onPrecioUniChange(control: AbstractControl): void {
    control.get('precio_unitario')?.markAsTouched();
    this.actualizarPrecioParcial(control);
    const descripcion = control.get('descripcion')?.value;
    const nuevoPrecio = control.get('precio_unitario')?.value;
    if (!descripcion || nuevoPrecio <= 0) return;

    this.actualizarPrecioPorDescripcionManoDeObra(descripcion, nuevoPrecio);

    const esNuevo = control.get('esNuevo')?.value;
    if (!esNuevo) {
      const id_gasto_operacion = this.id_gasto_operaciones;
      this.servicio
        .actualizarPrecioDescripcionManoDeObra(
          id_gasto_operacion,
          descripcion,
          nuevoPrecio
        )
        .subscribe({
          next: (res) => {
            this.mensajeExito = `Precio actualizado correctamente en ${res.actualizados} registros.`;
          },
          error: () => {
            this.mensajeError =
              'No se pudo actualizar el precio en el backend.';
          },
        });
    }
  }
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    const target = event.target as HTMLElement;

    const listaUnidades = document.querySelectorAll('.unidad-list');
    const listaDescripciones = document.querySelectorAll('.descripcion-list');

    const esDentroUnidad = Array.from(listaUnidades).some((el) =>
      el.contains(target)
    );
    const esDentroDescripcion = Array.from(listaDescripciones).some((el) =>
      el.contains(target)
    );
    const esInputUnidad = target.classList.contains('input-unidad');
    const esInputDescripcion = target.classList.contains('input-descripcion');

    if (!esDentroUnidad && !esInputUnidad) {
      this.mostrarLista = this.mostrarLista.map(() => false);
    }

    if (!esDentroDescripcion && !esInputDescripcion) {
      this.mostrarListaDescripcion = this.mostrarListaDescripcion.map(
        () => false
      );
    }
  }

  getUnidadControl(index: number): FormControl {
    return this.manoObra.at(index).get('unidad') as FormControl;
  }

  // Actualiza el precio unitario en todos los controles con la misma descripción
  private actualizarPrecioPorDescripcionManoDeObra(
    descripcion: string,
    nuevoPrecio: number
  ) {
    descripcion = descripcion.trim().toLowerCase();
    this.manoObra.controls.forEach((control) => {
      const descControl = control
        .get('descripcion')
        ?.value.trim()
        .toLowerCase();
      if (descControl === descripcion) {
        control
          .get('precio_unitario')
          ?.setValue(nuevoPrecio, { emitEvent: false });
        this.actualizarPrecioParcial(control);
      }
    });
  }

  registrarItem(index: number): void {
    const trabajo = this.manoObra.at(index);
    if (trabajo.invalid) {
      trabajo.markAllAsTouched();
      return;
    }

    // Convertir campos críticos a MAYÚSCULAS
    const descripcion = (trabajo.get('descripcion')?.value || '').toUpperCase();
    const unidad = (trabajo.get('unidad')?.value || '').toUpperCase();

    trabajo.get('descripcion')?.setValue(descripcion);
    trabajo.get('unidad')?.setValue(unidad);

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

    // Convertir campos críticos a MAYÚSCULAS
    const descripcion = (trabajo.get('descripcion')?.value || '').toUpperCase();
    const unidad = (trabajo.get('unidad')?.value || '').toUpperCase();

    trabajo.get('descripcion')?.setValue(descripcion);
    trabajo.get('unidad')?.setValue(unidad);

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
    const cantidad = Number(control.get('cantidad')?.value) || 0;
    const precio = Number(control.get('precio_unitario')?.value) || 0;

    const descripcion = (control.get('descripcion')?.value || '').toUpperCase();
    const unidad = (control.get('unidad')?.value || '').toUpperCase();

    return {
      id: control.get('id')?.value ?? 0,
      id_gasto_operacion: this.id_gasto_operaciones,
      descripcion,
      unidad,
      cantidad,
      precio_unitario: precio,
      total: cantidad * precio,
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

  onUnidadChange(control: AbstractControl): void {
    control.get('unidad')?.markAsTouched();
  }

  blockE(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  }
}
