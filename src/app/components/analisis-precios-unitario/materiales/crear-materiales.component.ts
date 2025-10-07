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
import { ConfirmacionComponent } from '../../mensajes/confirmacion/confirmacion/confirmacion.component';
import { OkComponent } from '../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../mensajes/error/error.component';
import { FormControl } from '@angular/forms';
import { Component, OnInit, HostListener } from '@angular/core';

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
  unidadesUsadas: string[] = [];

  
  // ✅ Mensajes y estado UI
  formatoInvalido = false;
  mostrarConfirmacion = false;
  tipoConfirmacion: 'proyecto' | 'item' | null = null;
  itemIndexAEliminar: number | null = null;
  mensajeConfirmacion = '';
  mensajeExito = '';
  mensajeError = '';

  // Inicializa filtrado por fila
  unidadesFiltradas: string[][] = [];
  // Mostrar la lista solo de la fila activa
  mostrarLista: boolean[] = [];

  descripcionesUsadas: string[] = []; // lista global de descripciones
  descripcionesFiltradas: string[][] = []; // filtrado por fila
  mostrarListaDescripcion: boolean[] = []; // mostrar lista por fila

  catalogoMateriales: { descripcion: string; ultimo_precio: number }[] = [];

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
    this.cargarUnidades();
    this.cargarCatalogoMateriales(); 
  }
  getUnidadControl(index: number): FormControl {
    return this.materiales.at(index).get('unidad') as FormControl;
  }
  cargarUnidades(): void {
    this.servicio.getUnidadesMateriales().subscribe({
      next: (res) => {
        this.unidadesUsadas = res || [];
      },
      error: (err) => {
        console.error("Error cargando unidades:", err);
      },
    });
  }
  private cargarCatalogoMateriales(): void {
    this.servicio.getMateriales().subscribe({
      next: (materiales) => {
        this.catalogoMateriales = materiales.map(m => ({
          descripcion: m.descripcion.trim(),
          ultimo_precio: m.precio_unitario
        }));
        this.descripcionesUsadas = [...new Set(materiales.map(m => m.descripcion.trim()))];
      },
      error: (err) => {
        console.error("Error cargando catálogo de materiales:", err);
      }
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
  this.unidadesFiltradas.push([...this.unidadesUsadas]);
  this.mostrarLista.push(false);

  this.descripcionesFiltradas.push([...this.descripcionesUsadas]);
  this.mostrarListaDescripcion.push(false);
}
cargarMaterialesExistentes(): void {
  this.servicio.getMaterialesIDGasto(this.id_gasto_operaciones).subscribe((materiales) => {
    this.materiales.clear();
    this.unidadesFiltradas = [];
    this.mostrarLista = [];
    this.descripcionesFiltradas = [];
    this.mostrarListaDescripcion = [];

    materiales.forEach((mat) => {
      this.materiales.push(this.crearMaterialForm(mat, false));
      this.agregarUnidadSiNoExiste(mat.unidad);
      this.agregarDescripcionSiNoExiste(mat.descripcion);

      this.unidadesFiltradas.push([...this.unidadesUsadas]);
      this.mostrarLista.push(false);

      this.descripcionesFiltradas.push([...this.descripcionesUsadas]);
      this.mostrarListaDescripcion.push(false);
    });
  });
}
getDescripcionControl(index: number): FormControl {
  return this.materiales.at(index).get('descripcion') as FormControl;
}
// Agregar descripción si no existe
private agregarDescripcionSiNoExiste(descripcion: string) {
  const normalizado = descripcion.trim();
  if (normalizado && !this.descripcionesUsadas.includes(normalizado)) {
    this.descripcionesUsadas.push(normalizado);
  }
}

// Filtrar mientras escribe
filtrarDescripciones(index: number, event: Event): void {
  const valor = (event.target as HTMLInputElement).value.toLowerCase();
  this.descripcionesFiltradas[index] = this.descripcionesUsadas.filter(d =>
    d.toLowerCase().includes(valor)
  );
  this.materiales.at(index).get('descripcion')?.setValue((event.target as HTMLInputElement).value);
}

// Mostrar todas las descripciones al enfocar
mostrarTodasDescripciones(index: number): void {
  this.descripcionesFiltradas[index] = [...this.descripcionesUsadas];
}

// Mostrar descripciones al hacer focus en la fila
mostrarDescripcionesFila(index: number): void {
  this.mostrarListaDescripcion = this.mostrarListaDescripcion.map(() => false);
  this.mostrarListaDescripcion[index] = true;
  this.descripcionesFiltradas[index] = [...this.descripcionesUsadas];
}

seleccionarDescripcion(i: number, descripcion: string) {
  const control = this.materiales.at(i);
  control.get("descripcion")?.setValue(descripcion);

  // Buscar el último precio en el catálogo
  const material = this.catalogoMateriales.find(m => m.descripcion === descripcion);
  if (material) {
    control.get("precio_unitario")?.setValue(material.ultimo_precio);
  }

  this.mostrarListaDescripcion[i] = false;
}

// Guardar nueva descripción al perder focus
guardarDescripcionPersonalizada(index: number, event: Event): void {
  const input = event.target as HTMLInputElement;
  const valor = input.value.trim();

  if (valor) {
    this.materiales.at(index).get('descripcion')?.setValue(valor);
    this.agregarDescripcionSiNoExiste(valor);
  } else {
    this.materiales.at(index).get('descripcion')?.setValue('');
  }
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
      this.mensajeExito = 'Material registrado exitosamente.';

      this.agregarUnidadSiNoExiste(res.unidad);
    },
    error: () => {
      this.mensajeError = 'Error al registrar material.';
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
      this.mensajeExito = 'Material actualizado correctamente.';

      this.agregarUnidadSiNoExiste(materialActualizado.unidad);
    },
    error: () => {
      this.mensajeError = 'Error al actualizar material.';
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
private actualizarPrecioPorDescripcion(descripcion: string, nuevoPrecio: number) {
  descripcion = descripcion.trim().toLowerCase();
  this.materiales.controls.forEach(control => {
    const descControl = control.get('descripcion')?.value.trim().toLowerCase();
    if (descControl === descripcion) {
      control.get('precio_unitario')?.setValue(nuevoPrecio, { emitEvent: false });
      this.actualizarPrecioParcial(control);
    }
  });
}

// Agregar unidad si no existe
// Agregar unidad si no existe en la lista global
private agregarUnidadSiNoExiste(unidad: string) {
  const normalizado = unidad.trim();
  if (normalizado && !this.unidadesUsadas.includes(normalizado)) {
    this.unidadesUsadas.push(normalizado);
  }
}

onUnidadChange(index: number, event: Event): void {
  const select = event.target as HTMLSelectElement;
  const valor = select.value;

  if (valor !== '__custom__') {
    this.materiales.at(index).get('unidad')?.setValue(valor);
  }
}



// Filtrar mientras escribe
filtrarUnidades(index: number, event: Event): void {
  const valor = (event.target as HTMLInputElement).value.toLowerCase();
  this.unidadesFiltradas[index] = this.unidadesUsadas.filter(u =>
    u.toLowerCase().includes(valor)
  );
  this.materiales.at(index).get('unidad')?.setValue((event.target as HTMLInputElement).value);
}

// Mostrar todas las unidades al enfocar
mostrarTodasUnidades(index: number): void {
  this.unidadesFiltradas[index] = [...this.unidadesUsadas];
}
// Seleccionar unidad de la lista
// Mostrar la lista solo de la fila activa
// Mostrar unidades al hacer focus en la fila
mostrarUnidadesFila(index: number): void {
  this.mostrarLista = this.mostrarLista.map(() => false); // Oculta otras listas
  this.mostrarLista[index] = true;
  this.unidadesFiltradas[index] = [...this.unidadesUsadas]; // Muestra todas
}

// Seleccionar unidad de la lista
seleccionarUnidad(index: number, unidad: string): void {
  this.materiales.at(index).get('unidad')?.setValue(unidad); // ✅ actualiza formControl
  this.mostrarLista[index] = false;
}
// Guardar nueva unidad al perder focus

// Guardar nueva unidad
// Guardar nueva unidad al perder focus
guardarUnidadPersonalizada(index: number, event: Event): void {
  const input = event.target as HTMLInputElement;
  const valor = input.value.trim();

  if (valor) {
    this.materiales.at(index).get('unidad')?.setValue(valor);
    this.agregarUnidadSiNoExiste(valor);
  } else {
    this.materiales.at(index).get('unidad')?.setValue('');
  }
}
@HostListener('document:click', ['$event'])
handleClickOutside(event: Event) {
  const target = event.target as HTMLElement;

  // Recorremos todos los inputs y listas de unidades/descripciones
  const listaUnidades = document.querySelectorAll('.unidad-list');
  const listaDescripciones = document.querySelectorAll('.descripcion-list');

  const esDentroUnidad = Array.from(listaUnidades).some(el => el.contains(target));
  const esDentroDescripcion = Array.from(listaDescripciones).some(el => el.contains(target));
  const esInputUnidad = target.classList.contains('input-unidad');
  const esInputDescripcion = target.classList.contains('input-descripcion');

  if (!esDentroUnidad && !esInputUnidad) {
    this.mostrarLista = this.mostrarLista.map(() => false);
  }

  if (!esDentroDescripcion && !esInputDescripcion) {
    this.mostrarListaDescripcion = this.mostrarListaDescripcion.map(() => false);
  }
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
  onPrecioUniChange(control: AbstractControl, index: number): void {
    const descripcion = control.get('descripcion')?.value;
    const nuevoPrecio = control.get('precio_unitario')?.value;

    if (!descripcion || nuevoPrecio <= 0) return;

    // Actualiza solo el frontend
    this.actualizarPrecioPorDescripcion(descripcion, nuevoPrecio);

    // Solo actualizar en backend si el material ya existe
    const materialId = control.get('id')?.value;
    if (materialId) {
      this.servicio.actualizarPrecioDescripcion(
        this.id_gasto_operaciones,
        descripcion,
        nuevoPrecio
      ).subscribe({
        next: (res) => {
          this.mensajeExito = `Precio actualizado correctamente en ${res.actualizados} registros.`;
        },
        error: () => {
          this.mensajeError = "No se pudo actualizar el precio en el backend.";
        }
      });
    }
  }

  blockE(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  }
}
