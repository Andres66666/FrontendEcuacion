import { Component, Input, OnChanges } from '@angular/core';
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

type GastoOperacionUI = GastoOperacion & {
  gastosGenerales?: GastosGenerales;
  precio_calculado?: number;
  original_precio_unitario?: number;
};

@Component({
  selector: 'app-items-gasto-operacion',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './items-gasto-operacion.html',
  styleUrl: './items-gasto-operacion.css',
})
export class ItemsGastoOperacion implements OnChanges {
  @Input() idProyecto!: number;

  proyecto!: Proyecto;
  nombreProyecto = '';

  modulos: Modulo[] = [];
  gastos: GastoOperacionUI[] = [];

  mostrarModal = false;
  modoEdicion = false;
  gastoEditando!: GastoOperacionUI;

  catalogoUnidades: string[] = [];
  opcionesUnidad: string[] = [];

  itemForm: Partial<GastoOperacion> = {
    descripcion: '',
    unidad: '',
    cantidad: 0,
    precio_unitario: 0,
    costo_parcial: 0,
    modulo: undefined,
  };

  constructor(private service: ServiciosProyectos, private router: Router) {}

  /* ================= CICLO DE VIDA ================= */

  ngOnChanges() {
    if (!this.idProyecto) return;

    this.cargarProyecto();
    this.cargarModulos();
    this.cargarGastos();
    this.cargarUnidades();
  }

  /* ================= CARGA DE DATOS ================= */

  cargarProyecto() {
    this.service.getProyectoID(this.idProyecto).subscribe((p) => {
      this.proyecto = p;
      this.nombreProyecto = p.NombreProyecto;
    });
  }

  cargarModulos() {
    this.service
      .getModulosPorProyecto(this.idProyecto)
      .subscribe((r) => (this.modulos = r));
  }

  cargarUnidades() {
    this.service.getUnidadesGastoOperacion().subscribe((data) => {
      this.catalogoUnidades = data
        .map((u) => u.toUpperCase().trim())
        .filter((u, i, arr) => arr.indexOf(u) === i)
        .sort();
    });
  }

  cargarGastos() {
    this.service.getGastoOperacionID(this.idProyecto).subscribe((gastosBD) => {
      this.gastos = gastosBD.map((g) => {
        const ui = g as GastoOperacionUI;
        ui.precio_calculado = Number(g.precio_unitario) || 0;
        ui.original_precio_unitario = Number(g.precio_unitario) || 0;
        ui.costo_parcial = Number(g.costo_parcial) || 0;
        return ui;
      });

      this.service
        .getGastosGeneralesPorProyectoFull(this.idProyecto)
        .subscribe((gg) => {
          const map = new Map<number, GastosGenerales>();
          gg.forEach((x) => map.set(x.id_gasto_operacion, x));

          this.gastos.forEach((g) => {
            const ui = g as GastoOperacionUI;
            const gastosGen = map.get(g.id);

            if (!gastosGen) return;

            ui.gastosGenerales = gastosGen;

            const cantidad = Number(g.cantidad) || 0;
            const totalGG = Number(gastosGen.totalgastosgenerales) || 0;
            const total = Number(gastosGen.total) || 0;

            ui.precio_calculado = totalGG;
            g.precio_unitario = totalGG;

            g.costo_parcial = cantidad * total;
          });
        });
    });
  }

  /* ================= CÁLCULOS ================= */

  getTotalItemGastosOperacionesParcial(g: GastoOperacion): number {
    const ui = g as GastoOperacionUI;
    const cantidad = Number(g.cantidad) || 0;
    const totalGG = Number(ui.gastosGenerales?.totalgastosgenerales) || 0;
    return cantidad * totalGG;
  }

  getValorAgregado(g: GastoOperacion): number {
    const parcial = Number(g.costo_parcial) || 0;
    return parcial - this.getTotalItemGastosOperacionesParcial(g);
  }

  getTotalCostoParcial(): number {
    return this.gastos.reduce(
      (sum, g) => sum + (Number(g.costo_parcial) || 0),
      0
    );
  }

  getTotalProyectoGastosOperacionParcial(): number {
    return this.gastos.reduce(
      (sum, g) => sum + this.getTotalItemGastosOperacionesParcial(g),
      0
    );
  }

