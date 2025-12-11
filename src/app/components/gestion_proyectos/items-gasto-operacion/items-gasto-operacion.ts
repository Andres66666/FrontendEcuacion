import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiciosService } from '../../../services/servicios.service';
import { GastoOperacion, Modulo, Proyecto } from '../../../models/models';
import { NumeroALetras } from '../../../utils/numeroALetras';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { ConfirmacionComponent } from '../../mensajes/confirmacion/confirmacion/confirmacion.component';
import { ErrorComponent } from '../../mensajes/error/error.component';
import { OkComponent } from '../../mensajes/ok/ok.component';

interface GastoOperacionExtendido extends Partial<GastoOperacion> {
  esNuevo?: boolean;
  editarUnidad?: boolean;
  tipo?: 'modulo' | 'modulo_registrado' | 'gasto';
  codigo?: string;
  nombre?: string;
  editarModulo?: boolean;
  moduloId?: number | null;
  editar?: boolean;
  unidad?: string;
  // Propiedades para Unidad independiente
  mostrarListaUnidad?: boolean;
  unidadesFiltradasUnidad?: string[];
  isEditingCantidad?: boolean;
  orden?: number;
}

@Component({
  selector: 'app-items-gasto-operacion',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    ConfirmacionComponent,
    ErrorComponent,
    OkComponent,
  ],
  templateUrl: './items-gasto-operacion.html',
  styleUrl: './items-gasto-operacion.css',
})
export class ItemsGastoOperacion implements OnInit, OnChanges {
  @Input() identificadorGeneral: number = 0;
  @Input() proyectoSeleccionado: Proyecto | null = null;
  @Input() proyectoData: Partial<Proyecto> = {};
  items: GastoOperacionExtendido[] = [];
  modulos: Modulo[] = [];
  usuario_id = 0;
  nombre_usuario = '';
  apellido = '';
  roles: string[] = [];
  permisos: string[] = [];
  unidadesUsadas: string[] = [];
  seleccionando: boolean = false;
  private cargando = false;
  private itemsSubject = new BehaviorSubject<GastoOperacionExtendido[]>([]);
  private _gastosPorModulo: {
    modulo: Modulo | null;
    gastos: GastoOperacionExtendido[];
  }[] = [];
  // Propiedades para mostrar panel de traslado
  itemSeleccionadoParaTraslado: GastoOperacionExtendido | null = null;
  moduloSeleccionadoParaTraslado: Modulo | null = null;
  nuevoModuloNombre: string = '';
  posicionesDisponibles: number[] = [];
  posicionSeleccionada: number = 1;
  nombreProyecto: string = '';

