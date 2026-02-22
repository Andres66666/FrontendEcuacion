import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Modulo } from '../models/modelosProyectos';
import { ServiciosProyectos } from '../service/servicios-proyectos';

import { ConfirmacionComponent } from '../../mensajes/confirmacion/confirmacion/confirmacion.component';
import { OkComponent } from '../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../mensajes/error/error.component';
import { Advertencia } from '../../mensajes/advertencia/advertencia';

@Component({
  selector: 'app-modulo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmacionComponent,
    OkComponent,
    ErrorComponent,
    Advertencia,
  ],
  templateUrl: './modulo.html',
  styleUrl: './modulo.css',
})
export class ModuloComponent implements OnInit, OnChanges {
  @Input() idProyecto!: number;

  modulos: Modulo[] = [];
  modulosFiltrados: Modulo[] = [];
  busqueda = '';

  // modal/form
  mostrarModal = false;
  modoEdicion = false;
  moduloEditando: Modulo | null = null;

  // dropdown
  modulosAbierto = false;

  // form (IMPORTANTE: tu backend devuelve "proyecto" como objeto en GET,
  // pero para crear/editar hay que enviar "proyecto" como ID)
  moduloForm: { codigo: string; nombre: string } = { codigo: '', nombre: '' };

  // mensajes / confirmación
  mensajeExito = '';
  mensajeError = '';
  mensajeAdvertencia = '';

  mostrarConfirmacion = false;
  mensajeConfirmacion = '';
  idPendienteEliminar: number | null = null;

  constructor(
    private service: ServiciosProyectos,
    private elRef: ElementRef,
  ) {}

