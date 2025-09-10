import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GastoOperacion, GastosGenerales, Proyecto } from '../../models/models';
import { ServiciosService } from '../../services/servicios.service';
import { NumeroALetras } from '../../utils/numeroALetras';
import {  map } from 'rxjs';
import { ExportService } from '../../services/export.service';

interface GastoOperacionExtendido extends Partial<GastoOperacion> {
  esNuevo?: boolean;
  editarUnidad?: boolean; 
}

@Component({
  selector: 'app-gastos-operaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gastos-operaciones.component.html',
  styleUrls: ['./gastos-operaciones.component.css'],
})
export class GastosOperacionesComponent implements OnInit {
  formatoInvalido: boolean = false;
  items: GastoOperacionExtendido[] = [];
  identificadorGeneral: number = 0;

  nombreProyecto: string = '';
  carga_social: number | null = null;
  iva_efectiva: number | null = null;
  herramientas: number | null = null;
  gastos_generales: number | null = null;
  iva_tasa_nominal: number | null = null;
  it: number | null = null;
  iue: number | null = null;
  ganancia: number | null = null;
  a_costo_venta: number | null = null;
  b_margen_utilidad: number | null = null;
  porcentaje_global_100: number | null = null;
  precio_unitario: number | null = null;


  listaProyectos: Proyecto[] = [];
  proyectoSeleccionado: Proyecto | null = null;
  itemsGastosGenerales: GastosGenerales[] = [];

  id_gasto_operaciones: number = 0;
  totalOperacionPorGasto: { [id: number]: number } = {};

  mostrarParametros: boolean = false;
  mostrarLista: boolean = false;
  proyectosFiltrados: Proyecto[] = [];


  usuario_id: number = 0;
  nombre_usuario: string = '';
  apellido: string = '';
  roles: string[] = [];
  permisos: string[] = [];

  constructor(private router: Router, private servicios: ServiciosService, private exportService: ExportService) {}

  ngOnInit(): void {
    this.recuperarUsuarioLocalStorage();
    this.identificadorGeneral = 0;
    this.items = [];
    
    this.cargarProyectos();
  }
  unidadTexto(value: string): string {
    const map: { [key: string]: string } = {
      BLS: 'BLS – BOLSA',
      BRR: 'BRR – BARRA',
      CD: 'CD – CUADRILLA DIA.',
      CJA: 'CJA – CAJA',
      CNX: 'CNX – CONEXION',
      EVE: 'EVE – EVENTO',
      GL: 'GL – GALON',
      GLB: 'GLB – GLOBAL',
      HA: 'HA – HECTAREA',
      HDR: 'HDR – HOMBRES POR DIA',
      HH: 'HH – HOMBRES HORA',
      HR: 'HR – HORA',
      HRS: 'HRS – HORAS',
      'HY.': 'HY. – HOYO',
      JGO: 'JGO – JUEGO',
      KG: 'KG – KILOGRAMOS',
      KIT: 'KIT – KITS',
      KM: 'KM – KILOMETRO',
      KMB: 'KMB – KILOMETROS BERMA',
      LT: 'LT – LITROS',
      M: 'M – METRO',
      M2: 'M2 – METROS CUADRADOS',
      M3: 'M3 – METROS CUBICOS',
      M3K: 'M3K – METRO CUBICO POR KILOMETRO',
      MED: 'MED – MEDICION',
      MK: 'MK – MOTO KILOMETRO',
      ML: 'ML – METROS LINEALES',
      P2: 'P2 – PIE CUADRADO',
      PAR: 'PAR – UN PAR',
      PER: 'PER – PERSONAS',
      PIE: 'PIE – PIE LINEAL',
      PLA: 'PLA – PLANTIN',
      PTO: 'PTO – PUNTO',
      PZA: 'PZA – PIEZA',
      RLL: 'RLL – ROLLO',
      TLL: 'TLL – TALLER',
      TN: 'TN – TONELADA',
      TON: 'TON – TONELADAS',
      UND: 'UND – UNIDAD',
    };
    return map[value] || 'Seleccione unidad';
  }
  recuperarUsuarioLocalStorage() {
      const usuarioStr = localStorage.getItem('usuarioLogueado');
      if (!usuarioStr) return;

      let datosUsuario: any = {};
      try {
        datosUsuario = JSON.parse(usuarioStr);
      } catch (error) {
        console.error('Error al parsear usuario desde localStorage', error);
        return;
      }
      this.usuario_id = datosUsuario.id ?? 0;
      this.nombre_usuario = datosUsuario.nombre ?? '';
      this.apellido = datosUsuario.apellido ?? '';
      this.roles = datosUsuario.rol ?? [];
      this.permisos = datosUsuario.permiso ?? [];
    }
  cargarProyectos(): void {
    this.servicios.getIdentificadorGeneral().subscribe({
      next: (res) => (this.listaProyectos = res),
      error: (err) => {
        console.error('Error al cargar proyectos:', err);
        alert('No se pudieron cargar los proyectos existentes.');
      },
    });
  }
  private toNum(v: any): number {
    return v === null || v === undefined || v === '' ? 0 : Number(v);
  }
  
