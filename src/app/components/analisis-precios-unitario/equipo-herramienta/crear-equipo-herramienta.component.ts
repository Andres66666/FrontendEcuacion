import { Component, HostListener, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ReactiveFormsModule,
  FormsModule,
  FormControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ServiciosService } from '../../../services/servicios.service';
import { EquipoHerramienta } from '../../../models/models';
import { ConfirmacionComponent } from '../../mensajes/confirmacion/confirmacion/confirmacion.component';
import { OkComponent } from '../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../mensajes/error/error.component';

@Component({
  selector: 'app-crear-equipo-herramienta',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ConfirmacionComponent,
    OkComponent,
    ErrorComponent,
  ],
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

  // Mensajes y estado UI
  mostrarConfirmacion = false;
  tipoConfirmacion: 'item' | null = null;
  itemIndexAEliminar: number | null = null;
  mensajeConfirmacion = '';
  mensajeExito = '';
  mensajeError = '';

  // Para UNIDAD (replicado)
  unidadesUsadas: string[] = [];
  unidadesFiltradas: string[][] = [];
  mostrarLista: boolean[] = [];

  // Para DESCRIPCIÓN (replicado)
  descripcionesUsadas: string[] = []; // lista global de descripciones
  descripcionesFiltradas: string[][] = []; // filtrado por fila
  mostrarListaDescripcion: boolean[] = []; // mostrar lista por fila

  // Para DESCRIPCIÓN y PRECIO UNITARIO (catálogo para auto-rellenar precio)
  catalogoEquipos: { descripcion: string; ultimo_precio: number }[] = [];

  // UI expandida (replicado de materiales; agrega 'formatoInvalido' y tipoConfirmacion más amplio si no existe)
  formatoInvalido = false;

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
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      this.herramientas = Number(params['herramientas']) || 0;
      this.porcentaje_global_100 = Number(params['porcentaje_global_100']) || 0;

      this.formulario.get('herramientas')?.setValue(this.herramientas);

      if (this.id_gasto_operaciones) this.cargarEquipoHerramientaExistente();
    });

    this.servicio.totalManoObra$.subscribe(
      (total) => (this.totalManoObra = total)
    );

    // Carga unidades específicas de equipo/herramienta (modificado arriba)
    this.cargarUnidades();

    // Carga catálogo (ya corregido en mensajes previos)
    this.cargarCatalogoEquipos();
  }

  agregarEquipo(): void {
    this.equipos.push(this.crearEquipoForm());
    this.unidadesFiltradas.push([...this.unidadesUsadas]);
    this.mostrarLista.push(false);

    this.descripcionesFiltradas.push([...this.descripcionesUsadas]);
    this.mostrarListaDescripcion.push(false);
  }

  formatearNumero(valor: number): string {
    // Solo para mostrar: redondea visualmente, no modifica el valor original
    const redondeado = Math.round(valor * 100) / 100; // redondeo final
    let partes = redondeado.toFixed(2).split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return partes.join(',');
  }

  // 🔹 Helpers
  get equipos(): FormArray {
    return this.formulario.get('equipos') as FormArray;
  }

  get subtotalEquipos(): number {
    return this.equipos.controls.reduce((acc, control) => {
      const cantidad = control.get('cantidad')?.value || 0;
      const precio = control.get('precio_unitario')?.value || 0;
      return acc + cantidad * precio; // sin redondeo
    }, 0);
  }

  get herramientasPorcentaje(): number {
    return (
      this.totalManoObra * (this.herramientas / this.porcentaje_global_100)
    );
  }

  get totalEquipos(): number {
    const total = this.subtotalEquipos + this.herramientasPorcentaje;
    this.servicio.setTotalEquipos(total);
    return total;
  }
  // 🔹 CRUD Equipos
  private crearEquipoForm(
    equipo?: EquipoHerramienta,
    esNuevo = true
  ): FormGroup {
    return this.fb.group({
      id: [equipo?.id ?? null],
      descripcion: [equipo?.descripcion ?? '', Validators.required],
      unidad: [equipo?.unidad ?? '', Validators.required],
      cantidad: [
        equipo?.cantidad ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      precio_unitario: [
        equipo?.precio_unitario ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      total: [{ value: equipo?.total ?? 0, disabled: true }],
      esNuevo: [esNuevo],
      editarUnidad: [esNuevo],
    });
  }

  cargarEquipoHerramientaExistente(): void {
    this.servicio
      .getEquipoHerramientas(this.id_gasto_operaciones)
      .subscribe((equipos) => {
        this.equipos.clear();
        this.unidadesFiltradas = [];
        this.mostrarLista = [];
        this.descripcionesFiltradas = [];
        this.mostrarListaDescripcion = [];

        equipos.forEach((equipo) => {
          this.equipos.push(this.crearEquipoForm(equipo, false));
          this.agregarUnidadSiNoExiste(equipo.unidad);
          this.agregarDescripcionSiNoExiste(equipo.descripcion);

          this.unidadesFiltradas.push([...this.unidadesUsadas]);
          this.mostrarLista.push(false);

          this.descripcionesFiltradas.push([...this.descripcionesUsadas]);
          this.mostrarListaDescripcion.push(false);
        });
      });
  }
  cargarUnidades(): void {
    this.servicio.getUnidadesEquipoHerramienta().subscribe({
      next: (res: string[]) => {
        this.unidadesUsadas = res || []; // Carga solo unidades únicas de la tabla EquipoHerramienta
      },
      error: (err: any) => {
        console.error('Error cargando unidades de equipo/herramienta:', err);
      },
    });
  }

  private cargarCatalogoEquipos(): void {
    this.servicio.getEquiposHerramientas().subscribe({
      next: (equipos: EquipoHerramienta[]) => {
        this.catalogoEquipos = equipos.map((e: EquipoHerramienta) => ({
          descripcion: e.descripcion.trim(),
          ultimo_precio: e.precio_unitario,
        }));
        this.descripcionesUsadas = [
          ...new Set(
            equipos.map((e: EquipoHerramienta) => e.descripcion.trim())
          ),
        ];
      },
      error: (err: any) => {
        console.error('Error cargando catálogo de equipos:', err);
      },
    });
  }

  getDescripcionControl(index: number): FormControl {
    return this.equipos.at(index).get('descripcion') as FormControl;
  }

  getUnidadControl(index: number): FormControl {
    return this.equipos.at(index).get('unidad') as FormControl;
  }
  private agregarDescripcionSiNoExiste(descripcion: string) {
    const normalizado = descripcion.trim();
    if (normalizado && !this.descripcionesUsadas.includes(normalizado)) {
      this.descripcionesUsadas.push(normalizado);
    }
  }

  private agregarUnidadSiNoExiste(unidad: string) {
    const normalizado = unidad.trim();
    if (normalizado && !this.unidadesUsadas.includes(normalizado)) {
      this.unidadesUsadas.push(normalizado);
    }
  }
  private actualizarTotalGlobal() {
    const total = this.totalEquipos;
    this.servicio.setTotalEquipos(total);
  }
  private actualizarPrecioPorDescripcion(
    descripcion: string,
    nuevoPrecio: number
  ) {
    descripcion = descripcion.trim().toLowerCase();
    this.equipos.controls.forEach((control) => {
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
  // Filtrar mientras escribe
  filtrarDescripciones(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;
    valor = valor.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '');
    valor = valor.replace(/\s{2,}/g, ' ');
    input.value = valor;
    this.equipos.at(index).get('descripcion')?.setValue(valor);
    this.descripcionesFiltradas[index] = this.descripcionesUsadas.filter((d) =>
      d.toLowerCase().includes(valor.toLowerCase())
    );
  }

  // Mostrar todas las descripciones al enfocar
  mostrarTodasDescripciones(index: number): void {
    this.descripcionesFiltradas[index] = [...this.descripcionesUsadas];
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
    const control = this.equipos.at(i);
    control.get('descripcion')?.setValue(descripcion);

    // Buscar el último precio en el catálogo (integra con PRECIO UNITARIO)
    const equipo = this.catalogoEquipos.find(
      (e) => e.descripcion === descripcion
    );
    if (equipo) {
      control.get('precio_unitario')?.setValue(equipo.ultimo_precio);
    }

    this.mostrarListaDescripcion[i] = false;
  }

  // Guardar nueva descripción al perder focus
  guardarDescripcionPersonalizada(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = input.value.trim();

    if (valor) {
      this.equipos.at(index).get('descripcion')?.setValue(valor);
      this.agregarDescripcionSiNoExiste(valor);
    } else {
      this.equipos.at(index).get('descripcion')?.setValue('');
    }
  }
  onUnidadChange(index: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const valor = select.value;

    if (valor !== '__custom__') {
      this.equipos.at(index).get('unidad')?.setValue(valor);
    }
  }

  // Filtrar mientras escribe

  filtrarUnidades(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;
    valor = valor.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '');
    valor = valor.replace(/\s{2,}/g, ' ');
    input.value = valor;
    this.equipos.at(index).get('unidad')?.setValue(valor);
    this.unidadesFiltradas[index] = this.unidadesUsadas.filter((u) =>
      u.toLowerCase().includes(valor.toLowerCase())
    );
  }
  // Mostrar todas las unidades al enfocar
  mostrarTodasUnidades(index: number): void {
    this.unidadesFiltradas[index] = [...this.unidadesUsadas];
  }

  // Mostrar unidades al hacer focus en la fila
  mostrarUnidadesFila(index: number): void {
    this.mostrarLista = this.mostrarLista.map(() => false);
    this.mostrarLista[index] = true;
    this.unidadesFiltradas[index] = [...this.unidadesUsadas];
  }

  // Seleccionar unidad de la lista
  seleccionarUnidad(index: number, unidad: string): void {
    this.equipos.at(index).get('unidad')?.setValue(unidad);
    this.mostrarLista[index] = false;
  }

  // Guardar nueva unidad al perder focus
  guardarUnidadPersonalizada(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = input.value.trim();

    if (valor) {
      this.equipos.at(index).get('unidad')?.setValue(valor);
      this.agregarUnidadSiNoExiste(valor);
    } else {
      this.equipos.at(index).get('unidad')?.setValue('');
    }
  }

  registrarItem(index: number): void {
    const equipo = this.equipos.at(index);
    if (equipo.invalid) {
      equipo.markAllAsTouched();
      return;
    }

    // Convertir campos críticos a MAYÚSCULAS
    const descripcion = (equipo.get('descripcion')?.value || '').toUpperCase();
    const unidad = (equipo.get('unidad')?.value || '').toUpperCase();

    equipo.get('descripcion')?.setValue(descripcion);
    equipo.get('unidad')?.setValue(unidad);

    const nuevoEquipo: EquipoHerramienta = this.crearEquipoDesdeForm(equipo);
    this.servicio.createEquipoHerramienta(nuevoEquipo).subscribe({
      next: (res: EquipoHerramienta) => {
        equipo.patchValue({ id: res.id, esNuevo: false });
        if (res.total) {
          equipo.patchValue({ total: res.total });
        } else {
          this.actualizarPrecioParcial(equipo);
        }
        this.actualizarTotalGlobal();
        this.mensajeExito = 'Equipo/herramienta registrado exitosamente.';

        this.agregarUnidadSiNoExiste(res.unidad);
      },
      error: (err: any) => {
        this.mensajeError = 'Error al registrar equipo/herramienta.';
      },
    });
  }

  actualizarItem(index: number): void {
    const equipo = this.equipos.at(index);
    if (equipo.invalid || !equipo.get('id')?.value) return;

    // Convertir campos críticos a MAYÚSCULAS
    const descripcion = (equipo.get('descripcion')?.value || '').toUpperCase();
    const unidad = (equipo.get('unidad')?.value || '').toUpperCase();

    equipo.get('descripcion')?.setValue(descripcion);
    equipo.get('unidad')?.setValue(unidad);

    const equipoActualizado = this.crearEquipoDesdeForm(equipo);
    this.servicio.updateEquipoHerramienta(equipoActualizado).subscribe({
      next: (res: EquipoHerramienta) => {
        equipo.patchValue({ total: equipoActualizado.total });
        this.actualizarTotalGlobal();
        this.mensajeExito = 'Equipo/herramienta actualizado correctamente.';

        this.agregarUnidadSiNoExiste(equipoActualizado.unidad);
      },
      error: (err: any) => {
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

  manejarAceptar(): void {
    if (this.tipoConfirmacion === 'item' && this.itemIndexAEliminar !== null) {
      const equipo = this.equipos.at(this.itemIndexAEliminar);
      if (equipo.get('esNuevo')?.value) {
        this.equipos.removeAt(this.itemIndexAEliminar);
        this.mensajeExito = 'Ítem eliminado exitosamente.';
      } else {
        this.servicio
          .deleteEquipoHerramienta(equipo.get('id')?.value)
          .subscribe({
            next: () => {
              this.equipos.removeAt(this.itemIndexAEliminar!);
              this.mensajeExito = 'Ítem eliminado exitosamente.';
            },
            error: (err: any) => {
              // Tipado explícito
              this.mensajeError = 'Error al eliminar el equipo/herramienta.';
            },
          });
      }
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

  onPrecioUniChange(control: AbstractControl, index: number): void {
    const descripcion = control.get('descripcion')?.value;
    const nuevoPrecio = control.get('precio_unitario')?.value;

    if (!descripcion || nuevoPrecio <= 0) return;

    // Actualiza solo el frontend (otras filas con misma descripción)
    this.actualizarPrecioPorDescripcion(descripcion, nuevoPrecio);

    // Solo actualizar en backend si el ítem ya existe
    const equipoId = control.get('id')?.value;
    if (equipoId) {
      this.servicio
        .actualizarPrecioDescripcionEquipoHerramienta(
          // Cambiado: método correcto del servicio
          this.id_gasto_operaciones,
          descripcion,
          nuevoPrecio
        )
        .subscribe({
          next: (res: any) => {
            // Tipado explícito
            this.mensajeExito = `Precio actualizado correctamente en ${res.actualizados} registros.`;
          },
          error: (err: any) => {
            // Tipado explícito
            this.mensajeError =
              'No se pudo actualizar el precio en el backend.';
          },
        });
    }

    // Siempre actualizar parcial local
    this.actualizarPrecioParcial(control);
  }

  blockE(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  }
}
