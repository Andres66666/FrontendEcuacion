// crear-equipo-herramienta.component.ts
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
  EquipoHerramienta,
  Proyecto,
} from '../../gestion_proyectos/models/modelosProyectos';

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

  /** Opciones por fila para el autocompletado */
  opcionesDescripcion: { [i: number]: EquipoHerramienta[] } = {};
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
    this.servicio.totalManoObra$.subscribe(
      (total) => (this.totalManoObra = total)
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyectoData'] && this.proyectoData) {
      this.herramientas = this.proyectoData.herramientas;
    }
  }

  private inicializarFormulario(): void {
    this.formulario = this.fb.group({ equipos: this.fb.array([]) });
  }

  private suscribirCambiosPrecioGlobal(): void {
    this.precioUnitario$.subscribe((update) => {
      if (!update) return;
      this.equipos.controls.forEach((control) => {
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

      this.cargarEquipoHerramienta();
      this.cargarCatalogo();
    });
  }

  // ================= GETTERS =================
  get equipos(): FormArray {
    return this.formulario.get('equipos') as FormArray;
  }

  // ================= LÓGICA DE FORMULARIO =================
  private crearFormEquipoHerramienta(equipo?: EquipoHerramienta): FormGroup {
    const fg = this.fb.group({
      id: [equipo?.id ?? null],
      descripcion: [equipo?.descripcion ?? '', Validators.required],
      unidad: [equipo?.unidad ?? '', Validators.required],
      cantidad: [
        equipo?.cantidad ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      precio_unitario: [
        equipo?.precio_unitario ?? 0,
        [Validators.required, Validators.min(0)],
      ],
    });

    fg.valueChanges.subscribe(() => {
      if (fg.get('id')?.value) fg.markAsDirty();
    });

    return fg;
  }

  agregarEquipoHerramienta(): void {
    const i = this.equipos.length;
    this.equipos.push(this.crearFormEquipoHerramienta());
    this.opcionesDescripcion[i] = [];
    this.opcionesUnidad[i] = [];
  }

  // ================= AUTOCOMPLETE =================
  mostrarDescripcion(i: number): void {
    this.opcionesDescripcion[i] =
      this.opcionesDescripcion[i]?.length === 0
        ? [...this.catalogoEquipoHerramienta]
        : [];
  }

  filtrarDescripcion(i: number): void {
    const texto = (
      this.equipos.at(i).get('descripcion')?.value || ''
    ).toUpperCase();
    this.opcionesDescripcion[i] = this.catalogoEquipoHerramienta.filter((e) =>
      e.descripcion.includes(texto)
    );
  }

  seleccionarDescripcion(i: number, equipo: EquipoHerramienta): void {
    if (this.existeEquipoHerramientaEnItem(equipo.descripcion, i)) {
      alert('Esta equipo/herramienta ya está registrada en este ítem.');
      this.opcionesDescripcion[i] = [];
      return;
    }
    const fg = this.equipos.at(i) as FormGroup;
    fg.patchValue(
      {
        descripcion: equipo.descripcion,
        precio_unitario: equipo.precio_unitario,
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
    const texto = (this.equipos.at(i).get('unidad')?.value || '').toUpperCase();
    this.opcionesUnidad[i] = this.catalogoUnidades.filter((u) =>
      u.includes(texto)
    );
  }

  seleccionarUnidad(i: number, unidad: string): void {
    this.equipos.at(i).get('unidad')?.setValue(unidad);
    this.opcionesUnidad[i] = [];
  }

  ocultarUnidad(i: number): void {
    setTimeout(() => (this.opcionesUnidad[i] = []), 200);
  }

  private existeEquipoHerramientaEnItem(desc: string, index: number): boolean {
    const busqueda = desc.trim().toUpperCase();
    return this.equipos.controls.some(
      (c, i) =>
        i !== index && c.get('descripcion')?.value?.toUpperCase() === busqueda
    );
  }

  // ================= CARGAS =================
  private cargarEquipoHerramienta(): void {
    this.servicio
      .getEquipoHerramientas(this.id_gasto_operaciones)
      .subscribe((data) => {
        this.equipos.clear();
        data
          .sort((a, b) =>
            a.descripcion.localeCompare(b.descripcion, 'es', {
              sensitivity: 'base',
            })
          )
          .forEach((e, i) => {
            this.equipos.push(this.crearFormEquipoHerramienta(e));
            this.opcionesDescripcion[i] = [];
            this.opcionesUnidad[i] = [];
          });
      });
  }

  private cargarCatalogo(): void {
    // Cargar catálogo de descripciones con precios
    this.servicio
      .getCatalogoEquipoHerramientaPorProyecto(this.id_proyecto)
      .subscribe((data: any[]) => {
        this.catalogoEquipoHerramienta = data
          .map((e) => ({
            id: 0,
            id_gasto_operacion: 0,
            descripcion: e.descripcion.toUpperCase(),
            unidad: '',
            cantidad: 0,
            precio_unitario: e.ultimo_precio,
            total: 0,
          }))
          .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
      });

    // Cargar unidades por separado
    this.servicio.getUnidadesEquipoHerramienta().subscribe((unis) => {
      this.catalogoUnidades = unis.map((u) => u.toUpperCase()).sort();
    });
  }

  // ================= CRUD =================
  guardar(i: number): void {
    const control = this.equipos.at(i);
    if (control.invalid) return;

    const equipo = this.mapearEquipoHerramienta(control);
    const peticion = equipo.id
      ? this.servicio.updateEquipoHerramienta(equipo)
      : this.servicio.createEquipoHerramienta(equipo);

    peticion.subscribe(() => {
      this.cargarEquipoHerramienta();
      this.cargarCatalogo();
    });
  }

  eliminar(i: number): void {
    const id = this.equipos.at(i).get('id')?.value;
    if (id) {
      this.servicio.deleteEquipoHerramienta(id).subscribe(() => {
        this.cargarEquipoHerramienta();
        this.cargarCatalogo();
      });
    } else {
      this.equipos.removeAt(i);
    }
  }

  private mapearEquipoHerramienta(control: AbstractControl): EquipoHerramienta {
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
        .actualizarPrecioDescripcionEquipoHerramienta(
          this.id_gasto_operaciones,
          desc,
          precio
        )
        .subscribe();
    }
  }

  convertirAMayusculas(i: number, campo: string): void {
    const ctrl = this.equipos.at(i).get(campo);
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

  calcularPrecioParcial(equipo: AbstractControl): number {
    return (
      this.parseNumero(equipo.get('cantidad')?.value) *
      this.parseNumero(equipo.get('precio_unitario')?.value)
    );
  }

  actualizarPrecioParcial(control: AbstractControl): void {
    const total = this.calcularPrecioParcial(control);
    (control as FormGroup).get('total')?.setValue(total, { emitEvent: false });
  }

  get subtotalEquipos(): number {
    return this.equipos.controls.reduce(
      (acc, c) => acc + this.calcularPrecioParcial(c),
      0
    );
  }

  get herramientasPorcentaje(): number {
    return this.totalManoObra * (this.herramientas / 100);
  }

  get totalEquipos(): number {
    const total = this.subtotalEquipos + this.herramientasPorcentaje;
    this.servicio.setTotalEquipos(total);
    return total;
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor || 0);
  }
}