  mostrarConfirmacion = false;
  mensajeConfirmacion = '';
  mostrarError = false;
  mensajeError = '';
  mostrarOk = false;
  mensajeOk = '';
  constructor(
    private servicios: ServiciosService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarUnidadesGasto();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['identificadorGeneral'] && this.identificadorGeneral > 0) {
      this.cargarDatosProyecto(this.identificadorGeneral);
    } else {
      this.resetearEstadoItems();
    }
    if (changes['proyectoSeleccionado']) {
      this.nombreProyecto = this.proyectoSeleccionado?.NombreProyecto || '';
    }
  }

  cargarUnidadesGasto(): void {
    this.servicios.getUnidadesGastoOperacion().subscribe({
      next: (unidades: string[]) => {
        this.unidadesUsadas = unidades || [];
      },
      error: (err) => {
        this.unidadesUsadas = [];
      },
    });
  }

  private cargarDatosProyecto(idGeneral: number): void {
    if (!idGeneral) {
      this.resetearEstadoItems();
      return;
    }
    this.cargando = true;
    this.servicios.getProyectoCompleto(idGeneral).subscribe({
      next: ({ modulos, gastos, totales }) => {
        this.modulos = modulos || [];
        const gastosExt: GastoOperacionExtendido[] = (gastos || []).map(
          (g) => ({
            ...g,
            tipo: 'gasto' as const,
            esNuevo: false,
            editarModulo: false,
            editar: false,
            moduloId: g.modulo?.id ?? null,
            mostrarListaUnidad: false,
            unidadesFiltradasUnidad: [],
          })
        );
        this.items = [...gastosExt];
        if (totales) {
          this.items.forEach((item) => {
            if (item.tipo === 'gasto' && item.id) {
              const total = totales[item.id];
              if (total !== undefined) {
                item.precio_unitario = total;
                item.precio_literal = NumeroALetras.convertirConDecimal(
                  this.SumaPrecioUnitarioActividad(item)
                );
              }
            }
          });
        }
        this.finalizarCargaItems();
      },
      error: (err: any) => {
        this.resetearEstadoItems();
      },
      complete: () => {
        this.cargando = false;
      },
    });
  }

  private resetearEstadoItems(): void {
    this.items = [];
    this.cdr.detectChanges();
  }

  private finalizarCargaItems(): void {
    this.items.forEach((item) => {
      if (item.unidad) this.agregarUnidadSiNoExiste(item.unidad);
    });
    this._calcularGastosPorModulo();
    this.cdr.detectChanges();
  }

  agregarItem(): void {
    this.items.push({
      descripcion: '',
      unidad: '',
      cantidad: 0,
      precio_unitario: 0,
      precio_literal: '',
      esNuevo: true,
      editarModulo: true,
      editarUnidad: true,
      tipo: 'gasto',
      modulo: null,
      moduloId: null,
      mostrarListaUnidad: false,
      unidadesFiltradasUnidad: [],
    });
    this._calcularGastosPorModulo();
  }

  registrarItem(item: GastoOperacionExtendido): void {
    if (!this.identificadorGeneral) return;
    const payload: Partial<GastoOperacion> & { modulo_id?: number | null } = {
      ...item,
      identificador: {
        ...this.proyectoData,
        id_proyecto: this.identificadorGeneral,
        NombreProyecto: this.proyectoSeleccionado?.NombreProyecto?.trim() ?? '',
      } as Proyecto,
      modulo_id: item.moduloId ?? null,
    };
    delete payload.modulo;
    this.servicios.createGastoOperacion([payload]).subscribe({
      next: (res) => {
        const nuevoItem: GastoOperacionExtendido = {
          ...res.gastos[0],
          esNuevo: false,
          editarModulo: false,
          moduloId: res.gastos[0].modulo?.id ?? null,
          tipo: 'gasto',
          mostrarListaUnidad: false,
          unidadesFiltradasUnidad: [],
        };
        const index = this.items.findIndex((i) => i === item);
        if (index !== -1) {
          this.items[index] = nuevoItem;
        }
        if (nuevoItem.unidad) this.agregarUnidadSiNoExiste(nuevoItem.unidad);
        this._calcularGastosPorModulo();
        this.cdr.detectChanges();
        this.mensajeOk = 'Ítem registrado correctamente.';
        this.mostrarOk = true;
      },
      error: (err) => {
        this.mensajeError =
          'Error al registrar el ítem: ' +
          (err.error?.error || 'Verifica los datos enviados');
        this.mostrarError = true;
      },
    });
  }

  actualizarItem(item: GastoOperacionExtendido): void {
    const index = this.items.findIndex((i) => i === item);
    if (index === -1) return;
    const payload: Partial<GastoOperacion> & { modulo_id?: number | null } = {
      ...item,
      cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario),
      modulo_id: item.moduloId ?? null,
      id: item.id,
    };
    delete payload.modulo;
    this.servicios.updateGastoOperacion(payload).subscribe({
      next: (updatedItem) => {
        this.items[index] = {
          ...item,
          ...updatedItem,
          cantidad: Number(updatedItem.cantidad),
          esNuevo: false,
          editarModulo: false,
          moduloId: updatedItem.modulo?.id ?? null,
          mostrarListaUnidad: false,
          unidadesFiltradasUnidad: [],
        };
        if (updatedItem.unidad && updatedItem.unidad !== item.unidad)
          this.agregarUnidadSiNoExiste(updatedItem.unidad);
        this._calcularGastosPorModulo();
        this.cdr.detectChanges(); // Fuerza la actualización inmediata de todos los campos en la vista
        this.mensajeOk = 'Ítem actualizado correctamente.';
        this.mostrarOk = true;
      },
      error: (err) => {
        this.mensajeError =
          'Error al actualizar el ítem: ' +
          (err.error?.error || 'Verifica los datos enviados');
        this.mostrarError = true;
      },
    });
    this.itemsSubject.next([...this.items]);
  }

  eliminarItem(item: GastoOperacionExtendido): void {
    const index = this.items.findIndex((i) => i === item);
    if (index === -1) return;
    this.mensajeConfirmacion = `¿Seguro que deseas eliminar el ítem "${item.descripcion}"?`;
    this.accionPendiente = () => {
      if (!item.id) {
        this.items.splice(index, 1);
        this._calcularGastosPorModulo();
        this.mensajeOk = `El ítem "${item.descripcion}" ha sido eliminado.`;
        this.mostrarOk = true;
        return;
      }
      this.servicios.deleteGastoOperacion(item.id).subscribe({
        next: () => {
          this.items.splice(index, 1);
          this._calcularGastosPorModulo();
          this.mensajeOk = `El ítem "${item.descripcion}" ha sido eliminado.`;
          this.mostrarOk = true;
        },
        error: () => {
          this.mensajeError = 'Error al eliminar gasto.';
          this.mostrarError = true;
        },
      });
    };
    this.mostrarConfirmacion = true;
  }

  actualizarModulo(item: GastoOperacionExtendido): void {
    if (item.moduloId === null || item.moduloId === undefined) {
      item.modulo = null;
      item.editarModulo = true;
    } else {
      item.modulo = this.modulos.find((m) => m.id === item.moduloId) || null;
      item.editarModulo = true;
    }
  }

  get gastosPorModulo(): {
    modulo: Modulo | null;
    gastos: GastoOperacionExtendido[];
  }[] {
    return this._gastosPorModulo;
  }

  private _calcularGastosPorModulo(): void {
    const modulosConGastos: {
      modulo: Modulo | null;
      gastos: GastoOperacionExtendido[];
    }[] = [];
    this.modulos.forEach((modulo) => {
      const gastosDelModulo = this.items.filter(
        (item) => item.tipo === 'gasto' && item.moduloId === modulo.id
      );
      if (gastosDelModulo.length > 0) {
        modulosConGastos.push({ modulo, gastos: gastosDelModulo });
      }
    });
    const gastosSinModulo = this.items.filter(
      (item) => item.tipo === 'gasto' && !item.moduloId
    );
    if (gastosSinModulo.length > 0) {
      modulosConGastos.push({ modulo: null, gastos: gastosSinModulo });
    }
    this._gastosPorModulo = modulosConGastos;
  }

  getGlobalIndex(grupoIndex: number, itemIndex: number): number {
    let index = 0;
    for (let i = 0; i < grupoIndex; i++) {
      index += this.gastosPorModulo[i].gastos.length;
    }
    return index + itemIndex;
  }

  obtenerNumero(index: number): number {
    return this.items
      .slice(0, index + 1)
      .filter((item) => item.tipo === 'gasto').length;
  }

  get mostrarColumnaModulo(): boolean {
    return this.items.some(
      (item) =>
        item.tipo === 'gasto' && (!item.moduloId || item.moduloId === null)
    );
  }

  get totalLiteral(): string {
    return NumeroALetras.convertirConDecimal(this.total);
  }

  get totalGastosOperacionGeneral(): number {
    const total = this.items
      .filter(
        (item) =>
          item.tipo === 'gasto' &&
          item.id &&
          this.toNum(item.precio_unitario) > 0
      )
      .reduce((acc, item) => acc + this.toNum(item.precio_unitario), 0);
    return Number(total.toFixed(2));
  }

  get totalValorAgregado(): number {
    const total = this.items
      .filter((item) => item.tipo === 'gasto' && item.id)
      .reduce((acc, item) => acc + this.getValorAgregado(item), 0);
    return Number(total.toFixed(2));
  }

  get total(): number {
    const total = this.items
      .filter((item) => item.tipo === 'gasto' && item.id)
      .reduce(
        (acc, item) =>
          acc + this.MultiplicacionPrecioUnitarioActividadPORcantidad(item),
        0
      );
    return Number(total.toFixed(2));
  }

  getCostoVenta(item: GastoOperacionExtendido): number {
    const precio = this.toNum(item.precio_unitario);
    const ivaNominal = this.toNum(this.proyectoData.iva_tasa_nominal);
    const porcentajeGlobal = this.toNum(
      this.proyectoData.porcentaje_global_100
    );
    return precio - precio * (ivaNominal / porcentajeGlobal);
  }

  getMargenUtilidad(item: GastoOperacionExtendido): number {
    if (this.toNum(this.proyectoData.a_costo_venta) === 0) return 0;
    const margen = this.toNum(this.proyectoData.b_margen_utilidad);
    const aCosto = this.toNum(this.proyectoData.a_costo_venta);
    const porcentajeGlobal = this.toNum(
      this.proyectoData.porcentaje_global_100
    );
    return (
      (margen / porcentajeGlobal / (aCosto / porcentajeGlobal)) *
      this.getCostoVenta(item)
    );
  }

  getIvaEfectivaCalculo(): number {
    const ivaNominal = this.toNum(this.proyectoData.iva_tasa_nominal);
    const aCosto = this.toNum(this.proyectoData.a_costo_venta);
    const margen = this.toNum(this.proyectoData.b_margen_utilidad);
    return ivaNominal / (aCosto + margen);
  }

  getIvaEfectiva(item: GastoOperacionExtendido): number {
    return (
      (this.getCostoVenta(item) + this.getMargenUtilidad(item)) *
      this.getIvaEfectivaCalculo()
    );
  }

  getPrecioFactura(item: GastoOperacionExtendido): number {
    return (
      this.getCostoVenta(item) +
      this.getMargenUtilidad(item) +
      this.getIvaEfectiva(item)
    );
  }

  getValorAgregado(item: GastoOperacionExtendido): number {
    const valor =
      this.getPrecioFactura(item) - this.toNum(item.precio_unitario);
    return this.roundTo(valor, 2);
  }

  SumaPrecioUnitarioActividad(item: GastoOperacionExtendido): number {
    return this.roundTo(
      this.toNum(item.precio_unitario) + this.getValorAgregado(item),
      2
    );
  }

  MultiplicacionPrecioUnitarioActividadPORcantidad(
    item: GastoOperacionExtendido
  ): number {
    return this.roundTo(
      this.SumaPrecioUnitarioActividad(item) * this.toNum(item.cantidad),
      2
    );
  }
  roundTo(valor: number, decimales: number = 2): number {
    const factor = Math.pow(10, decimales);
    return Math.round(valor * factor) / factor;
  }
  toNum(valor: any): number {
    return Number(valor) || 0;
  }
  formatearNumero(valor: number | null | undefined): string {
    if (valor === null || valor === undefined || isNaN(Number(valor))) {
      return '';
    }
    // Convertir a string para analizar los decimales originales
    const valorStr = valor.toString();
    const partes = valorStr.split('.'); // [entero, decimales]
    const parteEntera = partes[0];
    const parteDecimal = partes[1] ?? '';
    // Formatear la parte entera con puntos de miles
    const parteEnteraFormateada = parteEntera.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      '.'
    );
    // Si tiene decimales, los agregamos con coma, sino solo la parte entera
    return parteDecimal
      ? `${parteEnteraFormateada},${parteDecimal}`
      : parteEnteraFormateada;
  }
  formatearCantidadInput(item: GastoOperacionExtendido): void {
    if (item.cantidad !== null && item.cantidad !== undefined) {
      const numero = Number(item.cantidad);
      if (!isNaN(numero)) {
        item.cantidad = numero; // mantiene los decimales originales
      }
    }
  }
  onCantidadInput(event: Event, item: GastoOperacionExtendido): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;
    valor = valor.replace(/[^0-9.,]/g, '');
    const valorCrudo = valor.replace(',', '.');
    const numero = parseFloat(valorCrudo);
    if (!isNaN(numero)) {
      item.cantidad = numero;
    } else {
      item.cantidad = 0;
    }
    input.value = valor;
  }
  private agregarUnidadSiNoExiste(unidad: string): void {
    const normalizado = unidad.trim();
    if (normalizado && !this.unidadesUsadas.includes(normalizado)) {
      this.unidadesUsadas.push(normalizado);
      this.unidadesUsadas.sort();
    }
  }

  // Funciones para Descripción (simplificada)
  guardarDescripcionPersonalizada(
    item: GastoOperacionExtendido,
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value.trim();
    valor = this.capitalizarTexto(valor); // Capitaliza automáticamente cada letra
    input.value = valor; // Actualiza el input en tiempo real
    item.descripcion = valor;
  }

  // Funciones para Unidad (independiente por ítem)
  filtrarUnidades(item: GastoOperacionExtendido, event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;
    valor = valor.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '');
    valor = this.capitalizarTexto(valor); // Capitaliza automáticamente cada letra
    input.value = valor; // Actualiza el input en tiempo real
    const unidadesProyecto = [
      ...new Set(
        this.items
          .filter((i) => i.unidad && i.unidad.trim())
          .map((i) => i.unidad!.trim())
      ),
    ];
    item.unidadesFiltradasUnidad = unidadesProyecto.filter((u) =>
      u.toLowerCase().includes(valor.toLowerCase())
    );
    item.unidad = valor;
  }
  mostrarUnidadesFila(item: GastoOperacionExtendido): void {
    this.seleccionando = false;
    this.items.forEach((i) => (i.mostrarListaUnidad = false));
    const unidadesProyecto = [
      ...new Set(
        this.items
          .filter((i) => i.unidad && i.unidad.trim())
          .map((i) => i.unidad!.trim())
      ),
    ];
    item.mostrarListaUnidad = true;
    item.unidadesFiltradasUnidad = [...unidadesProyecto];
  }

  guardarUnidadPersonalizada(
    item: GastoOperacionExtendido,
    event: Event
  ): void {
    if (this.seleccionando) return;
    const input = event.target as HTMLInputElement;
    let valor = input.value.trim();
    valor = this.capitalizarTexto(valor); // Capitaliza automáticamente cada letra
    input.value = valor; // Actualiza el input en tiempo real
    item.unidad = valor;
    if (valor) {
      this.agregarUnidadSiNoExiste(valor);
    } else {
      item.unidad = '';
    }
  }

  seleccionarUnidad(item: GastoOperacionExtendido, unidad: string): void {
    this.seleccionando = true;
    item.unidad = unidad;
    setTimeout(() => {
      item.mostrarListaUnidad = false;
      this.seleccionando = false;
    }, 100);
  }

  // Método auxiliar para capitalizar texto
  private capitalizarTexto(texto: string): string {
    return texto.toUpperCase();
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    const listaUnidades = document.querySelectorAll('.unidad-list');
    const esDentroUnidad = Array.from(listaUnidades).some((el) =>
      el.contains(target)
    );
    const esInputUnidad = target.classList.contains('input-unidad');
    if (!esDentroUnidad && !esInputUnidad && !this.seleccionando) {
      this.items.forEach((item) => (item.mostrarListaUnidad = false));
    }
  }

  // Mostrar panel de traslado
  mostrarPanelTraslado(item: GastoOperacionExtendido) {
    this.itemSeleccionadoParaTraslado = item;
    this.moduloSeleccionadoParaTraslado = item.modulo || null;
    this.nuevoModuloNombre = '';
  }

  confirmarTraslado(posicion?: number) {
    if (!this.itemSeleccionadoParaTraslado) return;

    // Crear módulo nuevo si se indicó nombre
    if (this.nuevoModuloNombre?.trim()) {
      const nuevoModulo: Modulo = {
        id: Date.now(),
        codigo: this.nuevoModuloNombre.toUpperCase().slice(0, 3),
        nombre: this.nuevoModuloNombre.toUpperCase(),
        proyecto: this.proyectoSeleccionado?.id_proyecto || 0,
      };
      this.modulos.push(nuevoModulo);
      this.moduloSeleccionadoParaTraslado = nuevoModulo;
    }

    const item = this.itemSeleccionadoParaTraslado;
    item.modulo = this.moduloSeleccionadoParaTraslado;
    item.moduloId = this.moduloSeleccionadoParaTraslado?.id || null;

    // Insertar en la posición elegida
    const grupo = this._gastosPorModulo.find(
      (g) => g.modulo?.id === item.moduloId || (!g.modulo && !item.moduloId)
    );
    if (grupo) {
      const pos = posicion !== undefined ? posicion - 1 : grupo.gastos.length;
      grupo.gastos.splice(pos, 0, item);
    } else {
      this._gastosPorModulo.push({ modulo: item.modulo, gastos: [item] });
    }

    this.reordenarNumeracion();
    this.actualizarItem(item);

    // Resetear modal
    this.itemSeleccionadoParaTraslado = null;
    this.moduloSeleccionadoParaTraslado = null;
    this.nuevoModuloNombre = '';
    this.posicionesDisponibles = [];
    this.posicionSeleccionada = 1;
  }

  // Cancelar traslado
  cancelarTraslado() {
    this.itemSeleccionadoParaTraslado = null;
    this.moduloSeleccionadoParaTraslado = null;
    this.nuevoModuloNombre = '';
  }

  // Método para actualizar numeración global después de mover ítems
  private reordenarNumeracion(): void {
    let numero = 1;
    this._gastosPorModulo.forEach((grupo) => {
      grupo.gastos.forEach((item) => {
        item.orden = numero++; // ahora TypeScript lo reconoce
      });
    });
    this.cdr.detectChanges();
  }

  actualizarOpcionesPosicion(): void {
    let moduloId: number | null = null;

    if (this.nuevoModuloNombre?.trim()) {
      // Si se va a crear un módulo nuevo, asumimos posición 1
      this.posicionesDisponibles = [1];
      this.posicionSeleccionada = 1;
      return;
    }

    if (this.moduloSeleccionadoParaTraslado) {
      moduloId = this.moduloSeleccionadoParaTraslado.id;
    }

    const grupo = this._gastosPorModulo.find(
      (g) => g.modulo?.id === moduloId || (!g.modulo && !moduloId)
    );
    const cantidadItems = grupo?.gastos.length ?? 0;

    // Permitir posiciones de 1 a cantidadItems + 1 (para agregar al final)
    this.posicionesDisponibles = Array.from(
      { length: cantidadItems + 1 },
      (_, i) => i + 1
    );
    if (this.posicionesDisponibles.length > 0) {
      this.posicionSeleccionada = this.posicionesDisponibles[0];
    }
  }
  enviarAEcuacion(item: GastoOperacionExtendido): void {
    const params: any = {
      proyecto: this.nombreProyecto,
      id_gasto_operaciones: item.id || 0,
      descripcion: item.descripcion || '',
      unidad: item.unidad || '',
      cantidad: item.cantidad || 0,
      precio_unitario: item.precio_unitario || 0,
      precio_literal: item.precio_literal || '',
      identificadorGeneral: this.identificadorGeneral || 0,
      // Parámetros de proyecto (usando proyectoData)
      carga_social: this.proyectoData.carga_social || 0,
      iva_efectiva: this.proyectoData.iva_efectiva || 0,
      herramientas: this.proyectoData.herramientas || 0,
      gastos_generales: this.proyectoData.gastos_generales || 0,
      porcentaje_global_100: this.proyectoData.porcentaje_global_100 || 0,
    };
    this.router.navigate(['panel-control/CrearEcuacion'], {
      queryParams: params,
    });
  }
  enviarTotalGastosGenerales(item: GastoOperacionExtendido): void {
    const params: any = {
      id_gasto_operaciones: item.id || 0,
      precio_unitario: item.precio_unitario || 0,
      identificadorGeneral: this.identificadorGeneral || 0,
      // Parámetros de proyecto (usando proyectoData)
      iva_tasa_nominal: this.proyectoData.iva_tasa_nominal || 0,
      it: this.proyectoData.it || 0,
      iue: this.proyectoData.iue || 0,
      ganancia: this.proyectoData.ganancia || 0,
      a_costo_venta: this.proyectoData.a_costo_venta || 0,
      b_margen_utilidad: this.proyectoData.b_margen_utilidad || 0,
      porcentaje_global_100: this.proyectoData.porcentaje_global_100 || 0,
    };
    this.router.navigate(['panel-control/PrecioFactura'], {
      queryParams: params,
    });
  }

  enviarTotalesAFactura(): void {
    const params: any = {
      identificadorGeneral: this.identificadorGeneral || 0,
      totalGastosOperacion: this.totalGastosOperacionGeneral,
      totalValorAgregado: this.totalValorAgregado,
      totalFactura: this.total,
      iva_tasa_nominal: this.proyectoData.iva_tasa_nominal || 0,
      it: this.proyectoData.it || 0,
      iue: this.proyectoData.iue || 0,
      ganancia: this.proyectoData.ganancia || 0,
      a_costo_venta: this.proyectoData.a_costo_venta || 0,
      b_margen_utilidad: this.proyectoData.b_margen_utilidad || 0,
      porcentaje_global_100: this.proyectoData.porcentaje_global_100 || 0,
    };
    this.router.navigate(['panel-control/PrecioFactura'], {
      queryParams: params,
    });
  }
  // Métodos para manejar eventos de los modales
  onAceptarConfirmacion() {
    this.mostrarConfirmacion = false;
    // Lógica específica después de aceptar (se define en el método que lo llama)
    if (this.accionPendiente) {
      this.accionPendiente();
      this.accionPendiente = null;
    }
  }
  onCancelarConfirmacion() {
    this.mostrarConfirmacion = false;
    this.accionPendiente = null;
  }
  onCerrarError() {
    this.mostrarError = false;
  }
  onCerrarOk() {
    this.mostrarOk = false;
  }
  // Propiedad para almacenar la acción pendiente (para confirmaciones)
  private accionPendiente: (() => void) | null = null;
}