  onProyectoSeleccionado(): void {
    if (!this.nombreProyecto) return;
    // Buscar proyecto en lista por el nombre
    const proyecto = this.listaProyectos.find(
      (p) => p.NombreProyecto.toLowerCase() === this.nombreProyecto.toLowerCase()
    );
    if (proyecto) {
        // Proyecto existente → cargar datos
        this.proyectoSeleccionado = proyecto;
        this.identificadorGeneral = proyecto.id_general;
        this.carga_social = proyecto.carga_social;
        this.iva_efectiva = proyecto.iva_efectiva;
        this.herramientas = proyecto.herramientas;
        this.gastos_generales = proyecto.gastos_generales;
        this.iva_tasa_nominal = proyecto.iva_tasa_nominal;
        this.it = proyecto.it;
        this.iue = proyecto.iue;
        this.ganancia = proyecto.ganancia;
        this.a_costo_venta = proyecto.a_costo_venta;
        this.b_margen_utilidad = proyecto.b_margen_utilidad;
        this.porcentaje_global_100 = proyecto.porcentaje_global_100;
        this.cargarGastos(this.identificadorGeneral);
      } else {
        // Proyecto nuevo → limpiar datos para registrar
        this.proyectoSeleccionado = null;
        this.identificadorGeneral = 0;
        this.carga_social = null;
        this.iva_efectiva = null;
        this.herramientas = null;
        this.gastos_generales = null;
        this.iva_tasa_nominal = null;
        this.it = null;
        this.iue = null;
        this.ganancia = null;
        this.a_costo_venta = null;
        this.b_margen_utilidad = null;
        this.porcentaje_global_100 = null;
        this.items = [];
      }
    if (!this.proyectoSeleccionado) return;
    this.identificadorGeneral = this.proyectoSeleccionado.id_general;
    this.nombreProyecto = this.proyectoSeleccionado.NombreProyecto;
    this.carga_social = this.proyectoSeleccionado.carga_social;
    this.iva_efectiva = this.proyectoSeleccionado.iva_efectiva;
    this.herramientas = this.proyectoSeleccionado.herramientas;
    this.gastos_generales = this.proyectoSeleccionado.gastos_generales;
    this.iva_tasa_nominal = this.proyectoSeleccionado.iva_tasa_nominal;
    this.it = this.proyectoSeleccionado.it;
    this.iue = this.proyectoSeleccionado.iue;
    this.ganancia = this.proyectoSeleccionado.ganancia;
    this.a_costo_venta = this.proyectoSeleccionado.a_costo_venta;
    this.b_margen_utilidad = this.proyectoSeleccionado.b_margen_utilidad;
    this.porcentaje_global_100 = this.proyectoSeleccionado.porcentaje_global_100;
    this.cargarGastos(this.identificadorGeneral);
  }
  crearIdentificadorSiEsNecesario(): void {
      if (this.identificadorGeneral === 0) {
      if (
        !this.nombreProyecto.trim() ||
        this.carga_social == null ||
        this.iva_efectiva == null ||
        this.herramientas == null ||
        this.gastos_generales == null ||
        this.iva_tasa_nominal == null ||
        this.it == null ||
        this.iue == null ||
        this.ganancia == null ||
        this.a_costo_venta == null ||
        this.b_margen_utilidad == null ||
        this.porcentaje_global_100 == null
      ) {
        alert('Completa todos los campos');
        return;
      }
      const proyecto: Partial<Proyecto> = {
        NombreProyecto: this.nombreProyecto.trim(),
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
        porcentaje_global_100: this.toNum(this.porcentaje_global_100),
        creado_por: this.usuario_id,          // 🔥 agregar
        modificado_por: this.usuario_id       // 🔥 agregar
      };

      this.servicios.createIdentificadorGeneral(proyecto).subscribe({
        next: (resp) => {
          this.identificadorGeneral = resp.id_general;
          this.nombreProyecto = resp.NombreProyecto;
          this.carga_social = resp.carga_social || 0;
          this.iva_efectiva = resp.iva_efectiva || 0;
          this.herramientas = resp.herramientas || 0;
          this.gastos_generales = resp.gastos_generales || 0;
          this.iva_tasa_nominal = resp.iva_tasa_nominal || 0;
          this.it = resp.it || 0;
          this.iue = resp.iue || 0;
          this.ganancia = resp.ganancia || 0;
          this.a_costo_venta = resp.a_costo_venta || 0;
          this.b_margen_utilidad = resp.b_margen_utilidad || 0;
          this.porcentaje_global_100 = resp.porcentaje_global_100 || 0;
          this.cargarGastos(this.identificadorGeneral);
          this.agregarItem();
          alert('Proyecto registrado correctamente.');
        },
        error: (err) => {
          alert('Error al registrar el proyecto: ' + (err.error?.error || 'Verifica los datos enviados'));
        }
      });
    } else {
      this.agregarItem();
    }
  }
  focusInput() {
    this.proyectosFiltrados = [...this.listaProyectos]; // Mostrar todos los proyectos
    this.mostrarLista = true;
  }

