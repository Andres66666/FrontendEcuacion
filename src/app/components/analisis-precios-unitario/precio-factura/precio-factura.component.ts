import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-precio-factura',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './precio-factura.component.html',
  styleUrl: './precio-factura.component.css',
})
export class PrecioFacturaComponent {
  // ========================
  // IDENTIFICACIÓN
  // ========================
  id_item_gasto_operacion: number = 0;
  id_proyecto_general: number = 0;

  // ========================
  // CONTROL DE ORIGEN
  // ========================
  origen: 'ITEM' | 'PROYECTO' | 'MODULO' | '' = '';

  // ========================
  // REPORTE PRINCIPAL
  // ========================
  REPORTE_GASTOS_DE_OPERACION: number = 0;
  REPORTE_VALOR_AGREGADO: number = 0;

  // ========================
  // VARIABLES FINANCIERAS
  // ========================
  iva_tasa_nominal: number = 0;
  it: number = 0;
  iue: number = 0;
  ganancia: number = 0;
  margen_utilidad: number = 0;

  // ========================
  // DATOS VISUALES DEL REPORTE
  // ========================
  nombreProyecto: string = '';
  nombreModulo: string = '';
  descripcionItem: string = '';

  constructor(private route: ActivatedRoute, private router: Router) {}

  // ========================
  // INIT
  // ========================
  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      // ========================
      // DATOS PARA EL REPORTE
      // ========================
      this.nombreProyecto = params['NombreProyecto'] || '';
      this.nombreModulo = params['NombreModulo'] || '';
      this.descripcionItem = params['descripcion'] || '';

      // ORIGEN
      this.origen = params['origen'] || '';

      // IDENTIFICADORES
      this.id_item_gasto_operacion =
        Number(params['id_item_gasto_operacion']) || 0;
      this.id_proyecto_general = Number(params['id_proyecto']) || 0;

      // VARIABLES FINANCIERAS
      this.iva_tasa_nominal = Number(params['iva_tasa_nominal']) || 0;
      this.it = Number(params['it']) || 0;
      this.iue = Number(params['iue']) || 0;
      this.ganancia = Number(params['ganancia']) || 0;
      this.margen_utilidad = Number(params['margen_utilidad']) || 0;

