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
  ManoDeObra,
  Proyecto,
} from '../../gestion_proyectos/models/modelosProyectos';

type RowVM = { index: number; uid: number };

type PrecioUpdate = {
  descripcion: string;
  precio: number;
  sourceIndex: number;
};

@Component({
  selector: 'app-crear-mano-de-obra',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './crear-mano-de-obra.component.html',
  styleUrls: ['./crear-mano-de-obra.component.css'],
})
export class CrearManoDeObraComponent implements OnInit {
  @Input() proyectoData!: Proyecto;
  @Input() id_gasto_operaciones!: number;

  formulario!: FormGroup;

  carga_social = 0;
  iva_efectiva = 0;

  private id_proyecto = 0;
  private uidSeq = 0;

  // Catálogos
  catalogoManoDeObra: ManoDeObra[] = [];
  catalogoUnidades: string[] = [];

  // Autocomplete UI maps (indexados por índice del FormArray)
  opcionesDescripcion: Record<number, ManoDeObra[]> = {};
  opcionesUnidad: Record<number, string[]> = {};
  selectedIndexUnidad: Record<number, number> = {};

  // Filtro
  filtroDescripcion = '';

  // Propagación de precio unitario a filas con misma descripción
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
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyectoData'] && this.proyectoData) {
      this.carga_social = this.parseNumero(
        this.proyectoData.carga_social as any,
      );
      this.iva_efectiva = this.parseNumero(
        this.proyectoData.iva_efectiva as any,
      );
    }
  }

  // ================== INIT / BINDINGS ==================
  private initForm(): void {
    this.formulario = this.fb.group({ manoObra: this.fb.array([]) });
    this.ensureDraftRow(); // siempre arranca con 1 fila vacía
  }

  private bindRouteParams(): void {
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      if (this.id_gasto_operaciones) this.loadInitialData();
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

        this.cargarManoDeObra();
        this.cargarCatalogo();
      });
  }

  private bindPrecioGlobal(): void {
    this.precioUnitario$.subscribe((update) => {
      if (!update) return;

      const descKey = update.descripcion.toUpperCase();

      this.manoObra.controls.forEach((ctrl, idx) => {
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

  // ================== GETTERS / VIEWMODEL ==================
  get manoObra(): FormArray {
    return this.formulario.get('manoObra') as FormArray;
  }

  get indicesVisibles(): RowVM[] {
    const term = this.upperTrim(this.filtroDescripcion);
    const lastIndex = this.manoObra.length - 1;

    const out: RowVM[] = [];

    for (let i = 0; i < this.manoObra.length; i++) {
      const fg = this.getFg(i);

      // ✅ siempre mostrar última fila draft
      if (i === lastIndex && !this.isRowWithId(fg)) {
        out.push({ index: i, uid: this.uidOfIndex(i) });
        continue;
      }

      // ✅ sin filtro
      if (!term) {
        out.push({ index: i, uid: this.uidOfIndex(i) });
        continue;
      }

      // ✅ con filtro
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
        ? [...this.catalogoManoDeObra]
        : [];
  }

  filtrarDescripcion(i: number): void {
    const texto = this.upperTrim(this.getFg(i).get('descripcion')?.value);
    this.opcionesDescripcion[i] = this.catalogoManoDeObra.filter((m) =>
      m.descripcion.includes(texto),
    );
  }

  seleccionarDescripcion(i: number, mano: ManoDeObra): void {
    if (this.existeManoDeObraEnItem(mano.descripcion, i)) {
      alert('Esta mano de obra ya está registrada en este ítem.');
      this.opcionesDescripcion[i] = [];
      return;
    }

    const fg = this.getFg(i);

    fg.patchValue(
      {
        descripcion: mano.descripcion,
        precio_unitario: mano.precio_unitario,
        unidad: mano.unidad || fg.get('unidad')?.value || '',
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

  private existeManoDeObraEnItem(desc: string, index: number): boolean {
    const busqueda = this.upperTrim(desc);
    return this.manoObra.controls.some((c, i) => {
      if (i === index) return false;
      const other = this.upperTrim((c as FormGroup).get('descripcion')?.value);
      return other === busqueda;
    });
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

    if (event.key === 'Escape') this.ocultarUnidad(i);
  }

  // ================== CARGAS ==================
  private cargarManoDeObra(): void {
    this.servicio
      .getManoDeObraIDGasto(this.id_gasto_operaciones)
      .subscribe((data: ManoDeObra[]) => {
        this.manoObra.clear();
        this.opcionesDescripcion = {};
        this.opcionesUnidad = {};
        this.selectedIndexUnidad = {};

        (data || []).forEach((m, i) => {
          this.manoObra.push(this.crearFormManoDeObra(m));
          this.opcionesDescripcion[i] = [];
          this.opcionesUnidad[i] = [];
          this.selectedIndexUnidad[i] = -1;
        });

        this.ensureDraftRow();
      });
  }

  private cargarCatalogo(): void {
    this.servicio
      .getCatalogoManoDeObraPorProyecto(this.id_proyecto)
      .subscribe((data: any[]) => {
        this.catalogoManoDeObra = (data || []).map((m) => ({
          id: 0,
          gasto_operacion: 0,
          descripcion: (m.descripcion || '').toUpperCase(),
          unidad: (m.unidad || '').toUpperCase(),
          cantidad: 0,
          precio_unitario: Number(m.precio_unitario ?? m.ultimo_precio ?? 0),
          total: 0,
        }));
      });

    this.servicio.getUnidadesManoDeObra().subscribe((unis: string[]) => {
      this.catalogoUnidades = (unis || []).map((u) => (u || '').toUpperCase());
    });
  }

  // ================== FILA DRAFT ==================
  private ensureDraftRow(): void {
    if (this.manoObra.length === 0) {
      this.manoObra.push(this.crearFormManoDeObra());
      this.reindexUiMaps();
      return;
    }

    const lastIndex = this.manoObra.length - 1;
    const last = this.getFg(lastIndex);

    // si la última fila ya tiene id => agregar nueva fila vacía
    if (this.isRowWithId(last)) {
      this.manoObra.push(this.crearFormManoDeObra());
      this.reindexUiMaps();
      return;
    }

    // si es draft y está totalmente vacía => limpiar estado
    if (this.isDraftCompletelyEmpty(last)) {
      last.get('total')?.setValue(0, { emitEvent: false });
      last.markAsPristine();
      last.markAsUntouched();
    }
  }

  private isDraftRow(index: number): boolean {
    if (index !== this.manoObra.length - 1) return false;
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

  private resetDraftRow(i: number, fg: FormGroup): void {
    fg.reset(
      {
        id: null,
        descripcion: '',
        unidad: '',
        cantidad: null,
        precio_unitario: null,
        total: 0,
      },
      { emitEvent: false },
    );

    fg.markAsPristine();
    fg.markAsUntouched();

    this.opcionesDescripcion[i] = [];
    this.opcionesUnidad[i] = [];
    this.selectedIndexUnidad[i] = -1;
  }

  // ================== CRUD ==================
  guardar(i: number): void {
    const fg = this.getFg(i);
    if (fg.invalid) return;

    const mano = this.mapearManoDeObra(fg);
    const esNuevo = !this.isRowWithId(fg);

    const request$ = esNuevo
      ? this.servicio.createManoDeObra(mano)
      : this.servicio.updateManoDeObra(mano);

    request$.subscribe({
      next: (response: any) => {
        if (esNuevo && response?.id) {
          fg.get('id')?.setValue(response.id, { emitEvent: false });
        }

        fg.markAsPristine();

        // ✅ si era draft, crear otra fila vacía abajo
        if (esNuevo) this.ensureDraftRow();
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        alert('Error al guardar. Intente nuevamente.');
      },
    });
  }

  eliminar(i: number): void {
    const fg = this.getFg(i);
    const id = fg.get('id')?.value;

    // draft => limpiar y quedarse
    if (!id) {
      this.resetDraftRow(i, fg);
      return;
    }

    this.servicio.deleteManoDeObra(id).subscribe({
      next: () => {
        this.manoObra.removeAt(i);
        this.reindexUiMaps();
        this.ensureDraftRow();
      },
      error: (err) => {
        console.error('Error al eliminar:', err);
        alert('Error al eliminar. Intente nuevamente.');
      },
    });
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

    // ✅ si está guardado, actualiza precio global backend (sin recargar tabla)
    if (this.isRowWithId(fg) && this.id_proyecto && precio > 0) {
      this.servicio
        .actualizarPrecioManoObra(this.id_proyecto, desc, precio)
        .subscribe({
          next: () => this.cargarCatalogo(),
          error: (err) => {
            console.error('Error al actualizar precio global:', err);
            alert('Se guardó, pero falló la actualización global del precio.');
          },
        });
    }
  }


  // ================== FORM BUILD / MAP ==================

  // 1) agrega esto dentro de la clase
  private readonly ALFANUM_ESPACIOS = /^[A-Z0-9ÁÉÍÓÚÜÑ ]+$/i; // DESCRIPCIÓN
  private readonly ALFANUM = /^[A-Z0-9ÁÉÍÓÚÜÑ]+$/i;          // UNIDAD

  private sanitizeDescripcion(v: any): string {
    return (v ?? '')
      .toString()
      .toUpperCase()
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

  // 2) reemplaza convertirAMayusculas por este
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

    ctrl.setValue((ctrl.value ?? '').toString().toUpperCase(), { emitEvent: false });
  }

  // 3) en crearFormManoDeObra(), cambia SOLO validators de descripcion/unidad
  private crearFormManoDeObra(mano?: ManoDeObra): FormGroup {
    const fg = this.fb.group({
      id: [mano?.id ?? null],

      //  descripcion ahora acepta caracteres especiales
      descripcion: [
        mano?.descripcion ?? '',
        [Validators.required], // antes: Validators.pattern(this.ALFANUM_ESPACIOS)
      ],

      unidad: [
        mano?.unidad ?? '',
        [Validators.required, Validators.pattern(this.ALFANUM)],
      ],

      cantidad: [mano?.cantidad ?? null, [Validators.required, Validators.min(0)]],
      precio_unitario: [
        mano?.precio_unitario ?? null,
        [Validators.required, Validators.min(0)],
      ],
      total: [mano?.total ?? 0],
    });

    this.attachUid(fg);

    fg.valueChanges.subscribe(() => {
      const d = fg.get('descripcion')!;
      const u = fg.get('unidad')!;

      //  no elimina símbolos
      const dSan = this.sanitizeDescripcion(d.value);
      if (d.value !== dSan) d.setValue(dSan, { emitEvent: false });

      const uSan = this.sanitizeUnidad(u.value);
      if (u.value !== uSan) u.setValue(uSan, { emitEvent: false });

      if (this.isRowWithId(fg)) fg.markAsDirty();
    });

    fg.get('cantidad')?.valueChanges.subscribe(() => this.actualizarPrecioParcial(fg));
    fg.get('precio_unitario')?.valueChanges.subscribe(() => this.actualizarPrecioParcial(fg));

    return fg;
  }

  private mapearManoDeObra(control: AbstractControl): ManoDeObra {
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

  // ================== TOTALES ==================
  get subtotalManoObra(): number {
    const subtotalCents = this.manoObra.controls.reduce((acc, c) => {
      const fg = c as FormGroup;

      // no sumar la fila draft vacía
      if (
        !this.isRowWithId(fg) &&
        this.isDraftRow(this.manoObra.controls.indexOf(c))
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

  get cargasManoObra(): number {
    const subtotalCents = this.toCents(this.subtotalManoObra);
    const cargasCents = this.applyPercentCents(
      subtotalCents,
      this.carga_social,
    );
    return this.fromCents(cargasCents);
  }

  get ivaManoObra(): number {
    const subtotalCents = this.toCents(this.subtotalManoObra);
    const cargasCents = this.toCents(this.cargasManoObra);
    const baseCents = subtotalCents + cargasCents;
    const ivaCents = this.applyPercentCents(baseCents, this.iva_efectiva);
    return this.fromCents(ivaCents);
  }

  get totalManoObra(): number {
    const totalCents =
      this.toCents(this.subtotalManoObra) +
      this.toCents(this.cargasManoObra) +
      this.toCents(this.ivaManoObra);

    const total = this.fromCents(totalCents);
    this.servicio.setTotalManoObra(total);
    return total;
  }

  calcularPrecioParcial(ctrl: AbstractControl): number {
    const fg = ctrl as FormGroup;
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
    if (limpio.includes(',') && limpio.includes('.'))
      return limpio.replace(/\./g, '').replace(',', '.');
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
    const descMap: Record<number, ManoDeObra[]> = {};
    const uniMap: Record<number, string[]> = {};
    const selMap: Record<number, number> = {};

    for (let i = 0; i < this.manoObra.length; i++) {
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
    return this.manoObra.at(i) as FormGroup;
  }

  private isRowWithId(fg: FormGroup): boolean {
    return !!fg.get('id')?.value;
  }

  private upperTrim(v: any): string {
    return (v ?? '').toString().trim().toUpperCase();
  }
}
