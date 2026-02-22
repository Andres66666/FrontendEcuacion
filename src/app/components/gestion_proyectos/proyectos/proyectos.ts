import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Proyecto } from '../models/modelosProyectos';
import { ServiciosProyectos } from '../service/servicios-proyectos';

import { OkComponent } from '../../mensajes/ok/ok.component';
import { ConfirmacionComponent } from '../../mensajes/confirmacion/confirmacion/confirmacion.component';
import { ErrorComponent } from '../../mensajes/error/error.component';
import { Advertencia } from '../../mensajes/advertencia/advertencia';
import { ModuloComponent } from '../modulo/modulo';
import { ItemsGastoOperacion } from '../items-gasto-operacion/items-gasto-operacion';

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmacionComponent,
    OkComponent,
    ErrorComponent,
    Advertencia,
    ModuloComponent,
    ItemsGastoOperacion,
  ],
  templateUrl: './proyectos.html',
  styleUrl: './proyectos.css',
})
export class Proyectos implements OnInit {
  proyectos: Proyecto[] = [];
  proyectosFiltrados: Proyecto[] = [];
  filtroProyecto = '';

  proyectoSeleccionado: Proyecto | null = null;
  proyectoForm: Proyecto = this.buildNuevoProyecto();

  dropdownAbierto = false;
  mostrarModal = false;
  modoEdicion = false;

  mostrarConfirmacion = false;
  mensajeConfirmacion = '';
  idPendienteEliminar: number | null = null;

  mensajeExito = '';
  mensajeError = '';
  mensajeAdvertencia = '';

  duplicandoProyecto = false;
  progresoDuplicacion = 0;

  usuario_id = 0;

  constructor(
    private service: ServiciosProyectos,
    private router: Router,
    private elRef: ElementRef,
  ) {}

  ngOnInit(): void {
    const usuario = this.service.getUsuarioLogueado();
    if (!usuario?.id) {
      this.router.navigate(['/login']);
      return;
    }

    this.usuario_id = usuario.id;
    this.proyectoForm = this.buildNuevoProyecto();

    this.cargarProyectos();
  }

  // =============================
  // HELPERS
  // =============================
  private clearMensajes(): void {
    this.mensajeExito = '';
    this.mensajeError = '';
    this.mensajeAdvertencia = '';
  }

  private buildNuevoProyecto(): Proyecto {
    return {
      id_proyecto: 0,
      NombreProyecto: '',
      carga_social: 0,
      iva_efectiva: 0,
      herramientas: 0,
      gastos_generales: 0,
      iva_tasa_nominal: 0,
      it: 0,
      iue: 0,
      ganancia: 0,
      margen_utilidad: 0,
      creado_por: this.usuario_id,
    };
  }

  private persistSeleccion(id: number | null): void {
    if (id) localStorage.setItem('proyectoSeleccionado', String(id));
    else localStorage.removeItem('proyectoSeleccionado');
  }

  private restoreSeleccion(): void {
    const idGuardado = localStorage.getItem('proyectoSeleccionado');
    if (!idGuardado) {
      this.proyectoSeleccionado = null;
      return;
    }

    const id = Number(idGuardado);
    const existe = this.proyectos.find((p) => p.id_proyecto === id) ?? null;
    this.proyectoSeleccionado = existe;
    if (!existe) this.persistSeleccion(null);
  }

  private applyFiltro(): void {
    const f = this.filtroProyecto.trim().toLowerCase();
    this.proyectosFiltrados = !f
      ? [...this.proyectos]
      : this.proyectos.filter((p) =>
          (p.NombreProyecto || '').toLowerCase().includes(f),
        );
  }

  private cargarProyectos(): void {
    this.clearMensajes();

    this.service.getProyecto().subscribe({
      next: (r) => {
        this.proyectos = r ?? [];
        this.applyFiltro();
        this.restoreSeleccion();
      },
      error: (err) => {
        console.error(err);
        this.mensajeError = 'No se pudieron cargar los proyectos.';
      },
    });
  }

  // =============================
  // UI ACTIONS
  // =============================
  filtrarProyectos(): void {
    this.applyFiltro();
  }

  toggleDropdown(): void {
    this.dropdownAbierto = !this.dropdownAbierto;
  }

  seleccionarProyecto(p: Proyecto): void {
    this.proyectoSeleccionado = p;
    this.dropdownAbierto = false;
    this.persistSeleccion(p.id_proyecto);
  }

  abrirNuevo(): void {
    this.clearMensajes();
    this.modoEdicion = false;
    this.proyectoForm = this.buildNuevoProyecto();
    this.mostrarModal = true;
    this.dropdownAbierto = false;
  }