  filtrarProyectos(): void {
    const valor = this.nombreProyecto.toLowerCase();
    this.proyectosFiltrados = this.listaProyectos.filter(p =>
      p.NombreProyecto.toLowerCase().includes(valor)
    );
  }
    
  seleccionarProyecto(proyecto: Proyecto): void {
    this.nombreProyecto = proyecto.NombreProyecto;
    this.proyectoSeleccionado = proyecto;
    this.mostrarLista = false;
    this.onProyectoSeleccionado(); // Carga los porcentajes
  }
  @HostListener('document:click', ['$event'])
  clickFuera(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.mb-3')) {
      this.mostrarLista = false;
    }
  }
  eliminarProyecto(): void {
    if (!this.identificadorGeneral) {
      alert('Selecciona un proyecto para eliminar.');
      return;
    }

    if (confirm('¿Seguro que deseas eliminar este proyecto y todos sus registros asociados?')) {
      this.servicios.deleteIdentificadorGeneral(this.identificadorGeneral).subscribe({
        next: () => {
          alert('Proyecto eliminado correctamente.');
          this.identificadorGeneral = 0;
          this.nombreProyecto = '';
          this.items = [];
          this.listaProyectos = this.listaProyectos.filter(
            p => p.id_general !== this.proyectoSeleccionado?.id_general
          );
          this.proyectoSeleccionado = null;
        },
        error: (err) => {
          console.error('Error al eliminar proyecto:', err);
          alert('Error al eliminar el proyecto.');
        }
      });
    }
  }

  actualizarProyecto(): void {
    if (
      !this.nombreProyecto.trim() ||
      this.carga_social == null ||
      this.iva_efectiva == null ||
      this.herramientas == null ||
      this.gastos_generales == null ||
      this.iva_tasa_nominal == null ||
      this.it == null ||
      this.iue == null ||
      this.ganancia == null ||
      this.a_costo_venta == null ||
      this.b_margen_utilidad == null ||
      this.porcentaje_global_100 == null

    ) {
      alert('Completa todos los campos');
      return;
    }


const proyecto: Proyecto = {
  id_general: this.identificadorGeneral,
  NombreProyecto: this.nombreProyecto.trim(),
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
  porcentaje_global_100: this.toNum(this.porcentaje_global_100),
  creado_por: this.usuario_id,
  modificado_por: this.usuario_id
};


    this.servicios.updateIdentificadorGeneral(proyecto).subscribe({
      next: (resp) => {
        alert('Proyecto actualizado correctamente.');
        // Si quieres, puedes recargar la lista de proyectos aquí
        this.cargarProyectos();
      },
      error: (err) => {
        alert('Error al actualizar el proyecto: ' + (err.error?.error || 'Verifica los datos enviados'));
      }
    });
  }

  agregarItem(): void {
    this.items.push({
      descripcion: '',
      unidad: '',
      cantidad: 0,
      precio_unitario: 0,
      precio_literal: '',
      esNuevo: true,
    });
  }

  obtenerUltimoIdentificadorGeneral(): void {
    this.servicios.getIdentificadorGeneral().subscribe({
      next: (res) => {
        if (res.length > 0) {
          const ultimo = [...res].sort((a, b) => b.id_general - a.id_general)[0];
          this.identificadorGeneral = ultimo.id_general;
          this.cargarGastos(ultimo.id_general);
        } else {
          this.identificadorGeneral = 0;
        }
      },
      error: (err) => {
        console.error('Error al obtener identificadores:', err);
        alert('No se pudo cargar el último identificador.');
      },
    });
  }


  cargarGastos(idGeneral: number): void {
    this.servicios.getGastoOperacionID(idGeneral).subscribe({
      next: (res) => {
        this.items = res.map((item) => ({ ...item, esNuevo: false }));
        
        // Actualizar cada item con su totalOperacionPorGasto
        this.items.forEach((item) => {
          if (item.id !== undefined) {
            this.servicios.getGastosGenerales(item.id).pipe(
              map((gastos: GastosGenerales[]) => gastos.length > 0 ? gastos[0].total : 0)
            ).subscribe((total: number) => {
              this.totalOperacionPorGasto[item.id as number] = total;

              // 🔥 ACTUALIZAR EL PRECIO UNITARIO DESDE totalOperacionPorGasto
              item.precio_unitario = total;

              // 🔥 ACTUALIZAR LITERAL AUTOMÁTICAMENTE
              item.precio_literal = NumeroALetras.convertirConDecimal(this.SumaPrecioUnitarioActividad(item));
            });
          }
        });
      },
    });
  }


  registrarItem(index: number): void {
    const item = this.items[index];
    const payload: Partial<GastoOperacion> = {
      descripcion: item.descripcion || '',
      unidad: item.unidad || '',
      cantidad: item.cantidad || 0,
      precio_unitario: item.precio_unitario || 0,
      precio_literal: item.precio_literal || '',
      identificador: { 
        id_general: this.identificadorGeneral, 
        NombreProyecto: this.nombreProyecto,
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
        porcentaje_global_100: this.toNum(this.porcentaje_global_100),
        creado_por: this.usuario_id,      // 🔥 al nivel raíz
        modificado_por: this.usuario_id   // 🔥 al nivel raíz
      },
      creado_por: this.usuario_id,
      modificado_por: this.usuario_id

    };

    this.servicios.createGastoOperacion([payload]).subscribe({
      next: (res) => {
        this.items[index] = { ...res.gastos[0], esNuevo: false };
        this.identificadorGeneral = res.identificador_general;
      },
      error: (err) => {
        console.error('Error al registrar el ítem:', err);
        alert('Error al registrar el ítem.');
      },
    });
  }

  actualizarItem(index: number): void {
    const item = this.items[index];
    const payload: Partial<GastoOperacion> = {
      ...item,
      cantidad: Number(item.cantidad),          // 🔥 asegúrate que sean números
      precio_unitario: Number(item.precio_unitario),
      modificado_por: this.usuario_id
    };

    console.log("Payload enviado:", payload);

    this.servicios.updateGastoOperacion(payload).subscribe({
      next: (res) => {
        console.log("Respuesta del backend:", res);
        alert('Ítem actualizado correctamente.');
        this.cargarGastos(this.identificadorGeneral);
      },
      error: (err) => {
        console.error('Error al actualizar el ítem:', err);
        alert('Error al actualizar el ítem.');
      },
    });
  }



  eliminarItem(index: number): void {
    const item = this.items[index];
    if (!item.id) {
      this.items.splice(index, 1);
      return;
    }
    this.servicios.deleteGastoOperacion(item.id).subscribe({
      next: () => {
        alert('Ítem eliminado correctamente.');
        this.items.splice(index, 1);
      },
      error: (err) => {
        console.error('Error al eliminar el ítem:', err);
        alert('Error al eliminar el ítem.');
      },
    });
  }

  validarFormatoDecimal(item: any): void {
    const valor = item.precio_unitario;
    const regex = /^\d+(\.\d{1,2})?$/;
    if (valor?.toString().startsWith('00')) {
      item.precio_unitario = 0;
    } else if (!regex.test(valor?.toString())) {
      item.precio_unitario = 0;
      this.formatoInvalido = true;
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


  enviarAEcuacion(item: GastoOperacionExtendido): void {
    this.router.navigate(['panel-control/CrearEcuacion'], {
      queryParams: {
        proyecto: this.nombreProyecto,
        id_gasto_operaciones: item.id,
        descripcion: item.descripcion || '',
        unidad: item.unidad || '',
        cantidad: item.cantidad || 0,
        precio_unitario: item.precio_unitario || 0,
        precio_literal: item.precio_literal || '',
        identificadorGeneral: this.identificadorGeneral,
        carga_social: this.carga_social,
        iva_efectiva: this.iva_efectiva,
        herramientas: this.herramientas,
        gastos_generales: this.gastos_generales,
        porcentaje_global_100: this.porcentaje_global_100

      },
    });
  }
  enviarTotalGastosGenerales(item: GastoOperacionExtendido): void {
    this.router.navigate(['panel-control/PrecioFactura'], {
      queryParams: {
        id_gasto_operaciones: item.id,
        precio_unitario: item.precio_unitario || 0,
        identificadorGeneral: this.identificadorGeneral,
        iva_tasa_nominal: this.iva_tasa_nominal,
        it: this.it,
        iue: this.iue,
        ganancia: this.ganancia,
        a_costo_venta: this.a_costo_venta,
        b_margen_utilidad: this.b_margen_utilidad,
        porcentaje_global_100: this.porcentaje_global_100

      },
    });
  }
  get total(): number {
    return this.items.reduce(
      (acc, item) => acc + this.MultiplicacionPrecioUnitarioActividadPORcantidad(item),
      0
    );
  }

  get totalLiteral(): string {
    return NumeroALetras.convertirConDecimal(this.total);
  }
  // operaciones para el calulo del Valor Agregado

  private twoDecimals(value: number): number {
    return Number(value.toFixed(2)); // mantiene solo 2 decimales
  }



  getCostoVenta(item: GastoOperacionExtendido): number {
    return (this.toNum(item.precio_unitario)) - ((this.toNum(item.precio_unitario)) * (this.toNum(this.iva_tasa_nominal) / this.toNum(this.porcentaje_global_100)));
  }
  getMargenUtilidad(item: GastoOperacionExtendido): number {
    if (this.a_costo_venta === 0) return 0;
    return (
      (this.toNum(this.b_margen_utilidad) / this.toNum(this.porcentaje_global_100)) /
      (this.toNum(this.a_costo_venta) / this.toNum(this.porcentaje_global_100))
    ) * this.getCostoVenta(item);
  }
  getIvaEfectivaCalculo(): number {
    return this.toNum(this.iva_tasa_nominal) / (this.toNum(this.a_costo_venta) + this.toNum(this.b_margen_utilidad));
  }
  getIvaEfectiva(item: GastoOperacionExtendido): number {
    return (this.getCostoVenta(item) + this.getMargenUtilidad(item)) * this.getIvaEfectivaCalculo();
  }
  getPrecioFactura(item: GastoOperacionExtendido): number {
    return this.getCostoVenta(item) + this.getMargenUtilidad(item) + this.getIvaEfectiva(item);
  }
  getValorAgregado(item: GastoOperacionExtendido): number {
    return this.getPrecioFactura(item) - this.toNum(item.precio_unitario);
  }
  SumaPrecioUnitarioActividad(item: GastoOperacionExtendido): number {
    const result = this.toNum(item.precio_unitario) + this.getValorAgregado(item);
    return this.twoDecimals(result);  // ✅ redondear aquí
  }

  MultiplicacionPrecioUnitarioActividadPORcantidad(item: GastoOperacionExtendido): number {
    const unitario = this.SumaPrecioUnitarioActividad(item); // ya con 2 decimales
    const result = unitario * this.toNum(item.cantidad);
    return this.twoDecimals(result);  // ✅ y aquí también
  }
  
  exportPDF() {
    this.exportService.generatePDF('contentToExport', 'factura.pdf');
  }
  exportWORD() {
    this.exportService.generateWord('contentToExport', 'factura.docx');
  }

}