      // ========================
      // ASIGNAR REPORTE SEGÚN ORIGEN
      // ========================
      if (this.origen === 'PROYECTO') {
        this.REPORTE_GASTOS_DE_OPERACION =
          Number(params['total_proyecto_gastos_operacion_parcial']) || 0;
        this.REPORTE_VALOR_AGREGADO =
          Number(params['total_proyecto_valor_agregado']) || 0;
      } else if (this.origen === 'ITEM') {
        this.REPORTE_GASTOS_DE_OPERACION =
          Number(params['total_Item_gasto_operacion_parcial']) || 0;
        this.REPORTE_VALOR_AGREGADO =
          Number(params['total_Item_valor_agregado_item']) || 0;
      } else if (this.origen === 'MODULO') {
        this.REPORTE_GASTOS_DE_OPERACION =
          Number(params['total_modulo_gastos_operacion_parcial']) || 0;
        this.REPORTE_VALOR_AGREGADO =
          Number(params['total_modulo_valor_agregado']) || 0;
      } else {
        this.REPORTE_GASTOS_DE_OPERACION = 0;
        this.REPORTE_VALOR_AGREGADO = 0;
      }
    });
  }

  // ========================
  // FORMATOS
  // ========================
  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(valor) || 0);
  }

  private redondear2(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  // ========================
  // SECCIÓN 1 – IVA
  // ========================
  get creditoFiscal(): number {
    return this.REPORTE_GASTOS_DE_OPERACION * (this.iva_tasa_nominal / 100);
  }

  get costoVenta(): number {
    return this.REPORTE_GASTOS_DE_OPERACION - this.creditoFiscal;
  }

  // ========================
  // SECCIÓN 3
  // ========================
  get GastoOperacion3(): number {
    return this.REPORTE_GASTOS_DE_OPERACION;
  }

  get ValorAgregado3(): number {
    return this.REPORTE_VALOR_AGREGADO;
  }

  get precioFactura3(): number {
    return this.REPORTE_GASTOS_DE_OPERACION + this.REPORTE_VALOR_AGREGADO;
  }

  get GastoOperacion31(): number {
    return (this.REPORTE_GASTOS_DE_OPERACION * 100) / this.precioFactura3;
  }

  get ValorAgregado31(): number {
    return (this.REPORTE_VALOR_AGREGADO * 100) / this.precioFactura3;
  }

  get precioFactura31(): number {
    return this.GastoOperacion31 + this.ValorAgregado31;
  }

  // ========================
  // SECCIÓN 4
  // ========================
  get costoVenta4(): number {
    return this.REPORTE_GASTOS_DE_OPERACION - this.creditoFiscal;
  }

  get iva13(): number {
    return this.precioFactura3 * (this.iva_tasa_nominal / 100);
  }

  get margenUtilidad(): number {
    const valor = this.precioFactura3 - this.costoVenta4 - this.iva13;
    return this.redondear2(valor);
  }

  // ========================
  // SECCIÓN 5
  // ========================
  get impuestoIva5(): number {
    const valor = this.ValorAgregado3 * (this.iva_tasa_nominal / 100);
    return this.redondear2(valor);
  }

  get itefactura5(): number {
    const valor = this.precioFactura3 * (this.it / 100);
    return this.redondear2(valor);
  }

  get iueUtilidad5(): number {
    const utilidad = this.ValorAgregado3 - this.impuestoIva5 - this.itefactura5;
    const valor = utilidad * (this.iue / 100);
    return this.redondear2(valor);
  }

  get totalImpuestos5(): number {
    return this.redondear2(
      this.impuestoIva5 + this.itefactura5 + this.iueUtilidad5
    );
  }

  get totalUtilidadNeta(): number {
    return this.ValorAgregado3 - this.totalImpuestos5;
  }

  // ========================
  // SECCIÓN 6
  // ========================
  get ganaciaColumna1(): number {
    return this.totalUtilidadNeta * (this.ganancia / 100);
  }

  get CompensacioDuenoColumna1(): number {
    return this.totalUtilidadNeta * (this.ganancia / 100);
  }

  get ImpuestosColumna1(): number {
    return this.totalImpuestos5;
  }

  get GastosOperacionColumna1(): number {
    return this.REPORTE_GASTOS_DE_OPERACION;
  }

  get PrecioFacturaColumna1(): number {
    return (
      this.ganaciaColumna1 +
      this.CompensacioDuenoColumna1 +
      this.ImpuestosColumna1 +
      this.GastosOperacionColumna1
    );
  }

  get gananciaColumna2(): number {
    return (this.ganaciaColumna1 * 100) / this.PrecioFacturaColumna1;
  }

  get CompensacioDuenoColumna2(): number {
    return (this.CompensacioDuenoColumna1 * 100) / this.PrecioFacturaColumna1;
  }

  get ImpuestosColumna2(): number {
    return (this.ImpuestosColumna1 * 100) / this.PrecioFacturaColumna1;
  }

  get GastosOperacionColumna2(): number {
    return (this.GastosOperacionColumna1 * 100) / this.PrecioFacturaColumna1;
  }

  get PrecioFacturaColumna2(): number {
    return (
      this.gananciaColumna2 +
      this.CompensacioDuenoColumna2 +
      this.ImpuestosColumna2 +
      this.GastosOperacionColumna2
    );
  }

  // ========================
  // SECCIÓN 7
  // ========================
  get RentabilidadProyecto7(): number {
    return (this.REPORTE_VALOR_AGREGADO / this.GastosOperacionColumna1) * 100;
  }

  get RentabilidadGanacia7(): number {
    return (this.ganaciaColumna1 / this.GastosOperacionColumna1) * 100;
  }

  get RentabilidadCompensacionDuenio(): number {
    return (this.CompensacioDuenoColumna1 / this.GastosOperacionColumna1) * 100;
  }

  get RentabilidadImpuestos(): number {
    return (this.ImpuestosColumna1 / this.GastosOperacionColumna1) * 100;
  }

  // ========================
  // SECCIÓN 8
  // ========================
  get RetornoInversion8(): number {
    return this.GastosOperacionColumna1 / this.ganaciaColumna1;
  }

  // ========================
  // NAVEGACIÓN
  // ========================
  navigateToHome(): void {
    this.router.navigate(['/panel-control/proyectos']);
  }

  // =========================
  // NUEVO MÉTODO: GENERAR PDF
  // =========================
  generarReportePDF() {
    const data = document.getElementById('contentToExport');
    if (!data) return;

    const originalFontSize = window.getComputedStyle(data).fontSize;
    data.style.fontSize = '30px';

    // ===============================
    // 2. FORZAR BORDES DE TABLAS
    // ===============================
    data.querySelectorAll('table, th, td').forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.border = '0.2px solid #1b1b1b';
      htmlEl.style.borderCollapse = 'collapse';
      htmlEl.style.fontSize = 'inherit';
    });

    // ===============================
    // 3. GENERAR PDF CON MÁRGENES
    // ===============================
    html2canvas(data, { scale: 2 }).then((canvas) => {
      const pdf = new jsPDF('p', 'mm', 'a4');

      const marginX = 15;
      const marginY = 15;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - marginX * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', marginX, marginY, imgWidth, imgHeight);
      pdf.save('reporte.pdf');

      // ===============================
      // LIMPIEZA
      // ===============================
      data.style.fontSize = originalFontSize;
    });
  }
}