  abrirEditar(p: Proyecto): void {
    this.clearMensajes();
    this.modoEdicion = true;
    this.proyectoForm = { ...p, creado_por: this.usuario_id };
    this.proyectoSeleccionado = p;
    this.mostrarModal = true;
    this.dropdownAbierto = false;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  upperNombre(): void {
    this.proyectoForm.NombreProyecto = (this.proyectoForm.NombreProyecto || '')
      .toUpperCase()
      .trimStart();
  }

  // =============================
  // CRUD PROYECTO
  // =============================
  guardar(): void {
    this.clearMensajes();

    const nombre = (this.proyectoForm.NombreProyecto || '').trim();
    if (!nombre) {
      this.mensajeAdvertencia = 'El nombre del proyecto es obligatorio.';
      return;
    }

    const payload: Proyecto = {
      ...this.proyectoForm,
      NombreProyecto: nombre,
      creado_por: this.usuario_id,
    };

    const request$ = this.modoEdicion
      ? this.service.updateProyecto(payload)
      : this.service.createProyecto(payload);

    request$.subscribe({
      next: (res) => {
        this.mensajeExito = this.modoEdicion
          ? 'Proyecto actualizado correctamente.'
          : 'Proyecto creado correctamente.';
        this.cerrarModal();
        this.cargarProyectos();

        if (res?.id_proyecto) {
          this.proyectoSeleccionado = res;
          this.persistSeleccion(res.id_proyecto);
        }
      },
      error: (err) => {
        console.error(err);

        const msg =
          err?.error?.error ||
          err?.error?.detail ||
          'Ocurrió un error al guardar el proyecto.';
        this.mensajeError = msg;
      },
    });
  }

  confirmarEliminar(id: number): void {
    this.clearMensajes();
    this.idPendienteEliminar = id;
    this.mensajeConfirmacion = '¿Está seguro que desea eliminar este proyecto?';
    this.mostrarConfirmacion = true;
  }

  accionConfirmada(): void {
    if (this.idPendienteEliminar == null) return;

    const id = this.idPendienteEliminar;
    this.idPendienteEliminar = null;
    this.mostrarConfirmacion = false;

    this.service.deleteProyecto(id).subscribe({
      next: () => {
        this.proyectos = this.proyectos.filter((p) => p.id_proyecto !== id);
        this.applyFiltro();

        if (this.proyectoSeleccionado?.id_proyecto === id) {
          this.proyectoSeleccionado = null;
          this.persistSeleccion(null);
        }

        this.mensajeExito = 'Proyecto eliminado correctamente.';
      },
      error: (err) => {
        console.error(err);
        this.mensajeError = 'Error al eliminar el proyecto.';
      },
    });
  }

  // =============================
  // DUPLICAR (usando backend)
  // =============================
  duplicarProyecto(proyecto: Proyecto, event: Event): void {
    event.stopPropagation();
    this.clearMensajes();

    this.duplicandoProyecto = true;
    this.setProgreso(15);

    this.service.duplicarProyecto(proyecto.id_proyecto).subscribe({
      next: ({ nuevo_id }) => {
        this.setProgreso(85);
        this.mensajeExito = 'Proyecto duplicado correctamente.';
        this.cargarProyectos();

        // opcional: seleccionar el duplicado
        setTimeout(() => {
          const nuevo =
            this.proyectos.find((p) => p.id_proyecto === nuevo_id) ?? null;
          if (nuevo) {
            this.proyectoSeleccionado = nuevo;
            this.persistSeleccion(nuevo.id_proyecto);
          }
        }, 200);
      },
      error: (err) => {
        console.error(err);
        this.mensajeError =
          err?.error?.error || 'Error al duplicar el proyecto.';
      },
      complete: () => {
        this.setProgreso(100);
        setTimeout(() => {
          this.duplicandoProyecto = false;
          this.progresoDuplicacion = 0;
        }, 700);
      },
    });
  }

  private setProgreso(p: number): void {
    this.progresoDuplicacion = Math.max(0, Math.min(100, Math.round(p)));
  }

  // =============================
  // CLICK OUTSIDE
  // =============================
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.dropdownAbierto) return;
    const clickDentro = this.elRef.nativeElement.contains(event.target);
    if (!clickDentro) this.dropdownAbierto = false;
  }

  // =============================
  // HANDLERS MENSAJES
  // =============================
  manejarOk(): void {
    this.mensajeExito = '';
  }
  manejarError(): void {
    this.mensajeError = '';
  }
  manejarAdvertencia(): void {
    this.mensajeAdvertencia = '';
  }
}
