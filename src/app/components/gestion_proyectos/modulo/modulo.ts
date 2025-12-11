import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  HostListener,
} from '@angular/core';
import { ServiciosService } from '../../../services/servicios.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modulo } from '../../../models/models';

// @ts-ignore
import Typo from 'typo-js';
import { ConfirmacionComponent } from '../../mensajes/confirmacion/confirmacion/confirmacion.component';
import { ErrorComponent } from '../../mensajes/error/error.component';
import { OkComponent } from '../../mensajes/ok/ok.component';
interface ModuloItem {
  tipo: 'modulo' | 'modulo_registrado';
  codigo?: string;
  nombre?: string;
  id?: number;
  esNuevo?: boolean;
  editar?: boolean;
  tieneErrores?: boolean;
  sugerencias?: string[];
}

@Component({
  selector: 'app-modulo',
  imports: [
    CommonModule,
    FormsModule,
    ConfirmacionComponent,
    ErrorComponent,
    OkComponent,
  ],
  templateUrl: './modulo.html',
  styleUrl: './modulo.css',
})
export class ModuloComponent implements OnInit, OnChanges {
  modulos: Modulo[] = [];
  items: ModuloItem[] = [];
  @Input() identificadorGeneral: number = 0;
  usuario_id = 0;
  private ultimoIdCargado: number = 0;
  private corrector: Typo;
  mostrarMenuContextual = false;
  menuX = 0;
  menuY = 0;
  itemSeleccionado: ModuloItem | null = null; // Item seleccionado para edición o sugerencias
  nuevoModulo: ModuloItem = {
    tipo: 'modulo',
    tieneErrores: false,
    sugerencias: [],
  }; // Para el modal de agregar

  mostrarDropdownModulos: boolean = false;

  mostrarConfirmacion = false;
  mensajeConfirmacion = '';
  mostrarError = false;
  mensajeError = '';
  mostrarOk = false;
  mensajeOk = '';
  constructor(private servicios: ServiciosService) {
    this.corrector = new Typo('es_ES', null, null, {
      dictionaryPath: 'assets/dictionaries/',
      asyncLoad: true,
    });
  }

