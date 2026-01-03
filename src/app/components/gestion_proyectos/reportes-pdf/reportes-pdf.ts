import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  OnDestroy,
  Output,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExportService } from '../../../services/export.service';
import { ServiciosProyectos } from '../service/servicios-proyectos';
import { GastoOperacion, Proyecto } from '../models/modelosProyectos';

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
}

@Component({
  selector: 'app-reportes-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes-pdf.html',
  styleUrl: './reportes-pdf.css',
})
export class ReportesPDf implements OnInit, OnChanges, OnDestroy {
  @Input() identificadorGeneral!: number;
  @Input() nombreProyecto!: string;
  @Input() proyectoData!: Partial<Proyecto>;
  @Input() items: GastoOperacionExtendido[] = [];
  @Input() iva_tasa_nominal: number | null = null;
  @Input() it: number | null = null;
  @Input() iue: number | null = null;
  @Input() ganancia: number | null = null;
  @Input() margen_utilidad: number | null = null;
  @Input() porcentaje_global_100!: number;

  @Output() mensaje = new EventEmitter<{
    tipo: 'exito' | 'error';
    mensaje: string;
  }>();
  @Output() solicitarRefrescoItems = new EventEmitter<void>();

  gastosRegistrados: GastoOperacionExtendido[] = [];
  private escuchaActiva: any;