  getTotalProyectoValorAgregado(): number {
    return this.gastos.reduce((sum, g) => sum + this.getValorAgregado(g), 0);
  }
  getTotalPorModulo(moduloId: number): {
    totalGasto: number;
    totalValorAgregado: number;
  } {
    const gastosModulo = this.getGastosPorModulo(moduloId);
    let totalGasto = 0;
    let totalValorAgregado = 0;

    gastosModulo.forEach((g) => {
      totalGasto += this.getTotalItemGastosOperacionesParcial(g);
      totalValorAgregado += this.getValorAgregado(g);
    });

    return {
      totalGasto: this.redondear2(totalGasto),
      totalValorAgregado: this.redondear2(totalValorAgregado),
    };
  }
  private redondear2(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  // ================= MÉTODOS =================

  getTotalFinal(g: GastoOperacion): number {
    return (g as GastoOperacionUI).gastosGenerales?.total ?? 0;
  }

  toUpper(field: keyof GastoOperacion) {
    const valor = this.itemForm[field];
    if (typeof valor === 'string') {
      this.itemForm[field] = valor.toUpperCase() as any;
    }
  }

  mostrarUnidad(): void {
    this.opcionesUnidad = [...this.catalogoUnidades];
  }

  filtrarUnidad(): void {
    const texto = (this.itemForm.unidad || '').toUpperCase();
    this.opcionesUnidad = this.catalogoUnidades.filter((u) =>
      u.includes(texto)
    );
  }

  ocultarUnidad(): void {
    setTimeout(() => (this.opcionesUnidad = []), 200);
  }

  seleccionarUnidad(unidad: string): void {
    this.itemForm.unidad = unidad;
    this.opcionesUnidad = [];
  }

  calcularCosto() {
    const cantidad = this.itemForm.cantidad || 0;
    const precio = this.itemForm.precio_unitario || 0;
    this.itemForm.costo_parcial = cantidad * precio;
  }

  /* ================= CAMBIOS ================= */

  hasChanges(g: GastoOperacion): boolean {
    const ui = g as GastoOperacionUI;
    return (
      Math.abs(
        (ui.precio_calculado ?? 0) - (ui.original_precio_unitario ?? 0)
      ) > 0.0001
    );
  }

  actualizarDatosEnBD(g: GastoOperacion) {
    const ui = g as GastoOperacionUI;
    const precio = Number(ui.precio_calculado) || 0;

    const payload = {
      id: g.id,
      precio_unitario: precio,
      costo_parcial: (Number(g.cantidad) || 0) * precio,
    };

    this.service.updateGastoOperacion(payload).subscribe(() => {
      g.precio_unitario = precio;
      ui.original_precio_unitario = precio;
    });
  }

  /* ================= UI ================= */

  abrirModalRegistrar() {
    this.resetForm();
    this.mostrarModal = true;
  }

  abrirEditar(g: GastoOperacion) {
    this.modoEdicion = true;
    this.gastoEditando = g as GastoOperacionUI;

    this.itemForm = {
      ...g,
      modulo: typeof g.modulo === 'number' ? g.modulo : g.modulo.id,
    };

    this.mostrarModal = true;
  }

  guardarDesdeModal() {
    if (!this.itemForm.descripcion?.trim()) return alert('Ingrese descripción');
    if (!this.itemForm.modulo) return alert('Seleccione módulo');

    const payload = {
      identificador: { id_proyecto: this.idProyecto },
      modulo_id: this.itemForm.modulo,
      descripcion: this.itemForm.descripcion,
      unidad: this.itemForm.unidad ?? '',
      cantidad: Number(this.itemForm.cantidad) || 0,
      precio_unitario: 0,
      costo_parcial: 0,
    };

    const req = this.modoEdicion
      ? this.service.updateGastoOperacion({
          id: this.gastoEditando.id,
          ...payload,
        })
      : this.service.createGastoOperacion([payload]);

    req.subscribe(() => {
      this.mostrarModal = false;
      this.cargarGastos();
      this.resetForm();
    });
  }

  eliminarGasto(id: number) {
    if (!confirm('¿Eliminar ítem?')) return;
    this.service.deleteGastoOperacion(id).subscribe(() => {
      this.cargarGastos();
    });
  }

  resetForm() {
    this.itemForm = {
      descripcion: '',
      unidad: '',
      cantidad: 0,
      precio_unitario: 0,
      costo_parcial: 0,
      modulo: undefined,
    };
    this.opcionesUnidad = [];
    this.modoEdicion = false;
  }

  /* ================= HELPERS ================= */

  getGastosPorModulo(moduloId: number): GastoOperacion[] {
    return this.gastos.filter((g) =>
      typeof g.modulo === 'number'
        ? g.modulo === moduloId
        : g.modulo.id === moduloId
    );
  }

  modulosConGastos(): Modulo[] {
    return this.modulos.filter((m) =>
      this.gastos.some((g) =>
        typeof g.modulo === 'number' ? g.modulo === m.id : g.modulo.id === m.id
      )
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

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(valor) || 0);
  }

  enviarAEcuacion(item: GastoOperacion) {
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

  enviarReporteFinanciero(item: GastoOperacion) {
    this.router.navigate(['panel-control/PrecioFactura'], {
      queryParams: {
        origen: 'ITEM',
        id_item_gasto_operacion: item.id,
        total_Item_gasto_operacion_parcial:
          this.getTotalItemGastosOperacionesParcial(item),
        total_Item_valor_agregado_item: this.getValorAgregado(item),
        descripcion: item.descripcion,

        id_proyecto: this.proyecto.id_proyecto,
        NombreProyecto: this.proyecto.NombreProyecto,
        carga_social: this.proyecto.carga_social,
        iva_efectiva: this.proyecto.iva_efectiva,
        herramientas: this.proyecto.herramientas,
        gastos_generales: this.proyecto.gastos_generales,
        iva_tasa_nominal: this.proyecto.iva_tasa_nominal,
        it: this.proyecto.it,
        iue: this.proyecto.iue,
        ganancia: this.proyecto.ganancia,
        margen_utilidad: this.proyecto.margen_utilidad,
      },
    });
  }
  enviarReporteFinancieroModulo(moduloId: number) {
    const totales = this.getTotalPorModulo(moduloId);
    const moduloActual = this.modulos.find((m) => m.id === moduloId);

    this.router.navigate(['panel-control/PrecioFactura'], {
      queryParams: {
        origen: 'MODULO',
        total_modulo_gastos_operacion_parcial: totales.totalGasto,
        total_modulo_valor_agregado: totales.totalValorAgregado,
        modulo_id: moduloId,
        NombreModulo: moduloActual?.nombre || '',

        // === PROYECTO ===
        id_proyecto: this.proyecto.id_proyecto,
        NombreProyecto: this.proyecto.NombreProyecto,
        carga_social: this.proyecto.carga_social,
        iva_efectiva: this.proyecto.iva_efectiva,
        herramientas: this.proyecto.herramientas,
        gastos_generales: this.proyecto.gastos_generales,
        iva_tasa_nominal: this.proyecto.iva_tasa_nominal,
        it: this.proyecto.it,
        iue: this.proyecto.iue,
        ganancia: this.proyecto.ganancia,
        margen_utilidad: this.proyecto.margen_utilidad,
      },
    });
  }
  enviarGastoOperacionParcialValorAgregado() {
    this.router.navigate(['panel-control/PrecioFactura'], {
      queryParams: {
        origen: 'PROYECTO',
        // === TOTALES CALCULADOS ===
        total_proyecto_gastos_operacion_parcial:
          this.getTotalProyectoGastosOperacionParcial(),
        total_proyecto_valor_agregado: this.getTotalProyectoValorAgregado(),

        // === PROYECTO ===
        id_proyecto: this.proyecto.id_proyecto,
        NombreProyecto: this.proyecto.NombreProyecto,
        carga_social: this.proyecto.carga_social,
        iva_efectiva: this.proyecto.iva_efectiva,
        herramientas: this.proyecto.herramientas,
        gastos_generales: this.proyecto.gastos_generales,
        iva_tasa_nominal: this.proyecto.iva_tasa_nominal,
        it: this.proyecto.it,
        iue: this.proyecto.iue,
        ganancia: this.proyecto.ganancia,
        margen_utilidad: this.proyecto.margen_utilidad,
      },
    });
  }
}
