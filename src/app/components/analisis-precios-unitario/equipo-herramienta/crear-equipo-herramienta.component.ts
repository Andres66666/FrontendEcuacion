import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { ServiciosProyectos } from '../../gestion_proyectos/service/servicios-proyectos';
import {
  EquipoHerramienta,
  Proyecto,
} from '../../gestion_proyectos/models/modelosProyectos';

type RowVM = { index: number; uid: number };

type PrecioUpdate = {
  descripcion: string;
  precio: number;
  sourceIndex: number;
};

@Component({
  selector: 'app-crear-equipo-herramienta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './crear-equipo-herramienta.component.html',
  styleUrls: ['./crear-equipo-herramienta.component.css'],
})
export class CrearEquipoHerramientaComponent implements OnInit {
  @Input() proyectoData!: Proyecto;
  @Input() id_gasto_operaciones!: number;

  formulario!: FormGroup;

  herramientas = 0;
  totalManoObra = 0;

  private id_proyecto = 0;

  catalogoEquipoHerramienta: EquipoHerramienta[] = [];
  catalogoUnidades: string[] = [];

  // Autocomplete UI maps (indexados por índice del FormArray)
  opcionesDescripcion: Record<number, EquipoHerramienta[]> = {};
  opcionesUnidad: Record<number, string[]> = {};
  selectedIndexUnidad: Record<number, number> = {};

  // Filtro
  filtroDescripcion = '';

  private uidSeq = 0;

  private precioUnitario$ = new BehaviorSubject<PrecioUpdate | null>(null);

  constructor(
    private fb: FormBuilder,
    private servicio: ServiciosProyectos,
    private route: ActivatedRoute,
  ) {}

  // ================== LIFECYCLE ==================
  ngOnInit(): void {
    this.initForm();
    this.bindPrecioGlobal();
    this.bindRouteParams();

    this.servicio.totalManoObra$.subscribe(
      (total) => (this.totalManoObra = total),
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyectoData'] && this.proyectoData) {
      this.herramientas = this.proyectoData.herramientas;
    }
  }

  // ================== INIT / BINDINGS ==================
  private initForm(): void {
    this.formulario = this.fb.group({ equipos: this.fb.array([]) });
    this.ensureDraftRow(); // siempre 1 fila vacía al inicio
  }

