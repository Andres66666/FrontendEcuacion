// crear-mano-de-obra.component.ts
import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
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

import { BehaviorSubject } from 'rxjs';
import { ServiciosProyectos } from '../../gestion_proyectos/service/servicios-proyectos';
import {
  ManoDeObra,
  Proyecto,
} from '../../gestion_proyectos/models/modelosProyectos';

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

  catalogoManoDeObra: ManoDeObra[] = [];
  catalogoUnidades: string[] = [];

  /** Opciones por fila para el autocompletado */
  opcionesDescripcion: { [i: number]: ManoDeObra[] } = {};
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyectoData'] && this.proyectoData) {
      this.carga_social = this.proyectoData.carga_social;
      this.iva_efectiva = this.proyectoData.iva_efectiva;
    }
  }

  private inicializarFormulario(): void {
    this.formulario = this.fb.group({ manoObra: this.fb.array([]) });
  }

  private suscribirCambiosPrecioGlobal(): void {
    this.precioUnitario$.subscribe((update) => {
      if (!update) return;
      this.manoObra.controls.forEach((control) => {
        const fg = control as FormGroup;
        if (
          fg.get('descripcion')?.value?.toUpperCase() ===
          update.descripcion.toUpperCase()
        ) {
          fg.get('precio_unitario')?.setValue(update.precio, {
            emitEvent: false,
          });
          this.actualizarPrecioParcial(fg);
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

      this.cargarManoDeObra();
      this.cargarCatalogo();
    });
  }

  // ================= GETTERS =================
  get manoObra(): FormArray {
    return this.formulario.get('manoObra') as FormArray;
  }

  // ================= LÓGICA DE FORMULARIO =================
  private crearFormManoDeObra(mano?: ManoDeObra): FormGroup {
    const fg = this.fb.group({
      id: [mano?.id ?? null],
      descripcion: [mano?.descripcion ?? '', Validators.required],
      unidad: [mano?.unidad ?? '', Validators.required],
      cantidad: [mano?.cantidad ?? 0, [Validators.required, Validators.min(0)]],
      precio_unitario: [
        mano?.precio_unitario ?? 0,
        [Validators.required, Validators.min(0)],
      ],
    });

    fg.valueChanges.subscribe(() => {
      if (fg.get('id')?.value) fg.markAsDirty();
    });

    return fg;
  }

  agregarManoDeObra(): void {
    const i = this.manoObra.length;
    this.manoObra.push(this.crearFormManoDeObra());
    this.opcionesDescripcion[i] = [];
    this.opcionesUnidad[i] = [];
  }

  // ================= AUTOCOMPLETE =================
  mostrarDescripcion(i: number): void {
    this.opcionesDescripcion[i] =
      this.opcionesDescripcion[i]?.length === 0
        ? [...this.catalogoManoDeObra]
        : [];
  }

  filtrarDescripcion(i: number): void {
    const texto = (
      this.manoObra.at(i).get('descripcion')?.value || ''
    ).toUpperCase();
    this.opcionesDescripcion[i] = this.catalogoManoDeObra.filter((m) =>
      m.descripcion.includes(texto)
    );
  }

  seleccionarDescripcion(i: number, mano: ManoDeObra): void {
    if (this.existeManoDeObraEnItem(mano.descripcion, i)) {
      alert('Esta mano de obra ya está registrada en este ítem.');
      this.opcionesDescripcion[i] = [];
      return;
    }
    const fg = this.manoObra.at(i) as FormGroup;
    fg.patchValue(
      {
        descripcion: mano.descripcion,
        precio_unitario: mano.precio_unitario,
      },
      { emitEvent: false }
    );
    this.actualizarPrecioParcial(fg);

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
      this.manoObra.at(i).get('unidad')?.value || ''
    ).toUpperCase();
    this.opcionesUnidad[i] = this.catalogoUnidades.filter((u) =>
      u.includes(texto)
    );
  }

  seleccionarUnidad(i: number, unidad: string): void {
    this.manoObra.at(i).get('unidad')?.setValue(unidad);
    this.opcionesUnidad[i] = [];
  }

  ocultarUnidad(i: number): void {
    setTimeout(() => (this.opcionesUnidad[i] = []), 200);
  }

  private existeManoDeObraEnItem(desc: string, index: number): boolean {
    const busqueda = desc.trim().toUpperCase();
    return this.manoObra.controls.some(
      (c, i) =>
        i !== index && c.get('descripcion')?.value?.toUpperCase() === busqueda
    );
  }

  // ================= CARGAS =================
  private cargarManoDeObra(): void {
    this.servicio
      .getManoDeObraIDGasto(this.id_gasto_operaciones)
      .subscribe((data) => {
        this.manoObra.clear();
        data
          .sort((a, b) =>
            a.descripcion.localeCompare(b.descripcion, 'es', {
              sensitivity: 'base',
            })
          )
          .forEach((m, i) => {
            this.manoObra.push(this.crearFormManoDeObra(m));
            this.opcionesDescripcion[i] = [];
            this.opcionesUnidad[i] = [];
          });
      });
  }

  private cargarCatalogo(): void {
    // Cargar catálogo de descripciones con precios
    this.servicio
      .getCatalogoManoDeObraPorProyecto(this.id_proyecto)
      .subscribe((data: any[]) => {
        this.catalogoManoDeObra = data
          .map((m) => ({
            id: 0,
            id_gasto_operacion: 0,
            descripcion: m.descripcion.toUpperCase(),
            unidad: '',
            cantidad: 0,
            precio_unitario: m.ultimo_precio,
            total: 0,
          }))
          .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
      });

    // Cargar unidades por separado
    this.servicio.getUnidadesManoDeObra().subscribe((unis) => {
      this.catalogoUnidades = unis.map((u) => u.toUpperCase()).sort();
    });
  }

  // ================= CRUD =================
  guardar(i: number): void {
    const control = this.manoObra.at(i);
    if (control.invalid) return;

    const mano = this.mapearManoDeObra(control);
    const peticion = mano.id
      ? this.servicio.updateManoDeObra(mano)
      : this.servicio.createManoDeObra(mano);

    peticion.subscribe(() => {
      this.cargarManoDeObra();
      this.cargarCatalogo();
    });
  }

  eliminar(i: number): void {
    const id = this.manoObra.at(i).get('id')?.value;
    if (id) {
      this.servicio.deleteManoDeObra(id).subscribe(() => {
        this.cargarManoDeObra();
        this.cargarCatalogo();
      });
    } else {
      this.manoObra.removeAt(i);
    }
  }

  private mapearManoDeObra(control: AbstractControl): ManoDeObra {
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
        .actualizarPrecioDescripcionManoDeObra(
          this.id_gasto_operaciones,
          desc,
          precio
        )
        .subscribe();
    }
  }

  convertirAMayusculas(i: number, campo: string): void {
    const ctrl = this.manoObra.at(i).get(campo);
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

  calcularPrecioParcial(mano: AbstractControl): number {
    return (
      this.parseNumero(mano.get('cantidad')?.value) *
      this.parseNumero(mano.get('precio_unitario')?.value)
    );
  }

  actualizarPrecioParcial(control: AbstractControl): void {
    const total = this.calcularPrecioParcial(control);
    (control as FormGroup).get('total')?.setValue(total, { emitEvent: false });
  }

  get subtotalManoObra(): number {
    return this.manoObra.controls.reduce(
      (acc, c) => acc + this.calcularPrecioParcial(c),
      0
    );
  }

  get cargasManoObra(): number {
    return this.subtotalManoObra * (this.carga_social / 100);
  }

  get ivaManoObra(): number {
    return (
      (this.subtotalManoObra + this.cargasManoObra) * (this.iva_efectiva / 100)
    );
  }

  get totalManoObra(): number {
    const total =
      this.subtotalManoObra + this.cargasManoObra + this.ivaManoObra;
    this.servicio.setTotalManoObra(total);
    return total;
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor || 0);
  }
}
