import {
  Component,
  ElementRef,
  Input,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  GastoOperacion,
  GastosGenerales,
  Modulo,
  Proyecto,
} from '../models/modelosProyectos';
import { ServiciosProyectos } from '../service/servicios-proyectos';

import { catchError, EMPTY, forkJoin, Subject, takeUntil, tap } from 'rxjs';

import { ConfirmacionComponent } from '../../mensajes/confirmacion/confirmacion/confirmacion.component';
import { OkComponent } from '../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../mensajes/error/error.component';
import { Advertencia } from '../../mensajes/advertencia/advertencia';
import { ReportesPdf } from '../../../services/reportes-pdf';

type GastoOperacionUI = GastoOperacion & {
  gastosGenerales?: GastosGenerales;
  precio_calculado?: number;
  original_precio_unitario?: number;
  db_precio_unitario?: number;
  db_costo_parcial?: number;
  modulo?: any;
};

type Contexto = 'PROYECTO' | 'MODULO' | 'ITEM';

type PdfTipo =
  | ''
  | 'financiero'
  | 'materiales'
  | 'manoDeObra'
  | 'equipos'
  | 'preciogeneral'
  | 'analisis';

@Component({
  selector: 'app-items-gasto-operacion',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    ConfirmacionComponent,
    OkComponent,
    ErrorComponent,
    Advertencia,
  ],
  templateUrl: './items-gasto-operacion.html',
  styleUrl: './items-gasto-operacion.css',
})
export class ItemsGastoOperacion {
  // =========================================================
  // 1) INPUTS / VIEWCHILD
  // =========================================================
  @Input() idProyecto!: number;
  @ViewChild('tableContainer', { static: false }) tableContainer!: ElementRef;

  // =========================================================
  // 2) ESTADO BASE (PROYECTO / MODULOS / ITEMS)
  // =========================================================
  proyecto?: Proyecto;
  nombreProyecto = '';
  herramientas = 0;

  modulos: Modulo[] = [];
  gastos: GastoOperacionUI[] = [];

  materiales: any[] = [];
  manoDeObra: any[] = [];
  equipos: any[] = [];

  // =========================================================
  // 3) FILTROS / BUSCADORES
  // =========================================================
  searchTerm = '';

  // Dropdown filtro - Form (Registrar/Editar)
  filtroModulosForm = '';
  modulosFormFiltrados: Modulo[] = [];

  // Dropdown filtro - Destino (Mover/Duplicar)
  filtroModulosDestino = '';
  modulosDestinoFiltrados: Modulo[] = [];

  // Insumos
  filtroInsumos = '';
  insumosFiltrados: Array<{
    descripcion: string;
    precio_unitario: number;
    precioOriginal: number;
  }> = [];

  // =========================================================
  // 4) FORMULARIO (REGISTRAR / EDITAR)
  // =========================================================
  mostrarModal = false;
  modoEdicion = false;
  gastoEditando?: GastoOperacionUI;

  itemForm: {
    descripcion: string;
    unidad: string;
    cantidad: number;
    modulo: number | null;
  } = this.nuevoForm();

  // Unidades (autocomplete)
  catalogoUnidades: string[] = [];
  opcionesUnidad: string[] = [];

  // =========================================================
  // 5) MODAL ACCIONES (MOVER / DUPLICAR)
  // =========================================================
  mostrarModalAccion = false;

  accionAccionModal: 'MOVER' | 'DUPLICAR' = 'MOVER';
  itemSeleccionado?: GastoOperacionUI;

  modulosDestino: Modulo[] = [];
  moduloDestino: any = null;
  posicionDestino = 1;

  // (ya no usas mover/duplicar modal separado, pero dejo flags por si aún están en template)
  mostrarModalMover = false;
  mostrarModalDuplicar = false;

  // =========================================================
  // 6) ELIMINACIÓN (CONFIRMACIÓN)
  // =========================================================
  mostrarConfirmacion = false;
  mensajeConfirmacion = '';
  idPendienteEliminar: number | null = null;

  // =========================================================
  // 7) INSUMOS (MODAL + DATA)
  // =========================================================
  mostrarModalInsumos = false;
  tipoInsumoSeleccionado: '' | 'material' | 'manoDeObra' | 'equipo' = '';

  insumosProyecto: Array<{
    descripcion: string;
    precio_unitario: number;
    precioOriginal: number;
  }> = [];

  // =========================================================
  // 8) PDFs
  // =========================================================
  selectedPdfProyecto: PdfTipo = '';
  selectedPdfModulo: Record<number, PdfTipo> = {};
  selectedPdfItem: Record<number, PdfTipo> = {};

  // =========================================================
  // 9) MENSAJES / UI HELPERS
  // =========================================================
  mensajeExito = '';
  mensajeError = '';
  mensajeAdvertencia = '';
  private msgTimer: any = null;

  // =========================================================
  // 10) CAMBIOS (TRACKING)
  // =========================================================
  private changedItemIds = new Set<number>();

  // =========================================================
  // 11) LIFECYCLE / STREAMS
  // =========================================================
  private destroy$ = new Subject<void>();
  private readonly QTY_SCALE = 100000; // 5 decimales

  constructor(
    private service: ServiciosProyectos,
    private router: Router,
    private reportesPdf: ReportesPdf,
  ) {
    this.service.dataChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refresh(false));

