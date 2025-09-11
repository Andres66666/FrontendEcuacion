import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';

import { ServiciosService } from '../../services/servicios.service';
import { ExportService } from '../../services/export.service';

import { Proyecto, GastoOperacion, GastosGenerales } from '../../models/models';

import { ConfirmacionComponent } from '../mensajes/confirmacion/confirmacion/confirmacion.component';
import { OkComponent } from '../mensajes/ok/ok.component';
import { ErrorComponent } from '../mensajes/error/error.component';
import { NumeroALetras } from '../../utils/numeroALetras';
import { UNIDADES, unidadTexto } from '../../models/unidades';

interface GastoOperacionExtendido extends Partial<GastoOperacion> {
  esNuevo?: boolean;
  editarUnidad?: boolean; 
}

@Component({
  selector: 'app-gastos-operaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmacionComponent, OkComponent, ErrorComponent],
  templateUrl: './gastos-operaciones.component.html',
  styleUrls: ['./gastos-operaciones.component.css'],
})
export class GastosOperacionesComponent implements OnInit {
   // Propiedades para los parámetros del formulario
  carga_social: number = 0;
  iva_efectiva: number = 0;
  herramientas: number = 0;
  gastos_generales: number = 0;
  iva_tasa_nominal: number = 0;
  it: number = 0;
  iue: number = 0;
  ganancia: number = 0;
  a_costo_venta: number = 0;
  b_margen_utilidad: number = 0;
  porcentaje_global_100: number = 100;

  // Propiedad para el nombre del proyecto (usada en ngModel)
  nombreProyecto: string = '';
  
  // ✅ Mensajes y estado UI
  formatoInvalido = false;
  mostrarConfirmacion = false;
  tipoConfirmacion: 'proyecto' | 'item' | null = null;
  itemIndexAEliminar: number | null = null;
  mensajeConfirmacion = '';
  mensajeExito = '';
  mensajeError = '';

  mostrarParametros = false;
  mostrarLista = false;
  proyectosFiltrados: Proyecto[] = [];

  // ✅ Usuario logueado
  usuario_id = 0;
  nombre_usuario = '';
  apellido = '';
  roles: string[] = [];
  permisos: string[] = [];

  // ✅ Proyectos y gastos
  listaProyectos: Proyecto[] = [];
  proyectoSeleccionado: Proyecto | null = null;
  proyectoData: Partial<Proyecto> = {};
  items: GastoOperacionExtendido[] = [];
  totalOperacionPorGasto: { [id: number]: number } = {};
  identificadorGeneral = 0;

  unidades = UNIDADES;
  
  constructor(
    private router: Router,
    private servicios: ServiciosService,
    private exportService: ExportService
  ) {}

  ngOnInit(): void {
    this.recuperarUsuarioLocalStorage();
    this.cargarProyectos();
    // 🔹 Intentar recuperar último proyecto seleccionado
    const ultimoProyectoStr = localStorage.getItem("ultimoProyectoSeleccionado");
    if (ultimoProyectoStr) {
      try {
        const proyectoGuardado: Proyecto = JSON.parse(ultimoProyectoStr);
        this.asignarProyecto(proyectoGuardado);
      } catch (error) {
        console.error("Error al cargar último proyecto", error);
      }
    }
  }


  // -------------------- UTILIDADES --------------------


  /**
   * Convierte a número seguro, devuelve 0 si es NaN o undefined
   */
  toNum(valor: any): number {
    return Number(valor) || 0;
  }

  /**
   * Redondea un número a n decimales usando normas estándar
   */
  roundTo(valor: number, decimales: number = 2): number {
    const factor = Math.pow(10, decimales);
    return Math.round(valor * factor) / factor;
  }


  private twoDecimals(value: number): number {
    return Number(value.toFixed(2));
  }

  private mostrarMensaje(tipo: 'exito' | 'error', mensaje: string, duracion = 20000) {
    if (tipo === 'exito') this.mensajeExito = mensaje;
    else this.mensajeError = mensaje;

    setTimeout(() => {
      if (tipo === 'exito') this.mensajeExito = '';
      else this.mensajeError = '';
    }, duracion);
  }

  private validarProyectoCompleto(): boolean {
    for (const key in this.proyectoData) {
      if (this.proyectoData[key as keyof Proyecto] === null || this.proyectoData[key as keyof Proyecto] === '') {
        this.mostrarMensaje('error', 'Completa todos los campos');
        return false;
      }
    }
    return true;
  }