  constructor(
    private servicios: ServiciosProyectos,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {}

  // ------------------------------
  // INICIO AUTOMÁTICO DE ESCUCHA
  // ------------------------------
  ngOnInit(): void {
    this.iniciarEscuchaActualizacion();
  }
  // Detecta cambios externos al Input
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.actualizarGastosRegistrados();
    }
  }
  // Detener escucha para evitar fugas
  ngOnDestroy(): void {
    if (this.escuchaActiva) {
      clearInterval(this.escuchaActiva);
    }
  }
  // Método para refrescar los datos manualmente

  refrescarItems(): void {
    if (!this.identificadorGeneral) {
      this.emitirMensaje(
        'error',
        'No hay proyecto seleccionado para refrescar los datos.'
      );
      return;
    }
    // Llamamos al servicio directamente
    this.servicios.getProyectoCompleto(this.identificadorGeneral).subscribe({
      next: ({ modulos, gastos }) => {
        // Solo actualizar los gastos
        const gastosEnItems = gastos.map((g) => ({
          ...g,
          tipo: 'gasto' as const,
          esNuevo: false,
          editarModulo: false,
          editar: false,
          moduloId:
            typeof g.modulo === 'object' && g.modulo ? g.modulo.id : null,
        }));
        this.items = [...gastosEnItems]; // ⚠️ Cambiamos la referencia del array
        this.actualizarGastosRegistrados(); // Actualiza la vista
        this.emitirMensaje(
          'exito',
          'Datos del proyecto actualizados correctamente.'
        );
      },
      error: (err) => {
        console.error(err);
        this.emitirMensaje('error', 'Error al refrescar los datos.');
      },
    });
  }
  // ------------------------------------------------------------
  //  Método “Escucha” para actualizar constantemente sin F5
  // ------------------------------------------------------------
  iniciarEscuchaActualizacion(): void {
    this.escuchaActiva = setInterval(() => {
      // Actualiza vista
      this.cdr.detectChanges();

      // Actualiza cálculos
      this.actualizarGastosRegistrados();
    }, 500); // cada 0.5 segundos
  }

  actualizarGastosRegistrados(): void {
    this.gastosRegistrados = this.items
      .filter((item) => item.tipo === 'gasto' && !!item.id)
      .sort((a, b) => (a.id! > b.id! ? 1 : -1));
  }

  // ------------------------------------------------------------
  // EXPORTACIONES PDF
  // ------------------------------------------------------------

  exportPDFGeneral(): void {
    if (!this.identificadorGeneral || !this.nombreProyecto) {
      this.emitirMensaje(
        'error',
        'Selecciona un proyecto primero para generar el PDF.'
      );
      return;
    }

    this.exportService
      .generatePDFGastosOperacionProyecto(
        this.identificadorGeneral,
        this.nombreProyecto
      )
      .then(() =>
        this.emitirMensaje(
          'exito',
          `PDF generado para "${this.nombreProyecto}".`
        )
      )
      .catch((error) => {
        console.error('Error al generar el PDF general:', error);
        this.emitirMensaje('error', 'Error al generar el PDF. Ver consola.');
      });
  }

  generarReporteGeneralPDF(): void {
    if (!this.identificadorGeneral || !this.nombreProyecto) {
      this.emitirMensaje(
        'error',
        'Selecciona un proyecto válido para generar el reporte general.'
      );
      return;
    }

    const params = {
      identificadorGeneral: this.identificadorGeneral,
      nombreProyecto: this.nombreProyecto,
      totalGastosOperacion: this.totalGastosOperacionGeneral,
      totalValorAgregado: this.totalValorAgregado,
      totalFactura: this.total,
      iva_tasa_nominal: this.iva_tasa_nominal || 0,
      it: this.it || 0,
      iue: this.iue || 0,
      ganancia: this.ganancia || 0,
      b_margen_utilidad: this.margen_utilidad || 0,
      porcentaje_global_100: this.porcentaje_global_100 ?? 100,
      fechaReporte: new Date().toLocaleDateString('es-BO'),
    };

    const fileName = `Reporte_General_${this.nombreProyecto.replace(
      /[^a-zA-Z0-9]/g,
      '_'
    )}_${this.identificadorGeneral}.pdf`;

    this.exportService
      .generatePDFReporteGeneral(params, fileName)
      .then(() =>
        this.emitirMensaje(
          'exito',
          `Reporte general PDF generado para "${this.nombreProyecto}".`
        )
      )
      .catch((error) => {
        console.error('Error al generar el reporte general:', error);
        this.emitirMensaje(
          'error',
          'Error al generar el reporte. Ver consola.'
        );
      });
  }

  generarReporteFinanciero(item: GastoOperacionExtendido): void {
    if (!item.id || !this.identificadorGeneral || !this.nombreProyecto) {
      this.emitirMensaje(
        'error',
        'No se puede generar el reporte: Gasto o proyecto no válido.'
      );
      return;
    }

    const params = {
      id_gasto_operaciones: item.id,
      descripcion: item.descripcion || 'Sin descripción',
      precio_unitario: Number(item.precio_unitario) || 0,
      unidad: item.unidad || 'N/A',
      cantidad: Number(item.cantidad) || 0,
      identificadorGeneral: this.identificadorGeneral,
      iva_tasa_nominal: this.iva_tasa_nominal || 0,
      it: this.it || 0,
      iue: this.iue || 0,
      ganancia: this.ganancia || 0,
      b_margen_utilidad: this.margen_utilidad || 0,
      porcentaje_global_100: this.porcentaje_global_100 || 100,
      nombreProyecto: this.nombreProyecto,
      fechaReporte: new Date().toLocaleDateString('es-BO'),
    };

    const safeDescripcion = (item.descripcion || 'gasto')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 20);

    const fileName = `reporte-financiero-${this.nombreProyecto.replace(
      /[^a-zA-Z0-9]/g,
      '_'
    )}-${safeDescripcion}.pdf`;

    this.exportService
      .generatePDFFinanciero(params, fileName)
      .then(() =>
        this.emitirMensaje(
          'exito',
          `Reporte financiero generado para "${item.descripcion}".`
        )
      )
      .catch((error) => {
        console.error('Error al generar el reporte financiero:', error);
        this.emitirMensaje(
          'error',
          'Error al generar el reporte. Ver consola.'
        );
      });
  }

  generarPDFMaterialesProyecto(): void {
    if (!this.identificadorGeneral || !this.nombreProyecto) {
      this.emitirMensaje('error', 'Selecciona un proyecto primero.');
      return;
    }

    this.exportService
      .generatePDFMaterialesProyecto(
        this.identificadorGeneral,
        this.nombreProyecto
      )
      .then(() => this.emitirMensaje('exito', `PDF de Materiales generado.`))
      .catch((error) => {
        console.error(error);
        this.emitirMensaje('error', 'Error al generar PDF de Materiales.');
      });
  }

  generatePDFManoDeObraProyecto(): void {
    if (!this.identificadorGeneral || !this.nombreProyecto) {
      this.emitirMensaje('error', 'Selecciona un proyecto primero.');
      return;
    }

    this.exportService
      .generatePDFManoDeObraProyecto(
        this.identificadorGeneral,
        this.nombreProyecto
      )
      .then(() => this.emitirMensaje('exito', `PDF de Mano de Obra generado.`))
      .catch((error) => {
        console.error(error);
        this.emitirMensaje('error', 'Error al generar PDF de Mano de Obra.');
      });
  }

  generatePDFEquipoHerramientaProyecto(): void {
    if (!this.identificadorGeneral || !this.nombreProyecto) {
      this.emitirMensaje('error', 'Selecciona un proyecto primero.');
      return;
    }

    this.exportService
      .generatePDFEquipoHerramientaProyecto(
        this.identificadorGeneral,
        this.nombreProyecto
      )
      .then(() =>
        this.emitirMensaje('exito', `PDF de Equipo y Herramientas generado.`)
      )
      .catch((error) => {
        console.error(error);
        this.emitirMensaje(
          'error',
          'Error al generar PDF de Equipo y Herramientas.'
        );
      });
  }

  exportPDFFactura(): void {
    this.exportService.generatePDF('contentToExport', 'factura.pdf');
    this.emitirMensaje('exito', 'PDF de factura generado.');
  }

  // ------------------------------------------------------------
  // CÁLCULOS
  // ------------------------------------------------------------

  getGastosRegistrados(): GastoOperacionExtendido[] {
    return this.items
      .filter((item) => item.tipo === 'gasto' && !!item.id)
      .sort((a, b) => (a.id! > b.id! ? 1 : -1));
  }

  obtenerNumeroParaGasto(indice: number): number {
    return indice + 1;
  }

  get totalGastosOperacionGeneral(): number {
    return this.items
      .filter(
        (item) =>
          item.tipo === 'gasto' &&
          item.id &&
          this.toNum(item.precio_unitario) > 0
      )
      .reduce((acc, item) => acc + this.toNum(item.precio_unitario), 0);
  }

  get totalValorAgregado(): number {
    const total = this.items
      .filter(
        (item) =>
          item.tipo === 'gasto' &&
          item.id &&
          this.toNum(item.precio_unitario) > 0
      )
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

  toNum(valor: any): number {
    return Number(valor) || 0;
  }

  getValorAgregado(item: GastoOperacionExtendido): number {
    const valor =
      this.getPrecioFactura(item) - this.toNum(item.precio_unitario);
    return this.roundTo(valor, 2);
  }

  getPrecioFactura(item: GastoOperacionExtendido): number {
    return (
      this.getCostoVenta(item) +
      this.getMargenUtilidad(item) +
      this.getIvaEfectiva(item)
    );
  }

  getCostoVenta(item: GastoOperacionExtendido): number {
    const precio = this.toNum(item.precio_unitario);
    const ivaNominal = this.toNum(this.proyectoData.iva_tasa_nominal);

    return precio - precio * (ivaNominal / 100);
  }

  getMargenUtilidad(item: GastoOperacionExtendido): number {
    const margen = this.toNum(this.proyectoData.margen_utilidad);

    return (margen / 100 / 100) * this.getCostoVenta(item);
  }

  getIvaEfectiva(item: GastoOperacionExtendido): number {
    return (
      (this.getCostoVenta(item) + this.getMargenUtilidad(item)) *
      this.getIvaEfectivaCalculo()
    );
  }

  getIvaEfectivaCalculo(): number {
    const ivaNominal = this.toNum(this.proyectoData.iva_tasa_nominal);
    const margen = this.toNum(this.proyectoData.margen_utilidad);

    return ivaNominal / margen;
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

  private emitirMensaje(tipo: 'exito' | 'error', mensaje: string): void {
    this.mensaje.emit({ tipo, mensaje });
  }
}