  // =============================
  // ========= LIFECYCLE =========
  // =============================
  ngOnInit(): void {
    if (this.idProyecto > 0) this.cargarModulos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idProyecto']?.currentValue > 0) {
      this.cargarModulos();
    } else {
      // si se deselecciona proyecto
      this.modulos = [];
      this.modulosFiltrados = [];
      this.busqueda = '';
    }
  }

  // =============================
  // ========= LISTAR ============
  // =============================
  cargarModulos(): void {
    if (!this.idProyecto || this.idProyecto <= 0) return;

    this.service.getModulosPorProyecto(this.idProyecto).subscribe({
      next: (res) => {
        this.modulos = this.ordenarModulos(res ?? []);
        this.aplicarFiltro();
      },
      error: (err) => {
        console.error(err);
        this.mensajeError = 'Error al cargar módulos.';
      },
    });
  }

  private ordenarModulos(lista: Modulo[]): Modulo[] {
    // orden estable: código, luego id
    return [...lista].sort((a, b) => {
      const c = (a.codigo || '').localeCompare(b.codigo || '');
      if (c !== 0) return c;
      return (a.id ?? 0) - (b.id ?? 0);
    });
  }

  aplicarFiltro(): void {
    const t = this.busqueda.trim().toLowerCase();
    this.modulosFiltrados = !t
      ? [...this.modulos]
      : this.modulos.filter(
          (m) =>
            (m.codigo || '').toLowerCase().includes(t) ||
            (m.nombre || '').toLowerCase().includes(t),
        );
  }

  toggleModulos(): void {
    this.modulosAbierto = !this.modulosAbierto;
  }

  // =============================
  // ========= MODAL =============
  // =============================
  abrirNuevo(): void {
    this.clearMensajes();
    this.modoEdicion = false;
    this.moduloEditando = null;
    this.moduloForm = { codigo: '', nombre: '' };
    this.mostrarModal = true;
  }

  abrirEditar(m: Modulo): void {
    this.clearMensajes();
    this.modoEdicion = true;
    this.moduloEditando = m;

    // normaliza el form (solo strings)
    this.moduloForm = {
      codigo: m.codigo ?? '',
      nombre: m.nombre ?? '',
    };

    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardarDesdeModal(): void {
    if (this.modoEdicion) this.actualizarModulo();
    else this.crearModulo();
  }

  // =============================
  // ========= CREATE ============
  // =============================
  private crearModulo(): void {
    this.clearMensajes();

    if (!this.idProyecto || this.idProyecto <= 0) {
      this.mensajeAdvertencia = 'Seleccione un proyecto válido.';
      return;
    }

    const nombre = (this.moduloForm.nombre || '').trim();
    if (!nombre) {
      this.mensajeAdvertencia = 'El nombre del módulo es obligatorio.';
      return;
    }

    const codigo = (this.moduloForm.codigo || '').trim();

    // Validación local (opcional) - evita duplicados por nombre
    const existeNombre = this.modulos.some(
      (m) => (m.nombre || '').toLowerCase() === nombre.toLowerCase(),
    );
    if (existeNombre) {
      this.mensajeAdvertencia = 'Este módulo ya existe en el proyecto.';
      return;
    }

    const payload: any = {
      codigo,
      nombre,
      proyecto: this.idProyecto, // FK por ID
    };

    this.service.createModulo(payload).subscribe({
      next: (nuevo) => {
        this.modulos = this.ordenarModulos([...this.modulos, nuevo]);
        this.aplicarFiltro();

        this.mostrarModal = false;
        this.moduloForm = { codigo: '', nombre: '' };

        // notificar
        this.service.modulosChanged.next();
        this.service.notifyDataChanged();

        this.mensajeExito = 'Módulo registrado correctamente.';
      },
      error: (err) => {
        console.error(err);
        // si tu backend devuelve error por unique(codigo por proyecto)
        this.mensajeError =
          err?.error?.error ||
          err?.error?.detail ||
          'Error al registrar el módulo.';
      },
    });
  }

  // =============================
  // ========= UPDATE ============
  // =============================
  private actualizarModulo(): void {
    this.clearMensajes();

    if (!this.moduloEditando) return;

    const nombre = (this.moduloForm.nombre || '').trim();
    if (!nombre) {
      this.mensajeAdvertencia = 'El nombre del módulo es obligatorio.';
      return;
    }

    const codigo = (this.moduloForm.codigo || '').trim();

    // Validación local (evita duplicados por nombre)
    const existeNombre = this.modulos.some(
      (m) =>
        m.id !== this.moduloEditando!.id &&
        (m.nombre || '').toLowerCase() === nombre.toLowerCase(),
    );
    if (existeNombre) {
      this.mensajeAdvertencia = 'Ya existe un módulo con ese nombre.';
      return;
    }

    // IMPORTANTE: en update también mandamos proyecto como ID (para que DRF no se confunda)
    const payload: any = {
      codigo,
      nombre,
      proyecto:
        typeof (this.moduloEditando as any).proyecto === 'object'
          ? (this.moduloEditando as any).proyecto?.id_proyecto // si viene como objeto Proyecto
          : (this.moduloEditando as any).proyecto, // si viene como id
    };

    this.service.updateModulo(this.moduloEditando.id, payload).subscribe({
      next: (actualizado) => {
        const idx = this.modulos.findIndex(
          (m) => m.id === this.moduloEditando!.id,
        );
        if (idx !== -1) {
          const copia = [...this.modulos];
          copia[idx] = actualizado;
          this.modulos = this.ordenarModulos(copia);
        }

        this.aplicarFiltro();
        this.mostrarModal = false;

        this.service.modulosChanged.next();
        this.service.notifyDataChanged();

        this.mensajeExito = 'Módulo actualizado correctamente.';
      },
      error: (err) => {
        console.error(err);
        this.mensajeError =
          err?.error?.error ||
          err?.error?.detail ||
          'Error al actualizar el módulo.';
      },
    });
  }

  // =============================
  // ========= DELETE ============
  // =============================
  confirmarEliminarModulo(id: number): void {
    this.clearMensajes();
    this.idPendienteEliminar = id;
    this.mensajeConfirmacion = '¿Está seguro que desea eliminar este módulo?';
    this.mostrarConfirmacion = true;
  }

  accionConfirmada(): void {
    if (this.idPendienteEliminar == null) return;

    const id = this.idPendienteEliminar;
    this.idPendienteEliminar = null;
    this.mostrarConfirmacion = false;

    this.service.deleteModulo(id).subscribe({
      next: () => {
        this.modulos = this.modulos.filter((m) => m.id !== id);
        this.modulos = this.ordenarModulos(this.modulos);
        this.aplicarFiltro();

        this.service.modulosChanged.next();
        this.service.notifyDataChanged();

        this.mensajeExito = 'Módulo eliminado correctamente.';
      },
      error: (err) => {
        console.error(err);
        this.mensajeError =
          err?.error?.error ||
          err?.error?.detail ||
          'Error al eliminar el módulo.';
      },
    });
  }

  // =============================
  // ========= UTIL ==============
  // =============================
  toUpper(field: 'codigo' | 'nombre'): void {
    const v = (this.moduloForm[field] || '').toUpperCase();
    this.moduloForm = { ...this.moduloForm, [field]: v };
  }

  private clearMensajes(): void {
    this.mensajeExito = '';
    this.mensajeError = '';
    this.mensajeAdvertencia = '';
  }

  manejarOk(): void {
    this.mensajeExito = '';
  }
  manejarError(): void {
    this.mensajeError = '';
  }
  manejarAdvertencia(): void {
    this.mensajeAdvertencia = '';
  }

  // =============================
  // ======= CLICK OUTSIDE =======
  // =============================
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.modulosAbierto) return;
    const clickDentro = this.elRef.nativeElement.contains(event.target);
    if (!clickDentro) this.modulosAbierto = false;
  }
}