  private bindRouteParams(): void {
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      if (this.id_gasto_operaciones) this.loadInitialData();
    });
  }

  private bindPrecioGlobal(): void {
    this.precioUnitario$.subscribe((update) => {
      if (!update) return;

      const descKey = update.descripcion.toUpperCase();

      this.equipos.controls.forEach((ctrl, idx) => {
        if (idx === update.sourceIndex) return;

        const fg = ctrl as FormGroup;
        const desc = this.upperTrim(fg.get('descripcion')?.value);

        if (desc === descKey) {
          fg.get('precio_unitario')?.setValue(update.precio, {
            emitEvent: false,
          });
          this.actualizarPrecioParcial(fg);
        }
      });
    });
  }

  private loadInitialData(): void {
    this.servicio
      .getGastoOperacionById(this.id_gasto_operaciones)
      .subscribe((gasto: any) => {
        this.id_proyecto =
          Number(gasto?.modulo?.proyecto?.id_proyecto) ||
          Number(gasto?.modulo?.proyecto_id) ||
          0;

        if (!this.id_proyecto) {
          console.warn(
            'No se pudo determinar id_proyecto desde GastoOperacion:',
            gasto,
          );
          return;
        }

        this.cargarEquipoHerramienta();
        this.cargarCatalogo();
      });
  }

  // ================== GETTERS / VIEWMODEL ==================
  get equipos(): FormArray {
    return this.formulario.get('equipos') as FormArray;
  }

  get indicesVisibles(): RowVM[] {
    const term = this.upperTrim(this.filtroDescripcion);
    const lastIndex = this.equipos.length - 1;

    const out: RowVM[] = [];

    for (let i = 0; i < this.equipos.length; i++) {
      const fg = this.getFg(i);

      //  siempre mostrar última fila draft
      if (i === lastIndex && !this.isRowWithId(fg)) {
        out.push({ index: i, uid: this.uidOfIndex(i) });
        continue;
      }

      //  sin filtro
      if (!term) {
        out.push({ index: i, uid: this.uidOfIndex(i) });
        continue;
      }

      //  con filtro por descripción
      const desc = this.upperTrim(fg.get('descripcion')?.value);
      if (desc.includes(term)) out.push({ index: i, uid: this.uidOfIndex(i) });
    }

    return out;
  }

  trackByUid = (_: number, row: RowVM) => row.uid;

  // ================== AUTOCOMPLETE: DESCRIPCIÓN ==================
  mostrarDescripcion(i: number): void {
    this.opcionesDescripcion[i] =
      (this.opcionesDescripcion[i]?.length ?? 0) === 0
        ? [...this.catalogoEquipoHerramienta]
        : [];
  }

  filtrarDescripcion(i: number): void {
    const texto = this.upperTrim(this.getFg(i).get('descripcion')?.value);
    this.opcionesDescripcion[i] = this.catalogoEquipoHerramienta.filter((e) =>
      e.descripcion.includes(texto),
    );
  }

  seleccionarDescripcion(i: number, equipo: EquipoHerramienta): void {
    if (this.existeEquipoHerramientaEnItem(equipo.descripcion, i)) {
      alert('Esta equipo/herramienta ya está registrada en este ítem.');
      this.opcionesDescripcion[i] = [];
      return;
    }

    const fg = this.getFg(i);

    fg.patchValue(
      {
        descripcion: equipo.descripcion,
        precio_unitario: equipo.precio_unitario,
        unidad: equipo.unidad || fg.get('unidad')?.value || '',
      },
      { emitEvent: false },
    );

    this.actualizarPrecioParcial(fg);

    if (this.isRowWithId(fg)) fg.markAsDirty();
    this.opcionesDescripcion[i] = [];
  }

  ocultarDescripcion(i: number): void {
    setTimeout(() => (this.opcionesDescripcion[i] = []), 200);
  }

  // ================== AUTOCOMPLETE: UNIDAD ==================
  mostrarUnidad(i: number): void {
    this.opcionesUnidad[i] =
      (this.opcionesUnidad[i]?.length ?? 0) === 0
        ? [...this.catalogoUnidades]
        : [];
    this.selectedIndexUnidad[i] = -1;
  }

  filtrarUnidad(i: number): void {
    const texto = this.upperTrim(this.getFg(i).get('unidad')?.value);
    this.opcionesUnidad[i] = this.catalogoUnidades.filter((u) =>
      u.includes(texto),
    );
  }

  seleccionarUnidad(i: number, unidad: string): void {
    this.getFg(i).get('unidad')?.setValue(unidad);
    this.opcionesUnidad[i] = [];
  }

  ocultarUnidad(i: number): void {
    setTimeout(() => (this.opcionesUnidad[i] = []), 200);
  }

  onUnidadKeyDown(event: KeyboardEvent, i: number): void {
    if (!this.opcionesUnidad[i]?.length) return;

    const opciones = this.opcionesUnidad[i];
    let selectedIndex = this.selectedIndexUnidad[i] ?? -1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedIndex = (selectedIndex + 1) % opciones.length;
      this.selectedIndexUnidad[i] = selectedIndex;
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedIndex =
        selectedIndex <= 0 ? opciones.length - 1 : selectedIndex - 1;
      this.selectedIndexUnidad[i] = selectedIndex;
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (selectedIndex >= 0)
        this.seleccionarUnidad(i, opciones[selectedIndex]);
      return;
    }

    if (event.key === 'Escape') {
      this.ocultarUnidad(i);
    }
  }

  private existeEquipoHerramientaEnItem(desc: string, index: number): boolean {
    const busqueda = this.upperTrim(desc);
    return this.equipos.controls.some((c, i) => {
      if (i === index) return false;
      const other = this.upperTrim((c as FormGroup).get('descripcion')?.value);
      return other === busqueda;
    });
  }

  // ================== CARGAS ==================
  private cargarEquipoHerramienta(): void {
    this.servicio
      .getEquipoHerramientas(this.id_gasto_operaciones)
      .subscribe((data: EquipoHerramienta[]) => {
        this.equipos.clear();
        this.opcionesDescripcion = {};
        this.opcionesUnidad = {};
        this.selectedIndexUnidad = {};

        (data || []).forEach((e, i) => {
          this.equipos.push(this.crearFormEquipoHerramienta(e));
          this.opcionesDescripcion[i] = [];
          this.opcionesUnidad[i] = [];
          this.selectedIndexUnidad[i] = -1;
        });

        this.ensureDraftRow();
      });
  }

  private cargarCatalogo(): void {
    this.servicio
      .getCatalogoEquipoHerramientaPorProyecto(this.id_proyecto)
      .subscribe((data: any[]) => {
        this.catalogoEquipoHerramienta = (data || []).map((e) => ({
          id: 0,
          gasto_operacion: 0,
          descripcion: (e.descripcion || '').toUpperCase(),
          unidad: (e.unidad || '').toUpperCase(),
          cantidad: 0,
          precio_unitario: Number(e.ultimo_precio ?? e.precio_unitario ?? 0),
          total: 0,
        }));
      });

    this.servicio.getUnidadesEquipoHerramienta().subscribe((unis: string[]) => {
      this.catalogoUnidades = (unis || []).map((u) => (u || '').toUpperCase());
    });
  }

  // ================== FILA DRAFT ==================
  private ensureDraftRow(): void {
    if (this.equipos.length === 0) {
      this.equipos.push(this.crearFormEquipoHerramienta());
      this.reindexUiMaps();
      return;
    }

    const lastIndex = this.equipos.length - 1;
    const last = this.getFg(lastIndex);

    // si la última fila ya tiene id => agregar nueva fila vacía
    if (this.isRowWithId(last)) {
      this.equipos.push(this.crearFormEquipoHerramienta());
      this.reindexUiMaps();
      return;
    }

    // si es draft y está totalmente vacía => asegurar total 0 y estado limpio
    if (this.isDraftCompletelyEmpty(last)) {
      last.get('total')?.setValue(0, { emitEvent: false });
      last.markAsPristine();
      last.markAsUntouched();
    }
  }

  private isDraftRow(index: number): boolean {
    if (index !== this.equipos.length - 1) return false;
    return !this.isRowWithId(this.getFg(index));
  }

  private isDraftCompletelyEmpty(fg: FormGroup): boolean {
    const desc = (fg.get('descripcion')?.value || '').toString().trim();
    const uni = (fg.get('unidad')?.value || '').toString().trim();
    const cant = fg.get('cantidad')?.value;
    const pu = fg.get('precio_unitario')?.value;

    return (
      !desc && !uni && (cant === null || Number(cant || 0) === 0) && pu === null
    );
  }

  // ================== CRUD ==================
  guardar(i: number): void {
    const fg = this.getFg(i);
    if (fg.invalid) return;

    const equipo = this.mapearEquipoHerramienta(fg);
    const esNuevo = !this.isRowWithId(fg);

    const request$ = esNuevo
      ? this.servicio.createEquipoHerramienta(equipo)
      : this.servicio.updateEquipoHerramienta(equipo);

    request$.subscribe({
      next: (response: any) => {
        if (esNuevo && response?.id) {
          fg.get('id')?.setValue(response.id, { emitEvent: false });
        }

        this.syncPrecioGlobalIfNeeded(fg, equipo);
        fg.markAsPristine();

        if (esNuevo) this.ensureDraftRow();
      },
      error: () => alert('Error al guardar. Intente nuevamente.'),
    });
  }

  eliminar(i: number): void {
    const fg = this.getFg(i);
    const id = fg.get('id')?.value;

    // draft => limpiar y quedarse en la tabla
    if (!id) {
      this.resetDraftRow(i, fg);
      return;
    }

    // registrado => eliminar de backend y quitar fila
    this.servicio.deleteEquipoHerramienta(id).subscribe({
      next: () => {
        this.equipos.removeAt(i);
        this.reindexUiMaps();
        this.ensureDraftRow();
      },
      error: () => alert('Error al eliminar. Intente nuevamente.'),
    });
  }

  private syncPrecioGlobalIfNeeded(
    fg: FormGroup,
    equipo: EquipoHerramienta,
  ): void {
    const origDesc = this.upperTrim(fg.get('_orig_desc')?.value);
    const origPrecio = Number(fg.get('_orig_precio')?.value ?? 0);

    const descNuevo = this.upperTrim(equipo.descripcion);
    const precioNuevo = Number(equipo.precio_unitario ?? 0);

    const cambio = descNuevo !== origDesc || precioNuevo !== origPrecio;

    if (cambio && this.id_proyecto && descNuevo && precioNuevo > 0) {
      this.servicio
        .actualizarPrecioEquipo(this.id_proyecto, descNuevo, precioNuevo)
        .subscribe({
          next: () => {
            fg.get('_orig_desc')?.setValue(descNuevo, { emitEvent: false });
            fg.get('_orig_precio')?.setValue(precioNuevo, { emitEvent: false });
            this.cargarCatalogo();
          },
          error: () =>
            alert('Se guardó, pero falló la actualización global del precio.'),
        });
      return;
    }

    fg.get('_orig_desc')?.setValue(descNuevo, { emitEvent: false });
    fg.get('_orig_precio')?.setValue(precioNuevo, { emitEvent: false });
  }

  private readonly ALFANUM_ESPACIOS = /^[A-Z0-9ÁÉÍÓÚÜÑ ]+$/i; // descripción
  private readonly ALFANUM = /^[A-Z0-9ÁÉÍÓÚÜÑ]+$/i;            // unidad

  private sanitizeDescripcion(v: any): string {
    return (v ?? '')
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9ÁÉÍÓÚÜÑ ]+/g, '') // solo letras/números/espacios
      .replace(/\s+/g, ' ')
      .trimStart();
  }

  private sanitizeUnidad(v: any): string {
    return (v ?? '')
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9ÁÉÍÓÚÜÑ]+/g, '') // solo letras/números
      .trimStart();
  }


  // Reemplaza convertirAMayusculas por este

  convertirAMayusculas(i: number, campo: string): void {
    const ctrl = this.getFg(i).get(campo);
    if (!ctrl) return;

    if (campo === 'descripcion') {
      ctrl.setValue(this.sanitizeDescripcion(ctrl.value), { emitEvent: false });
      return;
    }

    if (campo === 'unidad') {
      ctrl.setValue(this.sanitizeUnidad(ctrl.value), { emitEvent: false });
      return;
    }

    ctrl.setValue((ctrl.value ?? '').toString().toUpperCase(), {
      emitEvent: false,
    });
  }


  // Modifica SOLO descripcion y unidad en crearFormEquipoHerramienta

  private crearFormEquipoHerramienta(equipo?: EquipoHerramienta): FormGroup {
    const fg = this.fb.group({
      id: [equipo?.id ?? null],

      descripcion: [
        equipo?.descripcion ?? '',
        [Validators.required, Validators.pattern(this.ALFANUM_ESPACIOS)],
      ],

      unidad: [
        equipo?.unidad ?? '',
        [Validators.required, Validators.pattern(this.ALFANUM)],
      ],

      cantidad: [
        equipo?.cantidad ?? null,
        [Validators.required, Validators.min(0)],
      ],
      precio_unitario: [
        equipo?.precio_unitario ?? null,
        [Validators.required, Validators.min(0)],
      ],
      total: [equipo?.total ?? 0],

      _orig_desc: [(equipo?.descripcion ?? '').toUpperCase().trim()],
      _orig_precio: [Number(equipo?.precio_unitario ?? 0)],
    });

    this.attachUid(fg);

    // Sanitiza mientras escribe
    fg.valueChanges.subscribe(() => {
      const d = fg.get('descripcion')!;
      const u = fg.get('unidad')!;

      const dSan = this.sanitizeDescripcion(d.value);
      if (d.value !== dSan) d.setValue(dSan, { emitEvent: false });

      const uSan = this.sanitizeUnidad(u.value);
      if (u.value !== uSan) u.setValue(uSan, { emitEvent: false });

      if (this.isRowWithId(fg)) fg.markAsDirty();
    });

    fg.get('cantidad')?.valueChanges.subscribe(() =>
      this.actualizarPrecioParcial(fg),
    );
    fg.get('precio_unitario')?.valueChanges.subscribe(() =>
      this.actualizarPrecioParcial(fg),
    );

    return fg;
  }

  private mapearEquipoHerramienta(control: AbstractControl): EquipoHerramienta {
    const raw = (control as FormGroup).getRawValue();

    const cantidad = this.parseNumero(raw.cantidad);
    const precio = this.parseNumero(raw.precio_unitario);
    const total = this.fromCents(this.mulToCents(cantidad, precio));

    return {
      id: raw.id ?? 0,
      gasto_operacion: this.id_gasto_operaciones,
      descripcion: this.upperTrim(raw.descripcion),
      unidad: this.upperTrim(raw.unidad),
      cantidad,
      precio_unitario: precio,
      total,
    };
  }

  private resetDraftRow(i: number, fg: FormGroup): void {
    fg.reset(
      {
        id: null,
        descripcion: '',
        unidad: '',
        cantidad: null,
        precio_unitario: null,
        total: 0,
        _orig_desc: '',
        _orig_precio: 0,
      },
      { emitEvent: false },
    );

    fg.markAsPristine();
    fg.markAsUntouched();

    this.opcionesDescripcion[i] = [];
    this.opcionesUnidad[i] = [];
    this.selectedIndexUnidad[i] = -1;
  }

  // ================== UTILITARIOS UI ==================
  onPrecioUniChange(control: AbstractControl, index?: number): void {
    const fg = control as FormGroup;

    const desc = this.upperTrim(fg.get('descripcion')?.value);
    const precio = this.parseNumero(fg.get('precio_unitario')?.value);

    if (!desc) return;

    this.actualizarPrecioParcial(fg);

    if (precio > 0 && index !== undefined) {
      this.precioUnitario$.next({
        descripcion: desc,
        precio,
        sourceIndex: index,
      });
    }
  }

  // ================== TOTALES / CÁLCULOS ==================
  get subtotalEquipos(): number {
    const subtotalCents = this.equipos.controls.reduce((acc, c) => {
      const fg = c as FormGroup;

      // no sumar la fila draft vacía
      if (
        !this.isRowWithId(fg) &&
        this.isDraftRow(this.equipos.controls.indexOf(c))
      ) {
        const desc = (fg.get('descripcion')?.value || '').toString().trim();
        const pu = fg.get('precio_unitario')?.value;
        const cant = fg.get('cantidad')?.value;

        if (!desc && !pu && !cant) return acc;
      }

      return acc + this.toCents(this.calcularPrecioParcial(c));
    }, 0);

    return this.fromCents(subtotalCents);
  }

  get herramientasPorcentaje(): number {
    const baseCents = this.toCents(this.totalManoObra);
    const herrCents = this.applyPercentCents(baseCents, this.herramientas);
    return this.fromCents(herrCents);
  }

  get totalEquipos(): number {
    const totalCents =
      this.toCents(this.subtotalEquipos) +
      this.toCents(this.herramientasPorcentaje);
    const total = this.fromCents(totalCents);
    this.servicio.setTotalEquipos(total);
    return total;
  }

  calcularPrecioParcial(equipo: AbstractControl): number {
    const fg = equipo as FormGroup;
    const cantidad = fg.get('cantidad')?.value;
    const precio = fg.get('precio_unitario')?.value;
    return this.fromCents(this.mulToCents(cantidad, precio));
  }

  actualizarPrecioParcial(control: AbstractControl): void {
    const total = this.calcularPrecioParcial(control);
    (control as FormGroup).get('total')?.setValue(total, { emitEvent: false });
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor || 0);
  }

  // ================== NUMBERS ==================
  parseNumero(valor: any): number {
    const s = this.normalizarDecimalInput(valor);
    if (!s || s === '-') return 0;
    const n = Number(s);
    return isFinite(n) ? n : 0;
  }

  private toCents(valor: any): number {
    const n = this.parseNumero(valor);
    return Math.round((n + Number.EPSILON) * 100);
  }

  private fromCents(cents: number): number {
    return cents / 100;
  }

  private pctToBasisPoints(pct: any): number {
    const p = this.parseNumero(pct);
    return Math.round((p + Number.EPSILON) * 100);
  }

  private applyPercentCents(baseCents: number, pct: any): number {
    const bp = this.pctToBasisPoints(pct);
    return Math.round((baseCents * bp) / 10000);
  }

  private mulToCents(a: any, b: any): number {
    const x = this.parseNumero(a);
    const y = this.parseNumero(b);
    return Math.round((x * y + Number.EPSILON) * 100);
  }

  private normalizarDecimalInput(valor: any): string {
    if (valor === null || valor === undefined) return '';
    const s = valor.toString().trim();
    if (!s) return '';

    const limpio = s.replace(/[^\d,.\-]/g, '');

    if (limpio.includes(',') && limpio.includes('.')) {
      return limpio.replace(/\./g, '').replace(',', '.');
    }
    if (limpio.includes(',')) return limpio.replace(',', '.');
    return limpio;
  }

  // ================== UID / MAPS ==================
  private attachUid(fg: FormGroup): void {
    (fg as any).__uid = ++this.uidSeq;
  }

  private uidOfIndex(i: number): number {
    return (this.getFg(i) as any).__uid ?? 0;
  }

  private reindexUiMaps(): void {
    const descMap: Record<number, EquipoHerramienta[]> = {};
    const uniMap: Record<number, string[]> = {};
    const selMap: Record<number, number> = {};

    for (let i = 0; i < this.equipos.length; i++) {
      descMap[i] = this.opcionesDescripcion[i] ?? [];
      uniMap[i] = this.opcionesUnidad[i] ?? [];
      selMap[i] = this.selectedIndexUnidad[i] ?? -1;
    }

    this.opcionesDescripcion = descMap;
    this.opcionesUnidad = uniMap;
    this.selectedIndexUnidad = selMap;
  }

  // ================== HELPERS ==================
  private getFg(i: number): FormGroup {
    return this.equipos.at(i) as FormGroup;
  }

  private isRowWithId(fg: FormGroup): boolean {
    return !!fg.get('id')?.value;
  }

  private upperTrim(v: any): string {
    return (v ?? '').toString().trim().toUpperCase();
  }
}
