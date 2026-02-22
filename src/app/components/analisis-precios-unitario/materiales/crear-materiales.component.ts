import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
import { BehaviorSubject, forkJoin } from 'rxjs';

import { ServiciosProyectos } from '../../gestion_proyectos/service/servicios-proyectos';
import { Materiales } from '../../gestion_proyectos/models/modelosProyectos';

type RowVM = { index: number; uid: number };

type PrecioUpdate = {
  descripcion: string;
  precio: number;
  sourceIndex: number;
};

@Component({
  selector: 'app-crear-materiales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './crear-materiales.component.html',
  styleUrls: ['./crear-materiales.component.css'],
})
export class CrearMaterialesComponent implements OnInit {
  formulario!: FormGroup;

  id_gasto_operaciones = 0;
  id_proyecto = 0;

  isLoading = true;

  catalogoMateriales: Materiales[] = [];
  catalogoUnidades: string[] = [];

  opcionesDescripcion: Record<number, Materiales[]> = {};
  opcionesUnidad: Record<number, string[]> = {};
  selectedIndexUnidad: Record<number, number> = {};

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
  }

  // ================== INIT / BINDINGS ==================
  private initForm(): void {
    this.formulario = this.fb.group({ materiales: this.fb.array([]) });
    this.ensureDraftRow();
  }

  private bindRouteParams(): void {
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      this.id_proyecto = Number(params['id_proyecto']) || 0;

      if (this.id_gasto_operaciones && this.id_proyecto) {
        this.isLoading = true;
        this.cargarDatosIniciales();
      }
    });
  }

  private bindPrecioGlobal(): void {
    this.precioUnitario$.subscribe((update) => {
      if (!update) return;

      const descKey = update.descripcion.toUpperCase();

      this.materiales.controls.forEach((ctrl, idx) => {
        if (idx === update.sourceIndex) return;

        const fg = ctrl as FormGroup;
        const desc = this.upperTrim(fg.get('descripcion')?.value);

        if (desc === descKey) {
          fg.get('precio_unitario')?.setValue(update.precio, {
            emitEvent: false,
          });
        }
      });
    });
  }

  private cargarDatosIniciales(): void {
    forkJoin({
      materiales: this.servicio.getMaterialesIDGasto(this.id_gasto_operaciones),
      catalogo: this.servicio.getCatalogoMaterialesPorProyecto(
        this.id_proyecto,
      ),
    }).subscribe({
      next: ({ materiales, catalogo }) => {
        // ===== materiales =====
        this.materiales.clear();
        this.opcionesDescripcion = {};
        this.opcionesUnidad = {};
        this.selectedIndexUnidad = {};

        (materiales || []).forEach((m, i) => {
          this.materiales.push(this.crearFormMaterial(m));
          this.opcionesDescripcion[i] = [];
          this.opcionesUnidad[i] = [];
          this.selectedIndexUnidad[i] = -1;
        });

        // ===== catálogo =====
        const setUni = new Set<string>();

        this.catalogoMateriales = (catalogo || []).map((m: any) => ({
          ...m,
          descripcion: (m.descripcion || '').toUpperCase(),
          unidad: (m.unidad || '').toUpperCase(),
        }));

        (catalogo || []).forEach((m: any) => {
          setUni.add((m.unidad || '').toUpperCase());
        });

        this.catalogoUnidades = Array.from(setUni);

        // ✅ siempre una fila draft al final
        this.ensureDraftRow();

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar datos iniciales:', err);
        this.isLoading = false;
      },
    });
  }

  // ================== GETTERS / VIEWMODEL ==================
  get materiales(): FormArray {
    return this.formulario.get('materiales') as FormArray;
  }

  get indicesVisibles(): RowVM[] {
    const term = this.upperTrim(this.filtroDescripcion);
    const lastIndex = this.materiales.length - 1;

    const out: RowVM[] = [];

    for (let i = 0; i < this.materiales.length; i++) {
      const fg = this.getFg(i);

      // siempre mostrar última fila draft
      if (i === lastIndex && !this.isRowWithId(fg)) {
        out.push({ index: i, uid: this.uidOfIndex(i) });
        continue;
      }

      if (!term) {
        out.push({ index: i, uid: this.uidOfIndex(i) });
        continue;
      }

      const desc = this.upperTrim(fg.get('descripcion')?.value);
      if (desc.includes(term)) out.push({ index: i, uid: this.uidOfIndex(i) });
    }

    return out;
  }

  trackByUid = (_: number, row: RowVM) => row.uid;

  // ================== AUTOCOMPLETE DESCRIPCIÓN ==================
  mostrarDescripcion(i: number): void {
    this.opcionesDescripcion[i] =
      (this.opcionesDescripcion[i]?.length ?? 0) === 0
        ? [...this.catalogoMateriales]
        : [];
  }

  filtrarDescripcion(i: number): void {
    const texto = this.upperTrim(this.getFg(i).get('descripcion')?.value);
    this.opcionesDescripcion[i] = this.catalogoMateriales.filter((m) =>
      (m.descripcion || '').includes(texto),
    );
  }

  seleccionarDescripcion(i: number, mat: Materiales): void {
    if (this.existeMaterialEnItem(mat.descripcion, i)) {
      alert('Este material ya está registrado en este ítem.');
      this.opcionesDescripcion[i] = [];
      return;
    }

    const fg = this.getFg(i);

    fg.patchValue(
      {
        descripcion: (mat.descripcion || '').toUpperCase(),
        precio_unitario: Number(mat.precio_unitario ?? 0),
        unidad: (mat.unidad || fg.get('unidad')?.value || '').toUpperCase(),
      },
      { emitEvent: false },
    );

    if (this.isRowWithId(fg)) fg.markAsDirty();
    this.opcionesDescripcion[i] = [];
  }

  ocultarDescripcion(i: number): void {
    setTimeout(() => (this.opcionesDescripcion[i] = []), 200);
  }

  private existeMaterialEnItem(desc: string, index: number): boolean {
    const busqueda = this.upperTrim(desc);
    return this.materiales.controls.some((c, i) => {
      if (i === index) return false;
      const other = this.upperTrim((c as FormGroup).get('descripcion')?.value);
      return other === busqueda;
    });
  }

  // ================== AUTOCOMPLETE UNIDAD ==================
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
    this.getFg(i)
      .get('unidad')
      ?.setValue((unidad || '').toUpperCase());
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

  // ================== FILA DRAFT ==================
  private ensureDraftRow(): void {
    if (this.materiales.length === 0) {
      this.materiales.push(this.crearFormMaterial());
      this.reindexUiMaps();
      return;
    }

    const lastIndex = this.materiales.length - 1;
    const last = this.getFg(lastIndex);

    if (this.isRowWithId(last)) {
      this.materiales.push(this.crearFormMaterial());
      this.reindexUiMaps();
      return;
    }

    if (this.isDraftCompletelyEmpty(last)) {
      last.markAsPristine();
      last.markAsUntouched();
    }
  }

  private isDraftRow(index: number): boolean {
    if (index !== this.materiales.length - 1) return false;
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

    const material = this.mapearMaterial(fg);
    const esNuevo = !this.isRowWithId(fg);

    const request$ = esNuevo
      ? this.servicio.createMaterial(material)
      : this.servicio.updateMaterial(material);

    request$.subscribe({
      next: (resp: any) => {
        if (esNuevo && resp?.id)
          fg.get('id')?.setValue(resp.id, { emitEvent: false });

        fg.markAsPristine();
        if (esNuevo) this.ensureDraftRow();
      },
      error: (err: any) => {
        console.error('Error al guardar:', err);
        alert('Error al guardar. Intente nuevamente.');
      },
    });
  }

  eliminar(i: number): void {
    const fg = this.getFg(i);
    const id = fg.get('id')?.value;

    if (!id) {
      this.resetDraftRow(i, fg);
      return;
    }

    this.servicio.deleteMaterial(id).subscribe({
      next: () => {
        this.materiales.removeAt(i);
        this.reindexUiMaps();
        this.ensureDraftRow();
      },
      error: (err: any) => {
        console.error('Error al eliminar:', err);
        alert('Error al eliminar. Intente nuevamente.');
      },
    });
  }

  private mapearMaterial(control: AbstractControl): Materiales {
    const raw = (control as FormGroup).getRawValue();
    const cantidad = this.parseNumero(raw.cantidad);
    const precio = this.parseNumero(raw.precio_unitario);

    return {
      id: raw.id ?? 0,
      gasto_operacion: this.id_gasto_operaciones,
      descripcion: this.upperTrim(raw.descripcion),
      unidad: this.upperTrim(raw.unidad),
      cantidad,
      precio_unitario: precio,
      total: this.redondear2(cantidad * precio),
    };
  }

  // ================== UTILITARIOS ==================
  onPrecioUniChange(control: AbstractControl, index?: number): void {
    const fg = control as FormGroup;

    const desc = this.upperTrim(fg.get('descripcion')?.value);
    const precio = this.parseNumero(fg.get('precio_unitario')?.value);

    if (!desc) return;

    if (precio > 0 && index !== undefined) {
      this.precioUnitario$.next({
        descripcion: desc,
        precio,
        sourceIndex: index,
      });
    }

    if (this.isRowWithId(fg) && this.id_proyecto && precio > 0) {
      this.servicio
        .actualizarPrecioMaterial(this.id_proyecto, desc, precio)
        .subscribe({
          next: () => {
            const hayFilasNoGuardadas = this.materiales.controls.some(
              (c) => !c.get('id')?.value,
            );
            if (!hayFilasNoGuardadas) this.cargarDatosIniciales();
          },
          error: (err: any) => {
            console.error('Error al actualizar precio:', err);
            alert('Error al actualizar el precio. Intente de nuevo.');
          },
        });
    }
  }

  convertirAMayusculas(i: number, campo: string): void {
    const ctrl = this.getFg(i).get(campo);
    if (ctrl)
      ctrl.setValue((ctrl.value ?? '').toString().toUpperCase(), {
        emitEvent: false,
      });
  }

  parseNumero(valor: any): number {
    if (valor === null || valor === undefined || valor === '') return 0;
    if (typeof valor === 'number') return valor;

    const texto = valor.toString().trim();
    const limpio =
      texto.includes(',') && texto.includes('.')
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto.replace(',', '.');

    return parseFloat(limpio) || 0;
  }

  redondear2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  calcularTotalFila(mat: AbstractControl): number {
    const fg = mat as FormGroup;
    const cantidad = this.parseNumero(fg.get('cantidad')?.value);
    const precio = this.parseNumero(fg.get('precio_unitario')?.value);
    return this.redondear2(cantidad * precio);
  }

  get totalMateriales(): number {
    const total = this.materiales.controls.reduce(
      (acc, c) => acc + this.calcularTotalFila(c),
      0,
    );
    const totalRedondeado = this.redondear2(total);
    this.servicio.setTotalMateriales(totalRedondeado);
    return totalRedondeado;
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor || 0);
  }

  // ================== UID / MAPS ==================
  private attachUid(fg: FormGroup): void {
    (fg as any).__uid = ++this.uidSeq;
  }

  private uidOfIndex(i: number): number {
    return (this.getFg(i) as any).__uid ?? 0;
  }

  private reindexUiMaps(): void {
    const descMap: Record<number, Materiales[]> = {};
    const uniMap: Record<number, string[]> = {};
    const selMap: Record<number, number> = {};

    for (let i = 0; i < this.materiales.length; i++) {
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
    return this.materiales.at(i) as FormGroup;
  }

  private isRowWithId(fg: FormGroup): boolean {
    return !!fg.get('id')?.value;
  }

  private upperTrim(v: any): string {
    return (v ?? '').toString().trim().toUpperCase();
  }

  private crearFormMaterial(material?: Materiales): FormGroup {
    const fg = this.fb.group({
      id: [material?.id ?? null],
      descripcion: [material?.descripcion ?? '', Validators.required],
      unidad: [material?.unidad ?? '', Validators.required],
      cantidad: [
        material?.cantidad ?? null,
        [Validators.required, Validators.min(0)],
      ],
      precio_unitario: [
        material?.precio_unitario ?? null,
        [Validators.required, Validators.min(0)],
      ],
    });

    this.attachUid(fg);

    fg.valueChanges.subscribe(() => {
      if (this.isRowWithId(fg)) fg.markAsDirty();
    });

    return fg;
  }
}