  ngOnInit(): void {
    if (this.identificadorGeneral > 0) {
      this.cargarModulos(this.identificadorGeneral);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const idActual = this.identificadorGeneral;
    if (idActual !== this.ultimoIdCargado) {
      if (idActual > 0) {
        this.cargarModulos(idActual);
      } else {
        this.modulos = [];
        this.items = [];
        this.ultimoIdCargado = 0;
      }
    }
  }

  cargarModulos(idGeneral: number): void {
    if (!idGeneral || idGeneral === this.ultimoIdCargado) return;
    this.ultimoIdCargado = idGeneral;
    this.servicios.getModulosPorProyecto(idGeneral).subscribe({
      next: (modulos: Modulo[]) => {
        this.modulos = modulos;
        this.items = modulos.map((mod: Modulo) => ({
          id: mod.id,
          tipo: 'modulo_registrado',
          codigo: mod.codigo,
          nombre: mod.nombre,
          esNuevo: false,
          editar: false,
          tieneErrores: false,
          sugerencias: [],
        }));
      },
      error: (err) => {
        console.error('Error al cargar módulos:', err);
      },
    });
  }

  seleccionarItem(item: ModuloItem, index: number): void {
    this.itemSeleccionado = item;
  }

  activarEdicionItem(index: number, event?: Event): void {
    if (event) event.stopPropagation();
    const item = this.items[index];
    if (!item) return;
    // Cancelar edición de otros
    this.items.forEach((it, idx) => {
      if (idx !== index) it.editar = false;
    });
    // Activar edición en este item
    item.editar = true;
    // Guardar backup
    (item as any)._backup = { codigo: item.codigo, nombre: item.nombre };
  }

  guardarItem(index: number, event?: Event): void {
    if (event) event.stopPropagation();
    const item = this.items[index];
    if (!item) return;
    // Validaciones básicas
    if (!item.codigo?.trim() || !item.nombre?.trim()) {
      this.mensajeError = 'Código y nombre del módulo son obligatorios.';
      this.mostrarError = true;
      return;
    }
    if (item.tipo === 'modulo_registrado') {
      this.actualizarModuloRegistrado(index);
    } else {
      this.registrarModulo(index);
    }
  }

  cancelarEdicionItem(index: number, event?: Event): void {
    if (event) event.stopPropagation();
    const item = this.items[index];
    if (!item) return;
    // Si es nuevo, quitarlo
    if (item.esNuevo || item.tipo === 'modulo') {
      this.items.splice(index, 1);
      if (this.itemSeleccionado === item) {
        this.itemSeleccionado = null;
      }
      return;
    }
    // Restaurar valores
    const backup = (item as any)._backup;
    if (backup) {
      item.codigo = backup.codigo;
      item.nombre = backup.nombre;
      delete (item as any)._backup;
    } else {
      const original = this.modulos.find((m) => m.id === item.id);
      if (original) {
        item.codigo = original.codigo;
        item.nombre = original.nombre;
      }
    }
    item.editar = false;
    item.tieneErrores = false;
    item.sugerencias = [];
    if (this.itemSeleccionado === item) {
      this.itemSeleccionado.editar = false;
    }
  }

  agregarModulo(): void {
    if (!this.identificadorGeneral) {
      alert('Selecciona un proyecto primero.');
      return;
    }
    this.nuevoModulo = {
      tipo: 'modulo',
      codigo: '',
      nombre: '',
      tieneErrores: false,
      sugerencias: [],
    };
  }

  registrarModuloTemporal(): void {
    if (!this.nuevoModulo.codigo?.trim() || !this.nuevoModulo.nombre?.trim()) {
      this.mensajeError = 'Código y nombre del módulo son obligatorios.';
      this.mostrarError = true;
      return;
    }
    const payload: Partial<Modulo> = {
      proyecto: this.identificadorGeneral,
      codigo: this.nuevoModulo.codigo.trim(),
      nombre: this.nuevoModulo.nombre.trim(),
    };
    this.servicios.createModulo(payload).subscribe({
      next: (moduloCreado: Modulo) => {
        this.mensajeOk = 'Módulo registrado correctamente.';
        this.mostrarOk = true;
        this.modulos.push(moduloCreado);
        this.items.push({
          id: moduloCreado.id,
          tipo: 'modulo_registrado',
          codigo: moduloCreado.codigo,
          nombre: moduloCreado.nombre,
          esNuevo: false,
          editar: false,
          tieneErrores: false,
          sugerencias: [],
        });
        this.cancelarAgregar();
      },
      error: (err) => {
        this.mensajeError =
          'Error al registrar módulo: ' +
          (err.error?.error || 'Verifica los datos.');
        this.mostrarError = true;
      },
    });
  }

  registrarModulo(index: number): void {
    const item = this.items[index];
    if (!this.identificadorGeneral) {
      this.mensajeError = 'Selecciona un proyecto primero.';
      this.mostrarError = true;
      return;
    }
    if (!item.codigo?.trim() || !item.nombre?.trim()) {
      this.mensajeError = 'Código y nombre del módulo son obligatorios.';
      this.mostrarError = true;
      return;
    }
    const payload: Partial<Modulo> = {
      proyecto: this.identificadorGeneral,
      codigo: item.codigo.trim(),
      nombre: item.nombre!.trim(),
    };
    this.servicios.createModulo(payload).subscribe({
      next: (moduloCreado: Modulo) => {
        this.mensajeOk = 'Módulo registrado correctamente.';
        this.mostrarOk = true;
        this.items[index] = {
          ...item,
          id: moduloCreado.id,
          tipo: 'modulo_registrado',
          esNuevo: false,
          editar: false,
          tieneErrores: false,
          sugerencias: [],
        };
        this.modulos.push(moduloCreado);
      },
      error: (err) => {
        this.mensajeError =
          'Error al registrar módulo: ' +
          (err.error?.error || 'Verifica los datos.');
        this.mostrarError = true;
      },
    });
  }

  actualizarModuloRegistrado(index: number): void {
    const item = this.items[index];
    if (item.tipo !== 'modulo_registrado' || !item.editar) return;
    if (!item.codigo?.trim() || !item.nombre?.trim()) {
      this.mensajeError = 'Código y nombre del módulo son obligatorios.';
      this.mostrarError = true;
      item.editar = false;
      return;
    }
    const payload: Partial<Modulo> = {
      codigo: item.codigo.trim(),
      nombre: item.nombre!.trim(),
    };
    this.servicios.updateModulo(item.id!, payload).subscribe({
      next: (moduloActualizado: Modulo) => {
        item.editar = false;
        item.tieneErrores = false;
        item.sugerencias = [];
        this.modulos = this.modulos.map((m: Modulo) =>
          m.id === item.id ? moduloActualizado : m
        );
        this.mensajeOk = 'Módulo actualizado correctamente.';
        this.mostrarOk = true;
      },
      error: (err) => {
        this.mensajeError =
          'Error al actualizar módulo: ' +
          (err.error?.error || 'Intente de nuevo.');
        this.mostrarError = true;
        item.editar = false;
      },
    });
  }

  cancelarAgregar(): void {
    this.nuevoModulo = { tipo: 'modulo', tieneErrores: false, sugerencias: [] };
  }

  eliminarModulo(index: number, event?: Event): void {
    if (event) event.stopPropagation();
    const item = this.items[index];
    if (item.tipo !== 'modulo_registrado') return;
    this.mensajeConfirmacion = `¿Eliminar módulo "${item.nombre}"? Los gastos se desasociarán.`;
    this.accionPendiente = () => {
      this.servicios.deleteModulo(item.id!).subscribe({
        next: () => {
          this.modulos = this.modulos.filter((m: Modulo) => m.id !== item.id);
          this.items.splice(index, 1);
          this.mensajeOk = 'Módulo eliminado correctamente.';
          this.mostrarOk = true;
        },
        error: (err) => {
          this.mensajeError =
            'Error al eliminar módulo: ' +
            (err.error?.error || 'Intente de nuevo.');
          this.mostrarError = true;
        },
      });
    };
    this.mostrarConfirmacion = true;
  }

  filtrarCodigoInput(event: Event, item: ModuloItem): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;
    valor = valor.replace(/[^a-zA-Z0-9]/g, '');
    input.value = valor;
    item.codigo = valor;
  }