  private asignarProyecto(proyecto: Proyecto | null) {
    if (!proyecto) {
      this.proyectoSeleccionado = null;
      this.proyectoData = {};
      this.items = [];
      this.identificadorGeneral = 0;
      this.nombreProyecto = '';

      // Reset de parámetros
      this.carga_social = 0;
      this.iva_efectiva = 0;
      this.herramientas = 0;
      this.gastos_generales = 0;
      this.iva_tasa_nominal = 0;
      this.it = 0;
      this.iue = 0;
      this.ganancia = 0;
      this.a_costo_venta = 0;
      this.b_margen_utilidad = 0;
      this.porcentaje_global_100 = 0;

      // 🔹 limpiar localStorage si no hay proyecto
      localStorage.removeItem("ultimoProyectoSeleccionado");
      return;
    }

    this.proyectoSeleccionado = proyecto;
    this.proyectoData = { ...proyecto };
    this.identificadorGeneral = proyecto.id_general;
    this.nombreProyecto = proyecto.NombreProyecto;

    // Asignar valores reales de los parámetros
    this.carga_social = proyecto.carga_social ?? 0;
    this.iva_efectiva = proyecto.iva_efectiva ?? 0;
    this.herramientas = proyecto.herramientas ?? 0;
    this.gastos_generales = proyecto.gastos_generales ?? 0;
    this.iva_tasa_nominal = proyecto.iva_tasa_nominal ?? 0;
    this.it = proyecto.it ?? 0;
    this.iue = proyecto.iue ?? 0;
    this.ganancia = proyecto.ganancia ?? 0;
    this.a_costo_venta = proyecto.a_costo_venta ?? 0;
    this.b_margen_utilidad = proyecto.b_margen_utilidad ?? 0;
    this.porcentaje_global_100 = proyecto.porcentaje_global_100 ?? 0;

    this.cargarGastos(this.identificadorGeneral);
    localStorage.setItem("ultimoProyectoSeleccionado", JSON.stringify(proyecto));
  }


  // -------------------- USUARIO --------------------

  private recuperarUsuarioLocalStorage() {
    const usuarioStr = localStorage.getItem('usuarioLogueado');
    if (!usuarioStr) return;

    try {
      const datosUsuario = JSON.parse(usuarioStr);
      this.usuario_id = datosUsuario.id ?? 0;
      this.nombre_usuario = datosUsuario.nombre ?? '';
      this.apellido = datosUsuario.apellido ?? '';
      this.roles = datosUsuario.rol ?? [];
      this.permisos = datosUsuario.permiso ?? [];
    } catch (error) {
      console.error('Error al parsear usuario desde localStorage', error);
    }
  }

  // -------------------- PROYECTOS --------------------

  cargarProyectos(): void {
    this.servicios.getIdentificadorGeneral().subscribe({
      next: res => this.listaProyectos = res,
      error: err => this.mostrarMensaje('error', 'No se pudieron cargar los proyectos existentes.')
    });
  }

  onProyectoSeleccionado(): void {
    const proyecto = this.listaProyectos.find(
      p => p.NombreProyecto.toLowerCase() === (this.proyectoData.NombreProyecto ?? '').toLowerCase()
    );
    this.asignarProyecto(proyecto || null);
  }

  crearIdentificadorSiEsNecesario(): void {
    if (this.identificadorGeneral !== 0) {
      this.agregarItem();
      return;
    }

    if (!this.validarProyectoCompleto()) return;

    this.mensajeConfirmacion = '¿Deseas registrar el proyecto?';
    this.tipoConfirmacion = 'proyecto';
    this.mostrarConfirmacion = true;
  }


  private registrarProyecto(): void {
    const proyecto: Partial<Proyecto> = {
      NombreProyecto: this.nombreProyecto?.trim() ?? '',
      carga_social: this.toNum(this.carga_social),
      iva_efectiva: this.toNum(this.iva_efectiva),
      herramientas: this.toNum(this.herramientas),
      gastos_generales: this.toNum(this.gastos_generales),
      iva_tasa_nominal: this.toNum(this.iva_tasa_nominal),
      it: this.toNum(this.it),
      iue: this.toNum(this.iue),
      ganancia: this.toNum(this.ganancia),
      a_costo_venta: this.toNum(this.a_costo_venta),
      b_margen_utilidad: this.toNum(this.b_margen_utilidad),
      porcentaje_global_100: 100,
      creado_por: this.usuario_id,
      modificado_por: this.usuario_id
    };

    this.servicios.createIdentificadorGeneral(proyecto).subscribe({
      next: resp => {
        this.identificadorGeneral = resp.id_general;
        this.asignarProyecto(resp);
        this.agregarItem();
        this.mostrarMensaje('exito', 'Proyecto registrado correctamente.');
      },
      error: err => this.mostrarMensaje(
        'error',
        'Error al registrar el proyecto: ' + (err.error?.error || 'Verifica los datos enviados')
      )
    });
  }



