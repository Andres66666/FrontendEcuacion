import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { ServiciosProyectos } from '../../gestion_proyectos/service/servicios-proyectos';
import { Materiales } from '../../gestion_proyectos/models/modelosProyectos';
import { BehaviorSubject } from 'rxjs';

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

  catalogoMateriales: Materiales[] = [];
  catalogoUnidades: string[] = [];

  /** Opciones por fila para el autocompletado */
  opcionesDescripcion: { [i: number]: Materiales[] } = {};
  opcionesUnidad: { [i: number]: string[] } = {};

  /** Observable para propagar cambios de precios dinámicamente */
  private precioUnitario$ = new BehaviorSubject<{
    descripcion: string;
    precio: number;
  } | null>(null);

  constructor(
    private fb: FormBuilder,
    private servicio: ServiciosProyectos,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.suscribirCambiosPrecioGlobal();
    this.leerParametrosRuta();
  }

  private inicializarFormulario(): void {
    this.formulario = this.fb.group({ materiales: this.fb.array([]) });
  }

  private suscribirCambiosPrecioGlobal(): void {
    this.precioUnitario$.subscribe((update) => {
      if (!update) return;
      this.materiales.controls.forEach((control) => {
        const fg = control as FormGroup;
        if (
          fg.get('descripcion')?.value?.toUpperCase() ===
          update.descripcion.toUpperCase()
        ) {
          fg.get('precio_unitario')?.setValue(update.precio, {
            emitEvent: false,
          });
        }
      });
    });
  }

  private leerParametrosRuta(): void {
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      if (this.id_gasto_operaciones) this.cargarDatosIniciales();
    });
  }

  private cargarDatosIniciales(): void {
    this.servicio.getGastosOperacion().subscribe((gastos) => {
      const gasto = gastos.find((g) => g.id === this.id_gasto_operaciones);
      if (!gasto) return;

      this.id_proyecto =
        typeof gasto.identificador === 'number'
          ? gasto.identificador
          : gasto.identificador.id_proyecto;

      this.cargarMateriales();
      this.cargarCatalogo();
    });
  }

  // ================= GETTERS =================
  get materiales(): FormArray {
    return this.formulario.get('materiales') as FormArray;
  }

  // ================= LÓGICA DE FORMULARIO =================
  private crearFormMaterial(material?: Materiales): FormGroup {
    const fg = this.fb.group({
      id: [material?.id ?? null],
      descripcion: [material?.descripcion ?? '', Validators.required],
      unidad: [material?.unidad ?? '', Validators.required],
      cantidad: [
        material?.cantidad ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      precio_unitario: [
        material?.precio_unitario ?? 0,
        [Validators.required, Validators.min(0)],
      ],
    });

    fg.valueChanges.subscribe(() => {
      if (fg.get('id')?.value) fg.markAsDirty();
    });

    return fg;
  }

  agregarMaterial(): void {
    const i = this.materiales.length;
    this.materiales.push(this.crearFormMaterial());
    this.opcionesDescripcion[i] = [];
    this.opcionesUnidad[i] = [];
  }

  // ================= AUTOCOMPLETE (Exigido por HTML) =================
  mostrarDescripcion(i: number): void {
    this.opcionesDescripcion[i] =
      this.opcionesDescripcion[i]?.length === 0
        ? [...this.catalogoMateriales]
        : [];
  }

  filtrarDescripcion(i: number): void {
    const texto = (
      this.materiales.at(i).get('descripcion')?.value || ''
    ).toUpperCase();
    this.opcionesDescripcion[i] = this.catalogoMateriales.filter((m) =>
      m.descripcion.includes(texto)
    );
  }

  seleccionarDescripcion(i: number, mat: Materiales): void {
    if (this.existeMaterialEnItem(mat.descripcion, i)) {
      alert('Este material ya está registrado en este ítem.');
      this.opcionesDescripcion[i] = [];
      return;
    }
    const fg = this.materiales.at(i) as FormGroup;
    fg.patchValue(
      {
        descripcion: mat.descripcion,
        precio_unitario: mat.precio_unitario,
      },
      { emitEvent: false }
    );

    if (fg.get('id')?.value) fg.markAsDirty();
    this.opcionesDescripcion[i] = [];
  }

  ocultarDescripcion(i: number): void {
    setTimeout(() => (this.opcionesDescripcion[i] = []), 200);
  }

  mostrarUnidad(i: number): void {
    this.opcionesUnidad[i] =
      this.opcionesUnidad[i]?.length === 0 ? [...this.catalogoUnidades] : [];
  }

  filtrarUnidad(i: number): void {
    const texto = (
      this.materiales.at(i).get('unidad')?.value || ''
    ).toUpperCase();
    this.opcionesUnidad[i] = this.catalogoUnidades.filter((u) =>
      u.includes(texto)
    );
  }

  seleccionarUnidad(i: number, unidad: string): void {
    this.materiales.at(i).get('unidad')?.setValue(unidad);
    this.opcionesUnidad[i] = [];
  }

  ocultarUnidad(i: number): void {
    setTimeout(() => (this.opcionesUnidad[i] = []), 200);
  }

  private existeMaterialEnItem(desc: string, index: number): boolean {
    const busqueda = desc.trim().toUpperCase();
    return this.materiales.controls.some(
      (c, i) =>
        i !== index && c.get('descripcion')?.value?.toUpperCase() === busqueda
    );
  }

  // ================= CARGAS =================
  private cargarMateriales(): void {
    this.servicio
      .getMaterialesIDGasto(this.id_gasto_operaciones)
      .subscribe((data) => {
        this.materiales.clear();
        data
          .sort((a, b) =>
            a.descripcion.localeCompare(b.descripcion, 'es', {
              sensitivity: 'base',
            })
          )
          .forEach((m, i) => {
            this.materiales.push(this.crearFormMaterial(m));
            this.opcionesDescripcion[i] = [];
            this.opcionesUnidad[i] = [];
          });
      });
  }

  private cargarCatalogo(): void {
    this.servicio
      .getCatalogoMaterialesPorProyecto(this.id_proyecto)
      .subscribe((data) => {
        const setUni = new Set<string>();
        this.catalogoMateriales = data
          .map((m) => ({
            ...m,
            descripcion: m.descripcion.toUpperCase(),
          }))
          .sort((a, b) => a.descripcion.localeCompare(b.descripcion));

        data.forEach((m) => setUni.add(m.unidad.toUpperCase()));
        this.catalogoUnidades = Array.from(setUni).sort();
      });
  }

  // ================= CRUD =================
  guardar(i: number): void {
    const control = this.materiales.at(i);
    if (control.invalid) return;

    const material = this.mapearMaterial(control);
    const peticion = material.id
      ? this.servicio.updateMaterial(material)
      : this.servicio.createMaterial(material);

    peticion.subscribe(() => {
      this.cargarMateriales();
      this.cargarCatalogo();
    });
  }

  eliminar(i: number): void {
    const id = this.materiales.at(i).get('id')?.value;
    if (id) {
      this.servicio.deleteMaterial(id).subscribe(() => {
        this.cargarMateriales();
        this.cargarCatalogo();
      });
    } else {
      this.materiales.removeAt(i);
    }
  }

  private mapearMaterial(control: AbstractControl): Materiales {
    const raw = (control as FormGroup).getRawValue();
    const cantidad = this.parseNumero(raw.cantidad);
    const precio = this.parseNumero(raw.precio_unitario);
    return {
      id: raw.id ?? 0,
      id_gasto_operacion: this.id_gasto_operaciones,
      descripcion: raw.descripcion.toUpperCase().trim(),
      unidad: raw.unidad.toUpperCase().trim(),
      cantidad: cantidad,
      precio_unitario: precio,
      total: cantidad * precio,
    };
  }

  // ================= UTILITARIOS =================
  onPrecioUniChange(control: AbstractControl, index?: number): void {
    const fg = control as FormGroup;
    const desc = fg.get('descripcion')?.value;
    const precio = this.parseNumero(fg.get('precio_unitario')?.value);

    if (!desc || precio <= 0) return;

    this.precioUnitario$.next({ descripcion: desc.toUpperCase(), precio });

    if (fg.get('id')?.value) {
      this.servicio
        .actualizarPrecioDescripcion(this.id_gasto_operaciones, desc, precio)
        .subscribe();
    }
  }

  convertirAMayusculas(i: number, campo: string): void {
    const ctrl = this.materiales.at(i).get(campo);
    if (ctrl) {
      ctrl.setValue(ctrl.value?.toUpperCase() || '', { emitEvent: false });
    }
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

  calcularTotalFila(mat: AbstractControl): number {
    const cantidad = this.parseNumero(mat.get('cantidad')?.value);
    const precio = this.parseNumero(mat.get('precio_unitario')?.value);

    const total = cantidad * precio;

    return Math.round(total * 100) / 100;
  }

  get totalMateriales(): number {
    const total = this.materiales.controls.reduce(
      (acc, c) => acc + this.calcularTotalFila(c),
      0
    );

    // Redondeo final de seguridad
    const totalRedondeado = Math.round(total * 100) / 100;

    this.servicio.setTotalMateriales(totalRedondeado);
    return totalRedondeado;
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor || 0);
  }
}