    this.service.modulosChanged
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refresh(false));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idProyecto']) this.refresh(true);
  }

  ngOnDestroy(): void {
    if (this.msgTimer) clearTimeout(this.msgTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================================================
  // 12) RECUPERACIÓN / SETTERS / RESET
  // =========================================================
  private refresh(cambioProyecto: boolean): void {
    if (!this.idProyecto || this.idProyecto <= 0) {
      this.resetAll();
      return;
    }

    const request$ = cambioProyecto
      ? forkJoin({
          p: this.service.getProyectoID(this.idProyecto),
          mods: this.service.getModulosPorProyecto(this.idProyecto),
          gastos: this.service.getGastosOperacionPorProyecto(this.idProyecto),
          ggMap: this.service.getGastosGeneralesPorProyecto(this.idProyecto),
          unidades: this.service.getUnidadesGastoOperacion(),
          mats: this.service.getMaterialesPorProyecto(this.idProyecto),
          mo: this.service.getManoDeObraPorProyecto(this.idProyecto),
          eq: this.service.getEquiposPorProyecto(this.idProyecto),
        })
      : forkJoin({
          p: this.service.getProyectoID(this.idProyecto),
          mods: this.service.getModulosPorProyecto(this.idProyecto),
          gastos: this.service.getGastosOperacionPorProyecto(this.idProyecto),
          ggMap: this.service.getGastosGeneralesPorProyecto(this.idProyecto),
          mats: this.service.getMaterialesPorProyecto(this.idProyecto),
          mo: this.service.getManoDeObraPorProyecto(this.idProyecto),
          eq: this.service.getEquiposPorProyecto(this.idProyecto),
        });

    request$
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          console.error(err);
          this.mensajeError = 'Error al cargar datos del proyecto.';
          return EMPTY;
        }),
      )
      .subscribe((res: any) => {
        this.setProyecto(res.p);
        this.setModulos(res.mods);
        this.setGastos(res.gastos, res.ggMap);

        this.materiales = this.normalizarInsumos(res.mats);
        this.manoDeObra = this.normalizarInsumos(res.mo);
        this.equipos = this.normalizarInsumos(res.eq);

        if (res.unidades) this.setUnidades(res.unidades);
      });
  }

  private resetAll(): void {
    this.proyecto = undefined;
    this.nombreProyecto = '';
    this.herramientas = 0;

    this.modulos = [];
    this.gastos = [];
    this.materiales = [];
    this.manoDeObra = [];
    this.equipos = [];

    this.searchTerm = '';

    this.mostrarModal = false;
    this.modoEdicion = false;
    this.gastoEditando = undefined;
    this.itemForm = this.nuevoForm();

    this.catalogoUnidades = [];
    this.opcionesUnidad = [];

    this.mostrarModalAccion = false;
    this.accionAccionModal = 'MOVER';
    this.itemSeleccionado = undefined;
    this.modulosDestino = [];
    this.moduloDestino = null;
    this.posicionDestino = 1;

    this.mostrarModalMover = false;
    this.mostrarModalDuplicar = false;

    this.mostrarConfirmacion = false;
    this.mensajeConfirmacion = '';
    this.idPendienteEliminar = null;

    this.mostrarModalInsumos = false;
    this.tipoInsumoSeleccionado = '';
    this.insumosProyecto = [];
    this.filtroInsumos = '';
    this.insumosFiltrados = [];

    this.filtroModulosDestino = '';
    this.modulosDestinoFiltrados = [];

    this.filtroModulosForm = '';
    this.modulosFormFiltrados = [];

    this.changedItemIds.clear();
    this.clearMensajes();
  }

  private setProyecto(p: Proyecto): void {
    this.proyecto = p;
    this.nombreProyecto = p?.NombreProyecto || '';
    this.herramientas = Number(p?.herramientas) || 0;
  }

  private setModulos(mods: Modulo[]): void {
    this.modulos = Array.isArray(mods) ? mods : [];
  }

  private setUnidades(unidades: string[]): void {
    this.catalogoUnidades = (unidades || [])
      .map((u) => (u || '').toUpperCase().trim())
      .filter(Boolean)
      .filter((u, i, arr) => arr.indexOf(u) === i)
      .sort();
  }
  // ===== helpers exactos para dinero/cantidades =====

  private toCents(v: any): number {
    const n = Number(v || 0);
    return Math.round((n + Number.EPSILON) * 100);
  }

  private fromCents(cents: number): number {
    return cents / 100;
  }
  private getPrecioTotalCents(g: GastoOperacion): number {
    const cantidad = Number(g.cantidad) || 0;
    const unitFinal = this.getTotalFinal(g);
    return this.mulQtyByUnitToCents(cantidad, unitFinal);
  }

  private getGastoOperacionParcialCents(g: GastoOperacion): number {
    const ui = g as GastoOperacionUI;
    const cantidad = Number(g.cantidad) || 0;
    const unitParcial = Number(ui.gastosGenerales?.totalgastosgenerales) || 0;
    return this.mulQtyByUnitToCents(cantidad, unitParcial);
  }
  // total (centavos) = cantidad * precioUnitario (centavos), con cantidad a 5 decimales reales
  private mulQtyByUnitToCents(qty: any, unitPrice: any): number {
    const q = Number(qty || 0);
    const qtyMicro = Math.round((q + Number.EPSILON) * this.QTY_SCALE);
    const unitCents = this.toCents(unitPrice);
    return Math.round((qtyMicro * unitCents) / this.QTY_SCALE);
  }

  private setGastos(
    gastosBD: GastoOperacion[],
    ggMap: { [id: string]: any },
  ): void {
    this.changedItemIds.clear();

    this.gastos = (gastosBD || []).map((g) => {
      const ui = g as GastoOperacionUI;

      const moduloId = this.getModuloIdDeGasto(g);
      const gg = ggMap?.[String(g.id)];

      ui.db_precio_unitario = Number(g.precio_unitario) || 0;
      ui.db_costo_parcial = Number(g.costo_parcial) || 0;

      if (gg) {
        ui.gastosGenerales = {
          totalgastosgenerales: Number(gg.totalgastosgenerales) || 0, // unitario parcial
          total: Number(gg.total) || 0,                               // unitario final
        } as any;
      }

      // unitario final (si existe gg.total, manda)
      const precioFinalUnit =
        Number(gg?.total) || Number(g.precio_unitario) || 0;

      const cantidad = Number(g.cantidad) || 0;

      // ✅ costo parcial exacto (centavos) = cantidad * unitario final
      const precioTotalCalcC = this.mulQtyByUnitToCents(cantidad, precioFinalUnit);
      const precioTotalCalc = this.fromCents(precioTotalCalcC);

      ui.precio_calculado = precioFinalUnit;
      ui.original_precio_unitario = ui.db_precio_unitario || precioFinalUnit;

      ui.precio_unitario = precioFinalUnit;
      ui.costo_parcial = ui.db_costo_parcial || 0;

      ui.modulo = moduloId as any;

      // ✅ comparación exacta por centavos (evita falsos positivos por flotantes)
      const dbUnitC = this.toCents(ui.db_precio_unitario || 0);
      const finalUnitC = this.toCents(precioFinalUnit);

      const dbTotalC = this.toCents(ui.db_costo_parcial || 0);
      const calcTotalC = precioTotalCalcC;

      if (Math.abs(dbUnitC - finalUnitC) > 1 || Math.abs(dbTotalC - calcTotalC) > 1) {
        this.changedItemIds.add(Number(ui.id));
      }

      return ui;
    });
  }
  private normalizarInsumos(rows: any[]): any[] {
    return (rows || []).map((r) => ({
      ...r,
      id_gasto_operacion:
        r?.id_gasto_operacion ??
        r?.gasto_operacion ??
        r?.gasto_operacion_id ??
        r?.id_gasto_operaciones ??
        null,
    }));
  }

  // =========================================================
  // 13) HELPERS / FORMAT / VALIDACIONES
  // =========================================================
  private nuevoForm() {
    return { descripcion: '', unidad: '', cantidad: 0, modulo: null };
  }

  toNumber(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  private sanitizeDescripcion(v: string): string {
    return (v || '')
      .toUpperCase()
      .replace(/[^A-ZÁÉÍÓÚÜÑ0-9º"\/()\-\s.,+=X]/g, '') // permitido
      .replace(/\s+/g, ' ')
      .trimStart();
  }

  private sanitizeUnidad(v: string): string {
    return (v || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 5);
  }

  private sanitizeCantidadInput(v: string): string {
    let s = (v || '').replace(/[^0-9.,]/g, '');

    const lastSep = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
    if (lastSep !== -1) {
      const intPart = s.slice(0, lastSep).replace(/[.,]/g, '');
      const decPart = s.slice(lastSep + 1).replace(/[.,]/g, '');
      s = intPart + '.' + decPart; 
    } else {
      s = s.replace(/[.,]/g, '');
    }
    return s;
  }
  toUpper(field: 'descripcion' | 'unidad'): void {
    if (field === 'descripcion') {
      this.itemForm.descripcion = this.sanitizeDescripcion(this.itemForm.descripcion);
      return;
    }
    this.itemForm.unidad = this.sanitizeUnidad(this.itemForm.unidad);
  }

  calcularCosto(): void {}

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(valor) || 0);
  }

  private redondear2(v: number): number {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  private getModuloIdDeGasto(g: any): number {
    if (typeof g?.modulo === 'number') return Number(g.modulo);
    if (g?.modulo?.id != null) return Number(g.modulo.id);
    return -1;
  }

  // =========================================================
  // 14) FILTROS (TABLA + DROPDOWNS)
  // =========================================================
  onSearchChange(): void {
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (!term) return;

    const matching = this.modulos.find(
      (m) =>
        (m.nombre || '').toLowerCase() === term ||
        (m.codigo || '').toLowerCase() === term,
    );
    if (!matching) return;

    setTimeout(() => {
      const el = this.tableContainer?.nativeElement?.querySelector(
        `#modulo-${matching.id}`,
      );
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  get gastosFiltrados(): GastoOperacionUI[] {
    if (!this.searchTerm) return this.gastos;

    const term = this.searchTerm.toLowerCase();

    return this.gastos.filter((g) => {
      const d = (g.descripcion || '').toLowerCase().includes(term);

      const mid = this.getModuloIdDeGasto(g);
      const m = this.modulos.find((x) => x.id === mid);

      const mm =
        !!m &&
        ((m.nombre || '').toLowerCase().includes(term) ||
          (m.codigo || '').toLowerCase().includes(term));

      return d || mm;
    });
  }

  // --- Dropdown Form (Registrar/Editar)
  getModuloFormLabel(): string {
    const id = this.toNumber(this.itemForm?.modulo);
    if (!id) return 'Seleccione módulo';
    const m = (this.modulos || []).find((x) => Number(x.id) === id);
    return m ? `${m.codigo} - ${m.nombre}` : 'Seleccione módulo';
  }

  aplicarFiltroModulosForm(): void {
    const q = (this.filtroModulosForm || '').trim().toLowerCase();
    const base = this.modulos || [];

    this.modulosFormFiltrados = !q
      ? base
      : base.filter((m) => {
          const codigo = (m.codigo || '').toLowerCase();
          const nombre = (m.nombre || '').toLowerCase();
          return codigo.includes(q) || nombre.includes(q);
        });
  }

  seleccionarModuloForm(m: Modulo): void {
    this.itemForm.modulo = m.id;
  }

  // --- Dropdown Destino (Mover/Duplicar)
  getModuloDestinoLabel(): string {
    const id = this.toNumber(this.moduloDestino);
    if (!id) return 'Seleccione módulo';

    const m =
      (this.modulosDestino || []).find((x) => Number(x.id) === id) ||
      (this.modulos || []).find((x) => Number(x.id) === id);

    return m ? `${m.codigo} - ${m.nombre}` : 'Seleccione módulo';
  }

  seleccionarModuloDestino(m: Modulo): void {
    this.moduloDestino = m.id;
    this.posicionDestino = 1;
  }

  aplicarFiltroModulosDestino(): void {
    const q = (this.filtroModulosDestino || '').trim().toLowerCase();
    const base = this.modulosDestino || [];

    this.modulosDestinoFiltrados = !q
      ? base
      : base.filter((m) => {
          const codigo = (m.codigo || '').toLowerCase();
          const nombre = (m.nombre || '').toLowerCase();
          return codigo.includes(q) || nombre.includes(q);
        });
  }

  limpiarFiltroModulosDestino(): void {
    this.filtroModulosDestino = '';
    this.modulosDestinoFiltrados = [...this.modulosDestino];
  }

  // =========================================================
  // 15) LISTADOS / AGRUPACIÓN POR MÓDULO
  // =========================================================
  modulosConGastos(): Modulo[] {
    const ids = new Set<number>(
      this.gastosFiltrados.map((g) => this.getModuloIdDeGasto(g)),
    );
    return this.modulos.filter((m) => ids.has(m.id));
  }

  getGastosPorModulo(moduloId: number): GastoOperacionUI[] {
    return this.gastosFiltrados.filter(
      (g) => this.getModuloIdDeGasto(g) === moduloId,
    );
  }

  getIndiceGlobal(moduloId: number, index: number): number {
    let count = 0;
    for (const m of this.modulosConGastos()) {
      if (m.id === moduloId) return count + index + 1;
      count += this.getGastosPorModulo(m.id).length;
    }
    return count + 1;
  }

  // =========================================================
  // 16) CÁLCULOS / TOTALES
  // =========================================================
  getTotalFinal(g: GastoOperacion): number {
    const ui = g as GastoOperacionUI;
    return Number(ui.gastosGenerales?.total) || Number(g.precio_unitario) || 0;
  }

  getPrecioTotal(g: GastoOperacion): number {
    const cantidad = Number(g.cantidad) || 0;
    const unit = this.getTotalFinal(g);
    return this.fromCents(this.mulQtyByUnitToCents(cantidad, unit));
  }

  getTotalItemGastosOperacionesParcial(g: GastoOperacion): number {
    return this.fromCents(this.getGastoOperacionParcialCents(g));
  }

  getValorAgregado(g: GastoOperacion): number {
    const totalC = this.getPrecioTotalCents(g);
    const parcialC = this.getGastoOperacionParcialCents(g);

    const vaC = totalC - parcialC;

    return this.fromCents(vaC);
  }
getTotalCostoParcial(): number {
  const totalCents = this.gastosFiltrados.reduce((s, g) => {
    return s + this.getPrecioTotalCents(g);
  }, 0);

  return this.fromCents(totalCents);
}


  getTotalProyectoGastosOperacionParcial(): number {
    const totalCents = this.gastosFiltrados.reduce((s, g) => {
      return s + this.getGastoOperacionParcialCents(g);
    }, 0);

    return this.fromCents(totalCents);
  }

  getTotalProyectoValorAgregado(): number {
    const totalCents = this.gastosFiltrados.reduce((s, g) => {
      const totalC = this.getPrecioTotalCents(g);
      const parcialC = this.getGastoOperacionParcialCents(g);
      return s + (totalC - parcialC);
    }, 0);

    return this.fromCents(totalCents);
  }

  getTotalModuloGastosOperacionParcial(moduloId: number): number {
    const items = this.getGastosPorModulo(moduloId);

    const totalCents = items.reduce((s, g) => {
      return s + this.getGastoOperacionParcialCents(g);
    }, 0);

    return this.fromCents(totalCents);
  }

  getTotalModuloValorAgregado(moduloId: number): number {
    const items = this.getGastosPorModulo(moduloId);

    const totalCents = items.reduce((s, g) => {
      const totalC = this.getPrecioTotalCents(g);
      const parcialC = this.getGastoOperacionParcialCents(g);
      return s + (totalC - parcialC);
    }, 0);

    return this.fromCents(totalCents);
  }

  // =========================================================
  // 17) CRUD (REGISTRAR / EDITAR / ELIMINAR)
  // =========================================================
  abrirModalRegistrar(): void {
    this.clearMensajes();
    this.modoEdicion = false;
    this.gastoEditando = undefined;
    this.itemForm = this.nuevoForm();
    this.mostrarModal = true;

    this.filtroModulosForm = '';
    this.modulosFormFiltrados = [...this.modulos];
  }

  abrirEditar(g: GastoOperacionUI): void {
    this.clearMensajes();
    this.modoEdicion = true;
    this.gastoEditando = g;

    const moduloId = this.getModuloIdDeGasto(g);

    this.itemForm = {
      descripcion: g.descripcion ?? '',
      unidad: g.unidad ?? '',
      cantidad: Number(g.cantidad) || 0,
      modulo: moduloId > 0 ? moduloId : null,
    };

    this.mostrarModal = true;

    this.filtroModulosForm = '';
    this.modulosFormFiltrados = [...this.modulos];
  }

  guardarDesdeModal(): void {
    this.clearMensajes();

    // aplicar sanitizado antes de validar/guardar
    const descripcion = this.sanitizeDescripcion(this.itemForm.descripcion || '').trim();
    const unidad = this.sanitizeUnidad(this.itemForm.unidad || '').trim();
    const cantidadStr = this.sanitizeCantidadInput(String(this.itemForm.cantidad ?? ''));
    const cantidad = Number(cantidadStr);

    const moduloId = Number(this.itemForm.modulo) || 0;

    // reflejar en el form lo saneado
    this.itemForm.descripcion = descripcion;
    this.itemForm.unidad = unidad;
    // @ts-ignore (si tu input de cantidad es number, esto igual funciona al asignar number)
    this.itemForm.cantidad = Number.isFinite(cantidad) ? cantidad : 0;

    if (!descripcion) return this.mostrarAdvertencia('Ingrese una descripción.');

    // unidad: alfanumérica y max 5
    if (!unidad) return this.mostrarAdvertencia('Seleccione una unidad.');
    if (!/^[A-Z0-9]{1,5}$/.test(unidad))
      return this.mostrarAdvertencia('La unidad solo acepta letras y números (máx. 5 caracteres).');

    // cantidad: solo número (con . o , permitido al escribir)
    if (!Number.isFinite(cantidad) || cantidad <= 0)
      return this.mostrarAdvertencia('Ingrese una cantidad válida.');

    if (moduloId <= 0)
      return this.mostrarAdvertencia('Seleccione un módulo para asociar el ítem.');

    const payload: any = {
      descripcion,
      unidad,
      cantidad,
      precio_unitario: 0,
      costo_parcial: 0,
      modulo_id: moduloId,
    };

    const req$ =
      this.modoEdicion && this.gastoEditando
        ? this.service.updateGastoOperacion({
            id: this.gastoEditando.id,
            ...payload,
          })
        : this.service.createGastoOperacion([payload]);

    req$
      .pipe(
        tap(() => this.service.notifyDataChanged()),
        catchError((err) => {
          console.error(err);
          this.mostrarError(err?.error?.error || 'Error al guardar el ítem.');
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.itemForm = this.nuevoForm();
        this.mostrarExito(
          this.modoEdicion
            ? 'Ítem actualizado correctamente.'
            : 'Ítem creado correctamente.',
          true,
        );
      });
  }

  eliminarGasto(id: number): void {
    this.clearMensajes();
    this.mostrarConfirmacion = true;
    this.mensajeConfirmacion = '¿Eliminar ítem?';
    this.idPendienteEliminar = id;
  }

  accionConfirmada(): void {
    if (this.idPendienteEliminar == null) return;

    const id = this.idPendienteEliminar;
    this.idPendienteEliminar = null;
    this.mostrarConfirmacion = false;

    this.service.deleteGastoOperacion(id).subscribe({
      next: () => {
        this.service.notifyDataChanged();
        this.mostrarExito('Ítem eliminado correctamente.', true);
      },
      error: (err) => {
        console.error(err);
        this.mostrarError(err?.error?.error || 'Error al eliminar el ítem.');
      },
    });
  }

  // =========================================================
  // 18) UNIDADES (AUTOCOMPLETE)
  // =========================================================
  mostrarUnidad(): void {
    this.opcionesUnidad = [...this.catalogoUnidades];
  }

  filtrarUnidad(): void {
    const texto = (this.itemForm.unidad || '').toUpperCase();
    this.opcionesUnidad = this.catalogoUnidades.filter((u) =>
      u.includes(texto),
    );
  }

  ocultarUnidad(): void {
    setTimeout(() => (this.opcionesUnidad = []), 150);
  }

  seleccionarUnidad(unidad: string): void {
    this.itemForm.unidad = unidad;
    this.opcionesUnidad = [];
  }

  // =========================================================
  // 19) OPERACIONES (MOVER / DUPLICAR)
  // =========================================================
  abrirModalAccion(item: GastoOperacionUI): void {
    this.itemSeleccionado = item;

    // por defecto mover
    this.accionAccionModal = 'MOVER';

    const actualId = this.getModuloIdDeGasto(item);

    // MOVER => no permite el mismo módulo
    this.modulosDestino = this.modulos.filter((m) => m.id !== actualId);

    this.moduloDestino = null;
    this.posicionDestino = 1;

    this.filtroModulosDestino = '';
    this.modulosDestinoFiltrados = [...this.modulosDestino];

    this.mostrarModalAccion = true;
  }

  cerrarModalAccion(): void {
    this.mostrarModalAccion = false;
  }

  setAccionModal(tipo: 'MOVER' | 'DUPLICAR'): void {
    this.accionAccionModal = tipo;
    if (!this.itemSeleccionado) return;

    const actualId = this.getModuloIdDeGasto(this.itemSeleccionado);

    this.modulosDestino =
      tipo === 'MOVER'
        ? this.modulos.filter((m) => m.id !== actualId)
        : [...this.modulos];

    this.moduloDestino = null;
    this.posicionDestino = 1;

    this.filtroModulosDestino = '';
    this.modulosDestinoFiltrados = [...this.modulosDestino];
  }

  getPosicionesDisponibles(moduloId: number): number[] {
    const items = this.getGastosPorModulo(moduloId);
    return Array.from({ length: items.length + 1 }, (_, i) => i + 1);
  }

  confirmarAccionModal(): void {
    if (!this.itemSeleccionado)
      return this.mostrarAdvertencia('Seleccione un ítem.');

    const destino = this.toNumber(this.moduloDestino);
    if (!destino) return this.mostrarAdvertencia('Seleccione módulo destino.');

    if (this.accionAccionModal === 'MOVER') {
      this.service
        .moverItem(this.itemSeleccionado.id, destino /*, this.posicionDestino*/)
        .pipe(
          tap(() => this.service.notifyDataChanged()),
          catchError((err) => {
            console.error(err);
            this.mostrarError(err?.error?.error || 'No se pudo mover el ítem.');
            return EMPTY;
          }),
        )
        .subscribe(() => {
          this.cerrarModalAccion();
          this.mostrarExito('Ítem movido correctamente.', false);
        });

      return;
    }

    this.service
      .duplicarItem(
        this.itemSeleccionado.id,
        destino /*, this.posicionDestino*/,
      )
      .pipe(
        tap(() => this.service.notifyDataChanged()),
        catchError((err) => {
          console.error(err);
          this.mostrarError(
            err?.error?.error || 'No se pudo duplicar el ítem.',
          );
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.cerrarModalAccion();
        this.mostrarExito('Ítem duplicado correctamente.', false);
      });
  }

  // =========================================================
  // 20) CAMBIOS (BULK UPDATE)
  // =========================================================
  hasChanges(g: any): boolean {
    return this.changedItemIds.has(Number(g?.id));
  }

  hayCambios(): boolean {
    return this.changedItemIds.size > 0;
  }

  actualizarTodosLosCambios(): void {
    this.clearMensajes();

    const ids = Array.from(this.changedItemIds);
    if (!ids.length) return;

    const reqs = ids
      .map((id) => this.gastos.find((x) => Number(x.id) === Number(id)))
      .filter(Boolean)
      .map((g) => {
        const ui = g as GastoOperacionUI;
        const moduloId = this.getModuloIdDeGasto(ui);

        const precioFinalUnit =
          Number(ui.gastosGenerales?.total) || Number(ui.precio_unitario) || 0;

        const cantidad = Number(ui.cantidad) || 0;

        // ✅ costo parcial exacto centavos
        const costoParcialC = this.mulQtyByUnitToCents(cantidad, precioFinalUnit);
        const costoParcial = this.fromCents(costoParcialC);

        const payload: any = {
          id: ui.id,
          descripcion: (ui.descripcion || '').toUpperCase().trim(),
          unidad: (ui.unidad || '').toUpperCase().trim(),
          cantidad,
          modulo_id: moduloId,
          precio_unitario: precioFinalUnit,
          costo_parcial: costoParcial,
        };

        return this.service.updateGastoOperacion(payload);
      });

    forkJoin(reqs)
      .pipe(
        tap(() => this.service.notifyDataChanged()),
        catchError((err) => {
          console.error(err);
          this.mostrarError(
            err?.error?.error || 'No se pudieron actualizar los ítems.',
          );
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.changedItemIds.clear();
        this.mostrarExito('Ítems actualizados en la base de datos.', false);
      });
  }

  // =========================================================
  // 21) INSUMOS (MODAL / CARGA / FILTRO / UPDATE)
  // =========================================================
  abrirModalInsumos(): void {
    this.mostrarModalInsumos = true;
    this.tipoInsumoSeleccionado = '';
    this.insumosProyecto = [];
    this.insumosFiltrados = [];
    this.filtroInsumos = '';
  }

  cerrarModalInsumos(): void {
    this.mostrarModalInsumos = false;
  }

  cargarInsumosProyecto(): void {
    this.clearMensajes();
    this.insumosProyecto = [];
    this.insumosFiltrados = [];
    this.filtroInsumos = '';

    if (!this.tipoInsumoSeleccionado) return;

    let req$;
    if (this.tipoInsumoSeleccionado === 'material') {
      req$ = this.service.getCatalogoMaterialesPorProyecto(this.idProyecto);
    } else if (this.tipoInsumoSeleccionado === 'manoDeObra') {
      req$ = this.service.getCatalogoManoDeObraPorProyecto(this.idProyecto);
    } else {
      req$ = this.service.getCatalogoEquipoHerramientaPorProyecto(
        this.idProyecto,
      );
    }

    req$
      .pipe(
        catchError((err) => {
          console.error(err);
          this.mostrarError('No se pudo cargar el catálogo de insumos.');
          return EMPTY;
        }),
      )
      .subscribe((rows: any[]) => {
        const map = new Map<
          string,
          {
            descripcion: string;
            precio_unitario: number;
            precioOriginal: number;
          }
        >();

        (rows || []).forEach((r) => {
          const desc = (r?.descripcion || '').toUpperCase().trim();
          if (!desc) return;

          const p = Number(r?.precio_unitario) || 0;

          if (!map.has(desc)) {
            map.set(desc, {
              descripcion: desc,
              precio_unitario: p,
              precioOriginal: p,
            });
          }
        });

        this.insumosProyecto = Array.from(map.values()).sort((a, b) =>
          a.descripcion.localeCompare(b.descripcion),
        );

        this.aplicarFiltroInsumos();
      });
  }

  onFiltroInsumosChange(): void {
    this.aplicarFiltroInsumos();
  }

  limpiarFiltroInsumos(): void {
    this.filtroInsumos = '';
    this.aplicarFiltroInsumos();
  }

  private aplicarFiltroInsumos(): void {
    const q = (this.filtroInsumos || '').trim().toUpperCase();
    const base = this.insumosProyecto || [];
    this.insumosFiltrados = !q
      ? base
      : base.filter((x) => (x.descripcion || '').toUpperCase().includes(q));
  }

  actualizarPrecioDesdeModal(i: any): void {
    this.clearMensajes();

    const descripcion = (i?.descripcion || '').toUpperCase().trim();
    const precio = Number(i?.precio_unitario);

    if (!descripcion) return this.mostrarAdvertencia('Descripción inválida.');
    if (!Number.isFinite(precio) || precio <= 0)
      return this.mostrarAdvertencia('Ingrese un precio unitario válido.');

    let update$;
    if (this.tipoInsumoSeleccionado === 'material') {
      update$ = this.service.actualizarPrecioMaterial(
        this.idProyecto,
        descripcion,
        precio,
      );
    } else if (this.tipoInsumoSeleccionado === 'manoDeObra') {
      update$ = this.service.actualizarPrecioManoObra(
        this.idProyecto,
        descripcion,
        precio,
      );
    } else {
      update$ = this.service.actualizarPrecioEquipo(
        this.idProyecto,
        descripcion,
        precio,
      );
    }

    update$
      .pipe(
        catchError((err) => {
          console.error(err);
          this.mostrarError(
            err?.error?.error || 'No se pudo actualizar el precio.',
          );
          return EMPTY;
        }),
      )
      .subscribe((res: any) => {
        i.precioOriginal = precio;

        const itemsAfectados = Number(res?.items_afectados ?? 0);
        const actualizados = Number(res?.actualizados ?? 0);

        this.mostrarExito(
          `Precio actualizado. Registros: ${actualizados}. Ítems recalculados: ${itemsAfectados}.`,
          true,
        );

        this.service.notifyDataChanged();
      });
  }

  // =========================================================
  // 22) NAVEGACIÓN
  // =========================================================
  enviarAEcuacion(item: GastoOperacion): void {
    this.router.navigate(['panel-control/CrearEcuacion'], {
      queryParams: {
        id_gasto_operaciones: item.id,
        id_proyecto: this.idProyecto,
        proyecto: this.nombreProyecto,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
      },
    });
  }

  enviarGastoOperacionParcialValorAgregado(): void {
    this.router.navigate(['panel-control/PrecioFactura'], {
      queryParams: {
        origen: 'PROYECTO',
        id_proyecto: this.idProyecto,
        total_proyecto_gastos_operacion_parcial:
          this.getTotalProyectoGastosOperacionParcial(),
        total_proyecto_valor_agregado: this.getTotalProyectoValorAgregado(),
      },
    });
  }

  enviarModuloAGastoOperacionParcialValorAgregado(moduloId: number): void {
    moduloId = Number(moduloId) || 0;
    if (!moduloId) return;

    this.router.navigate(['panel-control/PrecioFactura'], {
      queryParams: {
        origen: 'MODULO',
        id_proyecto: this.idProyecto,
        id_modulo: moduloId,
        total_modulo_gastos_operacion_parcial:
          this.getTotalModuloGastosOperacionParcial(moduloId),
        total_modulo_valor_agregado: this.getTotalModuloValorAgregado(moduloId),
      },
    });
  }

  enviarItemAGastoOperacionParcialValorAgregado(item: GastoOperacionUI): void {
    this.router.navigate(['panel-control/PrecioFactura'], {
      queryParams: {
        origen: 'ITEM',
        id_proyecto: this.idProyecto,
        id_item_gasto_operacion: item.id,
        total_Item_gasto_operacion_parcial:
          this.getTotalItemGastosOperacionesParcial(item),
        total_Item_valor_agregado_item: this.getValorAgregado(item),
      },
    });
  }

  // =========================================================
  // 23) PDF
  // =========================================================
  generarPDF(
    ctx: Contexto,
    payload: {
      id_modulo?: number;
      id_item?: number;
      nombreModulo?: string;
      descripcionItem?: string;
    },
  ): void {
    this.clearMensajes();

    const tipo: PdfTipo =
      ctx === 'PROYECTO'
        ? this.selectedPdfProyecto
        : ctx === 'MODULO'
          ? this.selectedPdfModulo[payload.id_modulo || 0] || ''
          : this.selectedPdfItem[payload.id_item || 0] || '';

    if (!tipo) return this.mostrarAdvertencia('Seleccione un PDF primero.');

    if (tipo === 'financiero') {
      this.generarReporteFinanciero(ctx, payload);
      return;
    }

    const data = {
      proyecto: this.proyecto!,
      modulos: this.modulos,
      gastos: this.gastos,
      materiales: this.materiales,
      manoDeObra: this.manoDeObra,
      equipos: this.equipos,
    };

    if (!this.proyecto) return this.mostrarError('Proyecto no cargado.');
    if (!data.materiales || !data.manoDeObra || !data.equipos)
      return this.mostrarAdvertencia(
        'Faltan datos para PDF (materiales/mano de obra/equipos). Asegúrate de cargarlos.',
      );

    try {
      if (ctx === 'PROYECTO') {
        if (
          tipo === 'preciogeneral' ||
          tipo === 'analisis' ||
          tipo === 'materiales' ||
          tipo === 'manoDeObra' ||
          tipo === 'equipos'
        ) {
          this.reportesPdf.generarReporteProyecto(tipo as any, data as any);
          this.mostrarExito('PDF generado correctamente.', false);
          this.selectedPdfProyecto = '';
          return;
        }
      }

      if (ctx === 'MODULO') {
        const idm = Number(payload.id_modulo) || 0;
        if (!idm) return;

        if (
          tipo === 'materiales' ||
          tipo === 'manoDeObra' ||
          tipo === 'equipos'
        ) {
          this.reportesPdf.generarReporteModulo(tipo as any, data as any, idm);
          this.mostrarExito('PDF generado correctamente.', false);
          this.selectedPdfModulo[idm] = '';
          return;
        }

        this.mostrarAdvertencia('Ese PDF no aplica para MÓDULO.');
        return;
      }

      if (ctx === 'ITEM') {
        const idi = Number(payload.id_item) || 0;
        if (!idi) return;

        if (
          tipo === 'materiales' ||
          tipo === 'manoDeObra' ||
          tipo === 'equipos'
        ) {
          this.reportesPdf.generarReporteItem(tipo as any, data as any, idi);
          this.mostrarExito('PDF generado correctamente.', false);
          this.selectedPdfItem[idi] = '';
          return;
        }

        this.mostrarAdvertencia('Ese PDF no aplica para ÍTEM.');
        return;
      }
    } catch (e: any) {
      this.mostrarAdvertencia(e?.message || 'No se pudo generar el PDF.');
    }
  }

  private generarReporteFinanciero(
    ctx: Contexto,
    payload: {
      id_modulo?: number;
      id_item?: number;
      nombreModulo?: string;
      descripcionItem?: string;
    },
  ): void {
    const p = this.proyecto;
    if (!p) return this.mostrarError('Proyecto no cargado.');

    let gastosOperacion = 0;
    let valorAgregado = 0;

    if (ctx === 'PROYECTO') {
      gastosOperacion = this.getTotalProyectoGastosOperacionParcial();
      valorAgregado = this.getTotalProyectoValorAgregado();
    }

    if (ctx === 'MODULO') {
      const idm = Number(payload.id_modulo) || 0;
      if (!idm) return;

      gastosOperacion = this.getTotalModuloGastosOperacionParcial(idm);
      valorAgregado = this.getTotalModuloValorAgregado(idm);
    }

    if (ctx === 'ITEM') {
      const idi = Number(payload.id_item) || 0;
      if (!idi) return;

      const item = this.gastos.find((x) => Number(x.id) === idi);
      if (!item) return this.mostrarError('Ítem no encontrado en la tabla.');

      gastosOperacion = this.getTotalItemGastosOperacionesParcial(item);
      valorAgregado = this.getValorAgregado(item);
    }

    this.reportesPdf.generarReporteFinanciero({
      origen: ctx,
      id_proyecto: this.idProyecto,
      id_modulo: payload.id_modulo,
      id_item: payload.id_item,

      nombreProyecto: this.nombreProyecto,
      nombreModulo: payload.nombreModulo || '',
      descripcionItem: payload.descripcionItem || '',

      gastosOperacion,
      valorAgregado,

      iva_tasa_nominal: Number(p.iva_tasa_nominal) || 0,
      it: Number(p.it) || 0,
      iue: Number(p.iue) || 0,
      ganancia: Number(p.ganancia) || 0,
      margen_utilidad: Number(p.margen_utilidad) || 0,
    });
  }

  // =========================================================
  // 24) MENSAJES / CIERRE MODALES
  // =========================================================
  manejarOk(): void {
    this.mensajeExito = '';
  }
  manejarError(): void {
    this.mensajeError = '';
  }
  manejarAdvertencia(): void {
    this.mensajeAdvertencia = '';
  }

  private clearMensajes(): void {
    this.mensajeExito = '';
    this.mensajeError = '';
    this.mensajeAdvertencia = '';
  }

  private mostrarExito(m: string, cerrarModal: boolean = true) {
    this.clearMensajes();
    this.mensajeExito = m;
    if (cerrarModal) this.cerrarModales();
    this.autoOcultarMensajes();
  }

  private mostrarError(m: string, cerrarModal: boolean = false) {
    this.clearMensajes();
    this.mensajeError = m;
    if (cerrarModal) this.cerrarModales();
    this.autoOcultarMensajes();
  }

  private mostrarAdvertencia(m: string, cerrarModal: boolean = false) {
    this.clearMensajes();
    this.mensajeAdvertencia = m;
    if (cerrarModal) this.cerrarModales();
    this.autoOcultarMensajes();
  }

  private cerrarModales(): void {
    this.mostrarModal = false;
    this.mostrarModalInsumos = false;
    this.mostrarModalAccion = false;
    this.mostrarModalMover = false;
    this.mostrarModalDuplicar = false;
    this.mostrarConfirmacion = false;
  }

  private autoOcultarMensajes(ms: number = 1800): void {
    if (this.msgTimer) clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => this.clearMensajes(), ms);
  }
}