  actualizarProyecto(): void {
    if (!this.validarProyectoCompleto()) return;

    const proyecto: Proyecto = {
      id_general: this.identificadorGeneral,
      NombreProyecto: this.nombreProyecto?.trim() ?? '',
      carga_social: this.toNum(this.carga_social),
      iva_efectiva: this.toNum(this.iva_efectiva),
      herramientas: this.toNum(this.herramientas),
      gastos_generales: this.toNum(this.gastos_generales),
      iva_tasa_nominal: this.toNum(this.iva_tasa_nominal),
      it: this.toNum(this.it),
      iue: this.toNum(this.iue),
      ganancia: this.toNum(this.ganancia),
      a_costo_venta: this.toNum(this.a_costo_venta),
      b_margen_utilidad: this.toNum(this.b_margen_utilidad),
      porcentaje_global_100: 100,
      modificado_por: this.usuario_id,
      creado_por: this.usuario_id
    };

    this.servicios.updateIdentificadorGeneral(proyecto).subscribe({
      next: () => {
        this.mostrarMensaje('exito', 'Proyecto actualizado correctamente.');

        // 🔹 Refrescar inmediatamente el estado local
        this.asignarProyecto(proyecto);

        // 🔹 Reemplazarlo en la lista de proyectos
        this.listaProyectos = this.listaProyectos.map(p =>
          p.id_general === proyecto.id_general ? proyecto : p
        );
      },
      error: err => this.mostrarMensaje(
        'error',
        'Error al actualizar el proyecto: ' + (err.error?.error || 'Verifica los datos enviados')
      )
    });
  }


  eliminarProyecto(): void {
    if (!this.identificadorGeneral) return this.mostrarMensaje('error', 'Selecciona un proyecto para eliminar.');

    this.mensajeConfirmacion = '¿Seguro que deseas eliminar este proyecto y todos sus registros asociados?';
    this.tipoConfirmacion = 'proyecto';
    this.mostrarConfirmacion = true;
  }
  nuevoProyecto(): void {
    this.asignarProyecto(null); // 🔹 esto ya limpia el estado y los parámetros
    this.mostrarParametros = true; // opcional: abre la tabla de parámetros
    this.mostrarMensaje('exito', 'Listo para crear un nuevo proyecto.');
  }