  filtrarNombreInput(event: Event, item: ModuloItem): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;
    // Convertir a mayúsculas automáticamente al escribir
    valor = valor.toUpperCase();
    valor = valor.replace(/[^A-Z0-9ÁÉÍÓÚÑ\s]/g, ''); // Solo mayúsculas, números, acentos y espacios
    valor = valor.replace(/\s{2,}/g, ' ');
    input.value = valor;
    item.nombre = valor;

    // Verificar ortografía y corregir automáticamente si hay una sugerencia única
    this.verificarYCorregirOrtografia(item);
  }

  private verificarYCorregirOrtografia(item: ModuloItem): void {
    if (!item.nombre) {
      item.tieneErrores = false;
      item.sugerencias = [];
      return;
    }
    const palabras = item.nombre.split(' ');
    let errores = false;
    const sugerencias: string[] = [];
    const palabrasCorregidas: string[] = [];

    palabras.forEach((palabra) => {
      const palabraMinuscula = palabra.toLowerCase(); // Chequear en minúscula para evitar falsos positivos por mayúsculas
      if (!this.corrector.check(palabraMinuscula)) {
        const sugs = this.corrector.suggest(palabraMinuscula);
        if (sugs.length === 1) {
          // ✅ Corrección automática si hay una sugerencia única
          palabrasCorregidas.push(sugs[0].toUpperCase());
        } else if (sugs.length > 1) {
          errores = true;
          sugerencias.push(...sugs.slice(0, 3));
          palabrasCorregidas.push(palabra); // Mantener original si múltiples sugerencias
        } else {
          palabrasCorregidas.push(palabra); // Sin sugerencias, mantener
        }
      } else {
        palabrasCorregidas.push(palabra); // Bien escrita
      }
    });

    // Aplicar correcciones automáticas
    item.nombre = palabrasCorregidas.join(' ');
    item.tieneErrores = errores;
    item.sugerencias = [...new Set(sugerencias)];
  }

  // Menú contextual al clic derecho (solo si hay errores y múltiples sugerencias)
  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent): void {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    if (
      target.tagName === 'INPUT' &&
      target.placeholder === 'Nombre del módulo'
    ) {
      const item =
        this.items.find((i) => i.nombre === target.value) || this.nuevoModulo;
      if (item && item.tieneErrores && item.sugerencias!.length > 1) {
        // Solo si múltiples sugerencias
        this.mostrarMenuContextual = true;
        this.menuX = event.clientX;
        this.menuY = event.clientY;
        this.itemSeleccionado = item;
      }
    }
  }

  aplicarSugerencia(sugerencia: string): void {
    if (this.itemSeleccionado) {
      this.itemSeleccionado.nombre = sugerencia.toUpperCase();
      this.verificarYCorregirOrtografia(this.itemSeleccionado);
    }
    this.cerrarMenu();
  }

  cerrarMenu(): void {
    this.mostrarMenuContextual = false;
    this.itemSeleccionado = null;
  }
  @HostListener('document:click', ['$event'])
  cerrarDropdown(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.position-relative')) {
      this.mostrarDropdownModulos = false;
    }
  }
  // Métodos para manejar eventos de los modales
  onAceptarConfirmacion() {
    this.mostrarConfirmacion = false;
    // Lógica específica después de aceptar (se define en el método que lo llama)
    if (this.accionPendiente) {
      this.accionPendiente();
      this.accionPendiente = null;
    }
  }
  onCancelarConfirmacion() {
    this.mostrarConfirmacion = false;
    this.accionPendiente = null;
  }
  onCerrarError() {
    this.mostrarError = false;
  }
  onCerrarOk() {
    this.mostrarOk = false;
  }
  // Propiedad para almacenar la acción pendiente (para confirmaciones)
  private accionPendiente: (() => void) | null = null;
}