  // -------------------- ITEMS --------------------
  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  }
  agregarItem(): void {
    this.items.push({ descripcion: '', unidad: '', cantidad: 0, precio_unitario: 0, precio_literal: '', esNuevo: true });
  }

  cargarGastos(idGeneral: number): void {
    this.servicios.getGastoOperacionID(idGeneral).subscribe({
      next: res => {
        this.items = res.map(item => ({ ...item, esNuevo: false }));

        this.items.forEach(item => {
          if (!item.id) return;
          this.servicios.getGastosGenerales(item.id).pipe(
            map((gastos: GastosGenerales[]) => gastos.length > 0 ? gastos[0].total : 0)
          ).subscribe(total => {
            this.totalOperacionPorGasto[item.id!] = total;
            item.precio_unitario = total;
            item.precio_literal = NumeroALetras.convertirConDecimal(this.SumaPrecioUnitarioActividad(item));
          });
        });
      }
    });
  }

  registrarItem(index: number): void {
    const item = this.items[index];
    const payload: Partial<GastoOperacion> = {
      ...item,
      identificador: { 
        ...this.proyectoData, 
        id_general: this.identificadorGeneral, 
        NombreProyecto: this.nombreProyecto?.trim() ?? ''
      } as Proyecto,
      creado_por: this.usuario_id,
      modificado_por: this.usuario_id
    };

    this.servicios.createGastoOperacion([payload]).subscribe({
      next: res => {
        const nuevoItem = { ...res.gastos[0], esNuevo: false };
        this.items[index] = nuevoItem; // 🔹 actualizar tabla
        this.identificadorGeneral = res.identificador_general;

        this.mostrarMensaje('exito', 'Ítem registrado correctamente.');
      },
      error: err => this.mostrarMensaje('error', 'Error al registrar el ítem: ' + (err.error?.error || 'Verifica los datos enviados'))
    });
  }

  actualizarItem(index: number): void {
    const item = this.items[index];
    const payload: Partial<GastoOperacion> = {
      ...item,
      cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario),
      modificado_por: this.usuario_id
    };

    this.servicios.updateGastoOperacion(payload).subscribe({
      next: () => {
        this.mostrarMensaje('exito', 'Ítem actualizado correctamente.');

        // 🔹 Actualizar estado local sin esperar recargar todo
        this.items[index] = { ...item, ...payload, esNuevo: false };
      },
      error: err => this.mostrarMensaje('error', 'Error al actualizar el ítem: ' + (err.error?.error || 'Verifica los datos enviados'))
    });
  }


  eliminarItem(index: number): void {
    const item = this.items[index];
    if (!item.id) {
      this.items.splice(index, 1);
      return;
    }

    this.mensajeConfirmacion = '¿Seguro que deseas eliminar este ítem?';
    this.tipoConfirmacion = 'item';
    this.itemIndexAEliminar = index;
    this.mostrarConfirmacion = true;
  }

  // -------------------- CONFIRMACION --------------------


  manejarAceptar() {
    this.mostrarConfirmacion = false;

    if (this.tipoConfirmacion === 'proyecto') {
      if (this.identificadorGeneral === 0) {
        // Registrar nuevo proyecto
        this.registrarProyecto();
      } else {
        // Eliminar proyecto existente
        this.servicios.deleteIdentificadorGeneral(this.identificadorGeneral).subscribe({
          next: () => {
            this.mostrarMensaje('exito', 'Proyecto eliminado correctamente.');
            this.asignarProyecto(null);
            this.listaProyectos = this.listaProyectos.filter(p => p.id_general !== this.identificadorGeneral);
          },
          error: err => this.mostrarMensaje('error', 'Error al eliminar el proyecto.')
        });
      }
    }

    if (this.tipoConfirmacion === 'item' && this.itemIndexAEliminar !== null) {
      const item = this.items[this.itemIndexAEliminar];
      this.servicios.deleteGastoOperacion(item.id!).subscribe({
        next: () => {
          this.mostrarMensaje('exito', 'Ítem eliminado correctamente.');
          this.items.splice(this.itemIndexAEliminar!, 1);
        },
        error: () => this.mostrarMensaje('error', 'Error al eliminar el ítem.')
      });
    }

    this.tipoConfirmacion = null;
    this.itemIndexAEliminar = null;
  }

  manejarCancelar() {
    this.mostrarConfirmacion = false;
    this.tipoConfirmacion = null;
    this.itemIndexAEliminar = null;
  }
  manejarOk() {
    this.mensajeExito = '';
  }

  manejarError() {
    this.mensajeError = '';
  }

  // -------------------- UNIDADES --------------------
  unidadTexto = unidadTexto;



  validarFormatoDecimal(item: any): void {
    const valor = item.precio_unitario;
    const regex = /^\d+(\.\d{1,2})?$/;
    if (valor?.toString().startsWith('00') || !regex.test(valor?.toString())) {
      item.precio_unitario = 0;
      this.formatoInvalido = !regex.test(valor?.toString());
    } else {
      this.formatoInvalido = false;
    }
  }

  onPrecioUnitarioChange(index: number): void {
    const item = this.items[index];
    this.validarFormatoDecimal(item);
    if (item.precio_unitario != undefined) {
      item.precio_literal = NumeroALetras.convertirConDecimal(this.SumaPrecioUnitarioActividad(item));
    }
  }

  // -------------------- NAVEGACION --------------------
  enviarAEcuacion(item: GastoOperacionExtendido): void {
    const params: any = {
      proyecto: this.nombreProyecto || '',
      id_gasto_operaciones: item.id || 0,
      descripcion: item.descripcion || '',
      unidad: item.unidad || '',
      cantidad: item.cantidad || 0,
      precio_unitario: item.precio_unitario || 0,
      precio_literal: item.precio_literal || '',
      identificadorGeneral: this.identificadorGeneral || 0,
      // Parámetros de proyecto
      carga_social: this.carga_social || 0,
      iva_efectiva: this.iva_efectiva || 0,
      herramientas: this.herramientas || 0,
      gastos_generales: this.gastos_generales || 0,
      porcentaje_global_100: this.porcentaje_global_100 || 0
    };

    this.router.navigate(['panel-control/CrearEcuacion'], { queryParams: params });
  }

  enviarTotalGastosGenerales(item: GastoOperacionExtendido): void {
    const params: any = {
      id_gasto_operaciones: item.id || 0,
      precio_unitario: item.precio_unitario || 0,
      identificadorGeneral: this.identificadorGeneral || 0,
      // Parámetros de proyecto
      iva_tasa_nominal: this.iva_tasa_nominal || 0,
      it: this.it || 0,
      iue: this.iue || 0,
      ganancia: this.ganancia || 0,
      a_costo_venta: this.a_costo_venta || 0,
      b_margen_utilidad: this.b_margen_utilidad || 0,
      porcentaje_global_100: this.porcentaje_global_100 || 0
    };

    this.router.navigate(['panel-control/PrecioFactura'], { queryParams: params });
  }


  // -------------------- CALCULOS --------------------

  // Total general de la lista
  // Total final usando valores ya redondeados
  get total(): number {
    return this.items.reduce((acc, item) => acc + this.MultiplicacionPrecioUnitarioActividadPORcantidad(item), 0);
  }

  // Total literal en letras
  get totalLiteral(): string {
    return NumeroALetras.convertirConDecimal(this.total);
  }
  // Costo de venta: precio_unitario - IVA nominal proporcional
  getCostoVenta(item: GastoOperacionExtendido): number {
    const precio = this.toNum(item.precio_unitario);
    const ivaNominal = this.toNum(this.proyectoData.iva_tasa_nominal);
    const porcentajeGlobal = this.toNum(this.proyectoData.porcentaje_global_100);

    return precio - (precio * (ivaNominal / porcentajeGlobal));
  }
  // Margen de utilidad
  getMargenUtilidad(item: GastoOperacionExtendido): number {
    if (this.toNum(this.proyectoData.a_costo_venta) === 0) return 0;

    const margen = this.toNum(this.proyectoData.b_margen_utilidad);
    const aCosto = this.toNum(this.proyectoData.a_costo_venta);
    const porcentajeGlobal = this.toNum(this.proyectoData.porcentaje_global_100);

    return ((margen / porcentajeGlobal) / (aCosto / porcentajeGlobal)) * this.getCostoVenta(item);
  }
  // IVA efectiva
  getIvaEfectivaCalculo(): number {
    const ivaNominal = this.toNum(this.proyectoData.iva_tasa_nominal);
    const aCosto = this.toNum(this.proyectoData.a_costo_venta);
    const margen = this.toNum(this.proyectoData.b_margen_utilidad);

    return ivaNominal / (aCosto + margen);
  }
  getIvaEfectiva(item: GastoOperacionExtendido): number {
    return (this.getCostoVenta(item) + this.getMargenUtilidad(item)) * this.getIvaEfectivaCalculo();
  }
  // Precio factura
  getPrecioFactura(item: GastoOperacionExtendido): number {
    return this.getCostoVenta(item) + this.getMargenUtilidad(item) + this.getIvaEfectiva(item);
  }
  // Valor agregado
  getValorAgregado(item: GastoOperacionExtendido): number {
    const valor = this.getPrecioFactura(item) - this.toNum(item.precio_unitario);
    return this.roundTo(valor, 2);
  }
  // Suma precio unitario actividad redondeada
  SumaPrecioUnitarioActividad(item: GastoOperacionExtendido): number {
    return this.roundTo(this.toNum(item.precio_unitario) + this.getValorAgregado(item), 2);
  }
  // Multiplicación precio unitario por cantidad redondeada
  MultiplicacionPrecioUnitarioActividadPORcantidad(item: GastoOperacionExtendido): number {
    return this.roundTo(this.SumaPrecioUnitarioActividad(item) * this.toNum(item.cantidad), 2);
  }

  // -------------------- EXPORT --------------------

  exportPDF() { this.exportService.generatePDF('contentToExport', 'factura.pdf'); }
  exportWORD() { this.exportService.generateWord('contentToExport', 'factura.docx'); }

  // -------------------- FILTRO PROYECTOS --------------------

  focusInput() { this.proyectosFiltrados = [...this.listaProyectos]; this.mostrarLista = true; }
  filtrarProyectos(): void {
    const valor = (this.proyectoData.NombreProyecto ?? '').toLowerCase();
    this.proyectosFiltrados = this.listaProyectos.filter(p => p.NombreProyecto.toLowerCase().includes(valor));
  }
  seleccionarProyecto(proyecto: Proyecto): void {
    this.nombreProyecto = proyecto.NombreProyecto; // Esto mantiene el nombre en el input
    this.asignarProyecto(proyecto);
    this.mostrarLista = false; // cerrar dropdown
  }


  @HostListener('document:click', ['$event'])
  clickFuera(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.mb-3')) this.mostrarLista = false;
  }

}
