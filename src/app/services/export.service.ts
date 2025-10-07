import { Injectable } from '@angular/core'; 
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ServiciosService } from './servicios.service';
import { EquipoHerramienta, ManoDeObra, Materiales, Modulo, Proyecto } from '../models/models';


// Interfaces (agrega al inicio del archivo o en models.ts)

export interface GastoOperacion {
  id: number;
  identificador: Proyecto;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  precio_literal: string;
  costo_parcial: number;
  creado_por: number;
  modificado_por: number;
  modulo_id?: number | null; 
  modulo?: Modulo | null;
}
@Injectable({
  providedIn: 'root'
})
export class ExportService {
  constructor(
    private servicios: ServiciosService  // NUEVO: Inyecta para acceder a métodos de datos
  ) {}


  async generateWord(elementId: string, fileName: string = 'factura.docx'): Promise<void> {
      try {
        const contentContainer = document.getElementById(elementId);
        if (!contentContainer) {
          console.error('Contenedor no encontrado para exportar Word');
          return;
        }

        const sections: any[] = [];
        const pageSections = contentContainer.querySelectorAll('.pdf-page-section');

        pageSections.forEach((page: Element) => {
          const children: (Paragraph | Table)[] = [];
          const sectionTitles = page.querySelectorAll('.section-title');

          sectionTitles.forEach((titleEl: Element) => {
            const titleText = titleEl.textContent?.trim() || 'Sección';
            children.push(
              new Paragraph({
                text: titleText,
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.START,
                spacing: { after: 200, before: 200 },
              })
            );

            const tableWrapper = titleEl.nextElementSibling as HTMLElement;
            const tableEl = tableWrapper?.querySelector('table') as HTMLTableElement;
            if (!tableEl) return;

            const rows: TableRow[] = [];
            Array.from(tableEl.rows).forEach((tr: HTMLTableRowElement) => {
              const cells: TableCell[] = [];
              Array.from(tr.cells).forEach((td: HTMLTableCellElement) => {
                const isBold = td.classList.contains('bold-text');
                const isRed = td.classList.contains('text-danger');
                const text = td.textContent?.trim() || '';

                cells.push(
                  new TableCell({
                    children: [
                      new Paragraph({
                        text,
                        alignment: td.classList.contains('amount-col') ? AlignmentType.RIGHT : AlignmentType.LEFT,
                        run: { bold: isBold, color: isRed ? 'FF0000' : '000000' },
                      }),
                    ],
                    columnSpan: td.colSpan || 1,
                    rowSpan: td.rowSpan || 1,
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                    },
                    shading: {
                      fill: td.classList.contains('percentage-col') ? 'F2F2F2' : 'auto',
                      type: ShadingType.CLEAR,
                    },
                  })
                );
              });
              rows.push(new TableRow({ children: cells }));
            });

            children.push(
              new Table({
                rows,
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                  left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                  right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                },
              })
            );
          });

          sections.push({ properties: {}, children });
        });

        const doc = new Document({ sections });
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        console.log('Word generado ✅');
      } catch (error) {
        console.error('Error exportando Word:', error);
      }
  }
  
  


  public async generatePDF(elementId: string, fileName: string = 'factura.pdf'): Promise<void> {
    const data = document.getElementById(elementId);
    if (!data) {
      console.error('Elemento no encontrado:', elementId);
      throw new Error(`Elemento con ID '${elementId}' no encontrado.`);
    }

    let clonedData: HTMLElement | null = null;
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 10;  // Margen reducido para más espacio
      const pdfWidth = pdf.internal.pageSize.getWidth() - 2 * margin;
      const pdfHeight = pdf.internal.pageSize.getHeight() - 2 * margin;

      // Clonar y preparar contenido (off-screen)
      clonedData = data.cloneNode(true) as HTMLElement;
      clonedData.style.position = 'absolute';
      clonedData.style.left = '-9999px';
      clonedData.style.top = '-9999px';
      clonedData.style.width = '794px';  // Ancho A4 en px (aprox. 210mm a 96dpi)
      clonedData.style.backgroundColor = '#ffffff';  // Fondo blanco explícito
      document.body.appendChild(clonedData);

      // Reemplazar selects por spans (como antes)
      clonedData.querySelectorAll('select').forEach(select => {
        const s = select as HTMLSelectElement;
        const selectedOption = Array.from(s.options).find(opt => opt.value === s.value);
        const text = selectedOption?.textContent || s.value || '';
        const span = document.createElement('span');
        span.textContent = text;
        span.style.display = 'inline-block';
        span.style.width = '100%';
        span.style.textAlign = 'center';
        select.parentNode?.replaceChild(span, select);
      });

      // Generar canvas con html2canvas (CORREGIDO: Opciones con type assertion 'as any' para scale + ignoreElements con Element)
      console.log('Iniciando html2canvas para PDF...');  // Debug temporal
      const canvas = await html2canvas(clonedData, {
        scale: 2,  // Resolución alta (mejora calidad)
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',  // Fondo blanco
        width: clonedData.scrollWidth,
        height: clonedData.scrollHeight,
        logging: true,  // Activa logs de html2canvas (ver consola para debug)
        ignoreElements: (element: Element) => (element as HTMLElement).classList?.contains('no-export') || false  // CORREGIDO: Element → cast a HTMLElement; fallback false si no tiene classList
      } as any);  // CORREGIDO: 'as any' para opciones (incluye scale sin TS error)

      console.log('Canvas generado:', { width: canvas.width, height: canvas.height });  // Debug temporal

      const imgData = canvas.toDataURL('image/png');
      
      // CORREGIDO: Usa dimensiones del canvas directamente (NO getImageProperties, que no existe en jsPDF)
      const imgWidth = pdfWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;  // Proporcional al ancho

      // Si es muy alto, escalar para caber (múltiples páginas si necesario)
      let position = 0;
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      let heightLeft = imgHeight - pdfHeight;

      // Paginación automática si el contenido es largo (agrega páginas)
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;  // Posición negativa para recortar
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // Guardar PDF
      pdf.save(fileName);
      console.log(`PDF generado exitosamente: ${fileName} (páginas: ${Math.ceil((imgHeight / pdfHeight) || 1)})`);
    } catch (error) {
      console.error('Error en generatePDF:', error);
      throw new Error(`Fallo al generar PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      // Limpieza: Remover clonedData siempre (evita memory leaks)
      if (clonedData && document.body.contains(clonedData)) {
        document.body.removeChild(clonedData);
      }
    }
  }

  async generatePDFFinanciero(params: any, fileName: string = 'reporte-financiero.pdf'): Promise<void> {
    // CORREGIDO: Log params para debug (ver consola F12; remueve después de probar)
    console.log('Params recibidos en generatePDFFinanciero:', params);

    // CORREGIDO: Relaja validación - permite precio_unitario = 0; solo falla si undefined/null o sin ID proyecto
    if (!params || params.precio_unitario === undefined || params.precio_unitario === null || !params.identificadorGeneral) {
      console.error('Params inválidos para generar PDF financiero.', params);
      throw new Error('Datos insuficientes: ID de proyecto requerido. Precio unitario puede ser 0.');
    }

    // Si precio_unitario = 0, avisa pero continúa (genera PDF con 0s)
    const precio_unitario = Number(params.precio_unitario) || 0;
    if (precio_unitario === 0) {
      console.warn('Advertencia: Precio unitario es 0. PDF se generará con valores base (posibles divisiones por 0 evitadas).');
    }

    try {
      const iva_tasa_nominal = Number(params.iva_tasa_nominal) || 0;
      const it = Number(params.it) || 0;
      const iue = Number(params.iue) || 0;
      const ganancia = Number(params.ganancia) || 0;
      const a_costo_venta = Number(params.a_costo_venta) || 0;
      const b_margen_utilidad = Number(params.b_margen_utilidad) || 0;
      const porcentaje_global_100 = Number(params.porcentaje_global_100) || 100;
      const descripcion = params.descripcion || 'Gasto de Operación';
      const nombreProyecto = params.nombreProyecto || 'Proyecto Sin Nombre';
      const fechaReporte = params.fechaReporte || new Date().toLocaleDateString('es-BO');
      

      // Cálculos replicados (con guards extras para 0/NaN)
      // SECCIÓN 1
      const creditoFiscal = precio_unitario * (iva_tasa_nominal / (porcentaje_global_100 || 1));  // Guard /1 si 0
      const costoVenta = precio_unitario - creditoFiscal;

      // SECCIÓN 2
      const SumaAB = a_costo_venta + b_margen_utilidad;
      const mensajeErrorAB = SumaAB !== 87 ? "PORCENTAJE INCORRECTO" : null;
      const SumaIva_SumaAB = SumaAB + iva_tasa_nominal;
      const mensajeErrorIva = SumaIva_SumaAB !== porcentaje_global_100 ? "DATOS INCORRECTOS" : null;
      const margenUtilidad = a_costo_venta === 0 ? 0 : (b_margen_utilidad / a_costo_venta) * costoVenta;
      const ivaEfectivaCalculo = SumaAB === 0 ? 0 : iva_tasa_nominal / SumaAB;
      const ivaEfectiva = (costoVenta + margenUtilidad) * ivaEfectivaCalculo;
      const precioFacturaS2 = costoVenta + margenUtilidad + ivaEfectiva;

      // SECCIÓN 3
      const costoVentaT3 = (a_costo_venta / (porcentaje_global_100 || 1)) * precioFacturaS2;
      const MargenDeUtilidad = (b_margen_utilidad / (porcentaje_global_100 || 1)) * precioFacturaS2;
      const IVAenFactura = (iva_tasa_nominal / (porcentaje_global_100 || 1)) * precioFacturaS2;
      const SumaFactura = costoVentaT3 + MargenDeUtilidad + IVAenFactura;

      // SECCIÓN 4
      const ValorAgregado = precioFacturaS2 - precio_unitario;
      const metodoMallaFinitapreciounitariomasvaloragregado = precio_unitario + ValorAgregado;
      const gastosdeoperacionC2 = metodoMallaFinitapreciounitariomasvaloragregado === 0 ? 0 : (precio_unitario * porcentaje_global_100) / metodoMallaFinitapreciounitariomasvaloragregado;
      const valoragradoC2 = metodoMallaFinitapreciounitariomasvaloragregado === 0 ? 0 : (ValorAgregado * porcentaje_global_100) / metodoMallaFinitapreciounitariomasvaloragregado;
      const preciofacturaC2 = gastosdeoperacionC2 + valoragradoC2;

      // SECCIÓN 5
      const ImpuestoIva = (iva_tasa_nominal / (porcentaje_global_100 || 1)) * ValorAgregado;
      const itFactura = (it / (porcentaje_global_100 || 1)) * precioFacturaS2;
      const iueUtilidad = (ValorAgregado - ImpuestoIva - itFactura) * (iue / (porcentaje_global_100 || 1));
      const SumaImpuestos = ImpuestoIva + itFactura + iueUtilidad;
      const SumaTotalNeta = ValorAgregado - SumaImpuestos;

      // SECCIÓN 6
      const gananciaPrimero = SumaTotalNeta * (ganancia / (porcentaje_global_100 || 1));
      const CompensacionDueno = SumaTotalNeta * (ganancia / (porcentaje_global_100 || 1));
      const PrecioFacturaPrimero = gananciaPrimero + CompensacionDueno + SumaImpuestos + precio_unitario;
      const gananciaPrimeroPorcentage = PrecioFacturaPrimero === 0 ? 0 : (gananciaPrimero / PrecioFacturaPrimero) * porcentaje_global_100;
      const CompensacionDuenoPorcentage = PrecioFacturaPrimero === 0 ? 0 : (CompensacionDueno / PrecioFacturaPrimero) * porcentaje_global_100;
      const ImpuestoPorcentage = PrecioFacturaPrimero === 0 ? 0 : (SumaImpuestos / PrecioFacturaPrimero) * porcentaje_global_100;
      const gastoOperacionPorcentage = PrecioFacturaPrimero === 0 ? 0 : (precio_unitario / PrecioFacturaPrimero) * porcentaje_global_100;
      const PorcentajeTotalGananciaPrimero = gananciaPrimeroPorcentage + CompensacionDuenoPorcentage + ImpuestoPorcentage + gastoOperacionPorcentage;

      // SECCIÓN 7
      const RentabilidadProyecto = precio_unitario === 0 ? 0 : (ValorAgregado / precio_unitario) * porcentaje_global_100;
      const RentabilidadGanancia = precio_unitario === 0 ? 0 : (gananciaPrimero / precio_unitario) * porcentaje_global_100;
      const RentabilidadCompensacionDueno = precio_unitario === 0 ? 0 : (CompensacionDueno / precio_unitario) * porcentaje_global_100;
      const RentabilidadImpuestos = precio_unitario === 0 ? 0 : (SumaImpuestos / precio_unitario) * porcentaje_global_100;

      // SECCIÓN 8
      const Retorno = gananciaPrimero === 0 ? 0 : precio_unitario / gananciaPrimero;

  let htmlContent = `
    <div style="font-family: Arial, sans-serif; width: 100%; font-size: 12px; line-height: 1.4; background: white;">
      <h2 style="color: #007bff; font-size: 24px; margin-bottom: 20px; text-align: center; text-transform: uppercase;">REPORTE FINANCIERO</h2>
      <p style="font-size: 14px; margin-bottom: 20px; text-align: center;"><strong>Proyecto:</strong> ${nombreProyecto} | <strong>ID:</strong> ${params.identificadorGeneral} | <strong>Gasto:</strong> ${descripcion} | <strong>Fecha:</strong> ${fechaReporte}</p>
      
      <!-- 📄 Página 1 -->
      <div style="margin-bottom: 350px; overflow-x: auto;">
        <!-- 1.- GASTOS DE OPERACIÓN Y COSTO DE VENTA -->
        <div style="margin-bottom: 20px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead style="text-align: center;">
              <tr><th colspan="3" style="border: 1px solid #dee2e6; padding: 8px; font-weight: bold;">1.- GASTOS DE OPERACIÓN Y COSTO DE VENTA</th></tr>
            </thead>
            <tbody>
              <tr><td colspan="2" style="border: 1px solid #dee2e6; padding: 8px; font-weight: bold;">GASTOS DE OPERACIÓN</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold;">${this.formatearNumeroLocal(precio_unitario)}</td></tr>
              <tr><td colspan="2" style="border: 1px solid #dee2e6; padding: 8px; font-weight: bold;">CREDITO FISCAL IVA 13%</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold;">-${this.formatearNumeroLocal(creditoFiscal)}</td></tr>
              <tr><td colspan="2" style="border: 1px solid #dee2e6; padding: 8px; font-weight: bold;">COSTO DE VENTA</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold;">${this.formatearNumeroLocal(costoVenta)}</td></tr>
            </tbody>
          </table>
        </div>
        <!-- 2.- PRECIO FACTURA -->
        <h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-bottom: 5px;">2.- PRECIO FACTURA</h3>
        <div style="margin-bottom: 20px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead style="text-align: center;">
              <tr>
                <th colspan="2" style="border: 1px solid #dee2e6; padding: 8px;">PORCENTAJES DE ALICUOTAS</th>
                <th colspan="2" style="border: 1px solid #dee2e6; padding: 8px;">DESCRIPCION</th>
                <th style="border: 1px solid #dee2e6; padding: 8px;">MONTO (Bs)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td rowspan="3" style="border: 1px solid #dee2e6; padding: 8px; text-align: center; font-weight: bold; vertical-align: top; padding-top: 25px;">${this.formatearNumeroLocal(SumaIva_SumaAB)}%</td>
                <td rowspan="2" style="border: 1px solid #dee2e6; padding: 8px; text-align: center; font-weight: bold; vertical-align: middle;">${this.formatearNumeroLocal(SumaAB)}%</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; font-weight: bold;">A = ${this.formatearNumeroLocal(a_costo_venta)} %</td>
                <td style="border: 1px solid #dee2e6; padding: 8px;">COSTO DE VENTA</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(costoVenta)}</td>
              </tr>
              <tr style="border-bottom: 2px solid #dee2e6;">
                <td style="border: 1px solid #dee2e6; padding: 8px; font-weight: bold;">B = ${this.formatearNumeroLocal(b_margen_utilidad)} %</td>
                <td style="border: 1px solid #dee2e6; padding: 8px;">MARGEN DE UTILIDAD</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(margenUtilidad)}</td>
              </tr>
              <tr>
                <td colspan="2" style="border: 1px solid #dee2e6; padding: 8px; text-align: center; font-weight: bold;">${this.formatearNumeroLocal(iva_tasa_nominal)} %</td>
                <td style="border: 1px solid #dee2e6; padding: 8px;">IVA (TASA EFECTIVA 14,94%) DE COSTO DE VENTA MAS MARGEN DE UTILIDAD</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(ivaEfectiva)}</td>
              </tr>
              <tr style="font-weight: bold;">
                <td colspan="4" style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">PRECIO FACTURA</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(precioFacturaS2)}</td>
              </tr>
            </tbody>
          </table>
          ${mensajeErrorAB ? `<div style="background-color: #f8d7da; color: #721c24; padding: 10px; margin: 10px 0; border: 1px solid #f5c6cb; text-align: center; border-radius: 4px;">${mensajeErrorAB}</div>` : ''}
          ${mensajeErrorIva ? `<div style="background-color: #fff3cd; color: #856404; padding: 10px; margin: 10px 0; border: 1px solid #ffeaa7; text-align: center; border-radius: 4px;">${mensajeErrorIva}</div>` : ''}
        </div>
        <!-- 3.- FISCALIZACION POR IMPUESTOS INTERNOS -->
        <h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-bottom: 5px;">3.- FISCALIZACION POR IMPUESTOS INTERNOS</h3>
        <div style="margin-bottom: 20px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead style=" text-align: center;">
              <tr>
                <th style="border: 1px solid #dee2e6; padding: 8px;">DESCRIPCION</th>
                <th style="border: 1px solid #dee2e6; padding: 8px; width: 18%;">MONTO (Bs)</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 2px solid #dee2e6;">
                <td style="border: 1px solid #dee2e6; padding: 8px;">COSTO DE VENTA</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(costoVentaT3)}</td>
              </tr>
              <tr style="border-bottom: 2px solid #dee2e6;">
                <td style="border: 1px solid #dee2e6; padding: 8px;">MARGEN DE UTILIDAD</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(MargenDeUtilidad)}</td>
              </tr>
              <tr style="border-bottom: 2px solid #dee2e6;">
                <td style="border: 1px solid #dee2e6; padding: 8px;">IVA 13% DE PRECIO FACTURA</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(IVAenFactura)}</td>
              </tr>
              <tr style="border-bottom: 2px solid #dee2e6; font-weight: bold;">
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">PRECIO FACTURA</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(SumaFactura)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 4.- PRECIO FACTURA - METODO MALLA FINITA -->
        <h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-bottom: 5px;">4.- PRECIO FACTURA - METODO MALLA FINITA</h3>
        <div style="margin-bottom: 20px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead style="text-align: center;">
              <tr>
                <th style="border: 1px solid #dee2e6; padding: 8px;">DESCRIPCION</th>
                <th style="border: 1px solid #dee2e6; padding: 8px; width: 18%;">MONTO (Bs)</th>
                <th style="border: 1px solid #dee2e6; padding: 8px; width: 18%;">%</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #dee2e6; padding: 8px;">GASTOS DE OPERACIÓN</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(precio_unitario)}</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(gastosdeoperacionC2)}%</td>
              </tr>
              <tr>
                <td style="border: 1px solid #dee2e6; padding: 8px;">VALOR AGREGADO</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(ValorAgregado)}</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(valoragradoC2)}%</td>
              </tr>
              <tr style="border-bottom: 2px solid #dee2e6; font-weight: bold;">
                <td style="border: 1px solid #dee2e6; padding: 8px;">PRECIO FACTURA</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(metodoMallaFinitapreciounitariomasvaloragregado)}</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(preciofacturaC2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style="page-break-after: always;">
          <!-- 5.- ESTADO DE RESULTADOS -->
          <h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0;  padding-bottom: 5px;">5.- ESTADO DE RESULTADOS</h3>
          <div style="margin-bottom: 20px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead style="text-align: center;">
                <tr>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">DESCRIPCION</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px; width: 18%;">EN BOLIVIANOS (Bs)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="font-weight: bold;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">PRECIO FACTURA</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(precioFacturaS2)}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #dee2e6; padding: 8px;">GASTOS DE OPERACIÓN</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">-${this.formatearNumeroLocal(precio_unitario)}</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6; font-weight: bold; ">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">VALOR AGREGADO</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(ValorAgregado)}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #dee2e6; padding: 8px;">Impuestos IVA 13%</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(ImpuestoIva)}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #dee2e6; padding: 8px;">IT 3% de la factura</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(itFactura)}</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">IUE 25% utilidad</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(iueUtilidad)}</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6; font-weight: bold; ">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">TOTAL IMPUESTOS</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(SumaImpuestos)}</td>
                </tr>
                <tr style="font-weight: bold; ">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">TOTAL UTILIDAD NETA</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(SumaTotalNeta)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- 6.- METODOLOGIA LA GANANCIA ES PRIMERO -->
          <h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-bottom: 5px;">6.- METODOLOGIA LA GANANCIA ES PRIMERO</h3>
          <div style="margin-bottom: 20px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead style="text-align: center;">
                <tr>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">DESCRIPCION</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">GANANCIAS NETAS</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">% DE DISTRIBUCION META</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">IDEAL</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">GANANCIA</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(gananciaPrimero)}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(gananciaPrimeroPorcentage)}%</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">10%</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">COMPENSACION DEL DUEÑO</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(CompensacionDueno)}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(CompensacionDuenoPorcentage)}%</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">10%</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">IMPUESTOS</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(SumaImpuestos)}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(ImpuestoPorcentage)}%</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">15%</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">GASTOS DE OPERACIÓN</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(precio_unitario)}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(gastoOperacionPorcentage)}%</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">65%</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6; font-weight: bold;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">PRECIO FACTURA</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(PrecioFacturaPrimero)}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(PorcentajeTotalGananciaPrimero)}%</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- 7.- RENTABILIDAD -->
          <h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-bottom: 5px;">7.- RENTABILIDAD</h3>
          <div style="margin-bottom: 20px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead style="text-align: center;">
                <tr>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">DESCRIPCION</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">MONTO (Bs)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 2px solid #dee2e6; font-weight: bold; ">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">RENTABILIDAD (PROYECTO)</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(RentabilidadProyecto)}%</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">RENTABILIDAD (GANANCIA)</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(RentabilidadGanancia)}%</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">RENTABILIDAD (COMPENSACIÓN DEL DUEÑO)</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(RentabilidadCompensacionDueno)}%</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">RENTABILIDAD (IMPUESTOS)</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(RentabilidadImpuestos)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- 8.- RETORNO DE GASTOS DE OPERACIÓN -->
          <h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-bottom: 5px;">8.- RETORNO DE GASTOS DE OPERACIÓN</h3>
          <div style="margin-bottom: 20px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead style="text-align: center;">
                <tr>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">DESCRIPCION</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">NUMERO DE TRANSACCIONES</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 2px solid #dee2e6; font-weight: bold; ">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">RETORNO</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(Retorno)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
    </div>
      `;

          // Crear y poblar div temporal (CORREGIDO: ID único; width fijo)
      const tempDiv = document.createElement('div');
      tempDiv.id = 'temp-pdf-financiero';
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '800px';  // Ancho fijo para mejor escalado en PDF
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '12px';
      tempDiv.style.backgroundColor = '#ffffff';  // Fondo blanco explícito
      document.body.appendChild(tempDiv);

      // Llamar al método existente generatePDF para convertir a PDF (usa el ID temporal)
      await this.generatePDF('temp-pdf-financiero', fileName);

      // Limpiar div temporal del DOM
      document.body.removeChild(tempDiv);

      console.log(`PDF financiero generado exitosamente: ${fileName}`);
    } catch (error) {
      console.error('Error al generar PDF financiero:', error);
      const errorMessage = (error instanceof Error) ? error.message : 'Error desconocido';
      throw new Error(`Fallo en la generación del PDF: ${errorMessage}`);
    }
  }
  public async generatePDFReporteGeneral(params: any, fileName: string = 'reporte-general-financiero.pdf'): Promise<void> {
    // Log params para debug (como en generatePDFFinanciero)
    console.log('Params recibidos en generatePDFReporteGeneral:', params);
    // Validación relajada: Permite totalGastosOperacion = 0; falla solo si undefined/null o sin ID proyecto
    if (!params || params.totalGastosOperacion === undefined || params.totalGastosOperacion === null || !params.identificadorGeneral) {
      console.error('Params inválidos para generar PDF de Reporte General.', params);
      throw new Error('Datos insuficientes: ID de proyecto requerido. Total gastos puede ser 0.');
    }
    // Si totalGastosOperacion = 0, avisa pero continúa
    const totalGastosOperacion = Number(params.totalGastosOperacion) || 0;
    if (totalGastosOperacion === 0) {
      console.warn('Advertencia: Total gastos de operación es 0. PDF se generará con valores base (posibles divisiones por 0 evitadas).');
    }
    try {
      const iva_tasa_nominal = Number(params.iva_tasa_nominal) || 0;
      const it = Number(params.it) || 0;
      const iue = Number(params.iue) || 0;
      const ganancia = Number(params.ganancia) || 0;
      const a_costo_venta = Number(params.a_costo_venta) || 0;
      const b_margen_utilidad = Number(params.b_margen_utilidad) || 0;
      const porcentaje_global_100 = Number(params.porcentaje_global_100) || 100;
      const nombreProyecto = params.nombreProyecto || 'Proyecto Sin Nombre';
      const fechaReporte = params.fechaReporte || new Date().toLocaleDateString('es-BO');

      // Cálculos replicados y adaptados a totales del proyecto (con guards para 0/NaN)
      // SECCIÓN 1
      const creditoFiscal = totalGastosOperacion * (iva_tasa_nominal / (porcentaje_global_100 || 1));  // Guard /1 si 0
      const costoVenta = totalGastosOperacion - creditoFiscal;
      // SECCIÓN 2
      const SumaAB = a_costo_venta + b_margen_utilidad;
      const mensajeErrorAB = SumaAB !== 87 ? "PORCENTAJE INCORRECTO" : null;
      const SumaIva_SumaAB = SumaAB + iva_tasa_nominal;
      const mensajeErrorIva = SumaIva_SumaAB !== porcentaje_global_100 ? "DATOS INCORRECTOS" : null;
      const margenUtilidad = a_costo_venta === 0 ? 0 : (b_margen_utilidad / a_costo_venta) * costoVenta;
      const ivaEfectivaCalculo = SumaAB === 0 ? 0 : iva_tasa_nominal / SumaAB;
      const ivaEfectiva = (costoVenta + margenUtilidad) * ivaEfectivaCalculo;
      const precioFacturaS2 = costoVenta + margenUtilidad + ivaEfectiva;
      // SECCIÓN 3
      const costoVentaT3 = (a_costo_venta / (porcentaje_global_100 || 1)) * precioFacturaS2;
      const MargenDeUtilidad = (b_margen_utilidad / (porcentaje_global_100 || 1)) * precioFacturaS2;
      const IVAenFactura = (iva_tasa_nominal / (porcentaje_global_100 || 1)) * precioFacturaS2;
      const SumaFactura = costoVentaT3 + MargenDeUtilidad + IVAenFactura;
      // SECCIÓN 4
      const ValorAgregado = precioFacturaS2 - totalGastosOperacion;  // Adaptado: VA total del proyecto
      const metodoMallaFinitapreciounitariomasvaloragregado = totalGastosOperacion + ValorAgregado;
      const gastosdeoperacionC2 = metodoMallaFinitapreciounitariomasvaloragregado === 0 ? 0 : (totalGastosOperacion * porcentaje_global_100) / metodoMallaFinitapreciounitariomasvaloragregado;
      const valoragradoC2 = metodoMallaFinitapreciounitariomasvaloragregado === 0 ? 0 : (ValorAgregado * porcentaje_global_100) / metodoMallaFinitapreciounitariomasvaloragregado;
      const preciofacturaC2 = gastosdeoperacionC2 + valoragradoC2;
      // SECCIÓN 5
      const ImpuestoIva = (iva_tasa_nominal / (porcentaje_global_100 || 1)) * ValorAgregado;
      const itFactura = (it / (porcentaje_global_100 || 1)) * precioFacturaS2;
      const iueUtilidad = (ValorAgregado - ImpuestoIva - itFactura) * (iue / (porcentaje_global_100 || 1));
      const SumaImpuestos = ImpuestoIva + itFactura + iueUtilidad;
      const SumaTotalNeta = ValorAgregado - SumaImpuestos;

       // SECCIÓN 6
      const gananciaPrimero = SumaTotalNeta * (ganancia / (porcentaje_global_100 || 1));
      const CompensacionDueno = SumaTotalNeta * (ganancia / (porcentaje_global_100 || 1));
      const PrecioFacturaPrimero = gananciaPrimero + CompensacionDueno + SumaImpuestos + totalGastosOperacion;
      const gananciaPrimeroPorcentage = PrecioFacturaPrimero === 0 ? 0 : (gananciaPrimero / PrecioFacturaPrimero) * porcentaje_global_100;
      const CompensacionDuenoPorcentage = PrecioFacturaPrimero === 0 ? 0 : (CompensacionDueno / PrecioFacturaPrimero) * porcentaje_global_100;
      const ImpuestoPorcentage = PrecioFacturaPrimero === 0 ? 0 : (SumaImpuestos / PrecioFacturaPrimero) * porcentaje_global_100;
      const gastoOperacionPorcentage = PrecioFacturaPrimero === 0 ? 0 : (totalGastosOperacion / PrecioFacturaPrimero) * porcentaje_global_100;
      const PorcentajeTotalGananciaPrimero = gananciaPrimeroPorcentage + CompensacionDuenoPorcentage + ImpuestoPorcentage + gastoOperacionPorcentage;
      // SECCIÓN 7
      const RentabilidadProyecto = totalGastosOperacion === 0 ? 0 : (ValorAgregado / totalGastosOperacion) * porcentaje_global_100;
      const RentabilidadGanancia = totalGastosOperacion === 0 ? 0 : (gananciaPrimero / totalGastosOperacion) * porcentaje_global_100;
      const RentabilidadCompensacionDueno = totalGastosOperacion === 0 ? 0 : (CompensacionDueno / totalGastosOperacion) * porcentaje_global_100;
      const RentabilidadImpuestos = totalGastosOperacion === 0 ? 0 : (SumaImpuestos / totalGastosOperacion) * porcentaje_global_100;
      // SECCIÓN 8
      const Retorno = gananciaPrimero === 0 ? 0 : totalGastosOperacion / gananciaPrimero;

    let htmlContent = `
        <div style="font-family: Arial, sans-serif; width: 100%; font-size: 12px; line-height: 1.4; background: white;">
          <h2 style="color: #007bff; font-size: 24px; margin-bottom: 20px; text-align: center; text-transform: uppercase;">REPORTE GENERAL FINANCIERO DEL PROYECTO</h2>
          <p style="font-size: 14px; margin-bottom: 20px; text-align: center;"><strong>Proyecto:</strong> ${nombreProyecto} | <strong>ID:</strong> ${params.identificadorGeneral} | <strong>Fecha:</strong> ${fechaReporte}</p>
          
          <!-- 📄 Página 1 -->
          <div style="margin-bottom: 350px; overflow-x: auto;">
            <!-- 1.- TOTAL GASTOS DE OPERACIÓN Y COSTO DE VENTA -->
            <div style="margin-bottom: 20px; overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead style="text-align: center;">
                  <tr><th colspan="3" style="border: 1px solid #dee2e6; padding: 8px; font-weight: bold;">1.- TOTAL GASTOS DE OPERACIÓN Y COSTO DE VENTA</th></tr>
                </thead>
                <tbody>
                  <tr><td colspan="2" style="border: 1px solid #dee2e6; padding: 8px; font-weight: bold;">TOTAL GASTOS DE OPERACIÓN</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold;">${this.formatearNumeroLocal(totalGastosOperacion)}</td></tr>
                  <tr><td colspan="2" style="border: 1px solid #dee2e6; padding: 8px; font-weight: bold;">CREDITO FISCAL IVA 13%</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold;">-${this.formatearNumeroLocal(creditoFiscal)}</td></tr>
                  <tr><td colspan="2" style="border: 1px solid #dee2e6; padding: 8px; font-weight: bold;">COSTO DE VENTA</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold;">${this.formatearNumeroLocal(costoVenta)}</td></tr>
                </tbody>
              </table>
            </div>

            <!-- 2.- PRECIO FACTURA -->
            <h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-bottom: 5px;">2.- PRECIO FACTURA</h3>
            <div style="margin-bottom: 20px; overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead style="text-align: center;">
                  <tr>
                    <th colspan="2" style="border: 1px solid #dee2e6; padding: 8px;">PORCENTAJES DE ALICUOTAS</th>
                    <th colspan="2" style="border: 1px solid #dee2e6; padding: 8px;">DESCRIPCION</th>
                    <th style="border: 1px solid #dee2e6; padding: 8px;">MONTO (Bs)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td rowspan="3" style="border: 1px solid #dee2e6; padding: 8px; text-align: center; font-weight: bold; vertical-align: top; padding-top: 25px;">${this.formatearNumeroLocal(SumaIva_SumaAB)}%</td>
                    <td rowspan="2" style="border: 1px solid #dee2e6; padding: 8px; text-align: center; font-weight: bold; vertical-align: middle;">${this.formatearNumeroLocal(SumaAB)}%</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; font-weight: bold;">A = ${this.formatearNumeroLocal(a_costo_venta)} %</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px;">COSTO DE VENTA</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(costoVenta)}</td>
                  </tr>
                  <tr style="border-bottom: 2px solid #dee2e6;">
                    <td style="border: 1px solid #dee2e6; padding: 8px; font-weight: bold;">B = ${this.formatearNumeroLocal(b_margen_utilidad)} %</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px;">MARGEN DE UTILIDAD</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(margenUtilidad)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="border: 1px solid #dee2e6; padding: 8px; text-align: center; font-weight: bold;">${this.formatearNumeroLocal(iva_tasa_nominal)} %</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px;">IVA (TASA EFECTIVA 14,94%) DE COSTO DE VENTA MAS MARGEN DE UTILIDAD</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(ivaEfectiva)}</td>
                  </tr>
                  <tr style="font-weight: bold;">
                    <td colspan="4" style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">PRECIO FACTURA</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(precioFacturaS2)}</td>
                  </tr>
                </tbody>
              </table>
              ${mensajeErrorAB ? `<div style="background-color: #f8d7da; color: #721c24; padding: 10px; margin: 10px 0; border: 1px solid #f5c6cb; text-align: center; border-radius: 4px;">${mensajeErrorAB}</div>` : ''}
              ${mensajeErrorIva ? `<div style="background-color: #fff3cd; color: #856404; padding: 10px; margin: 10px 0; border: 1px solid #ffeaa7; text-align: center; border-radius: 4px;">${mensajeErrorIva}</div>` : ''}
            </div>

            <!-- 3.- FISCALIZACION POR IMPUESTOS INTERNOS -->
            <h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-bottom: 5px;">3.- FISCALIZACION POR IMPUESTOS INTERNOS</h3>
            <div style="margin-bottom: 20px; overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead style="text-align: center;">
                  <tr>
                    <th style="border: 1px solid #dee2e6; padding: 8px;">DESCRIPCION</th>
                    <th style="border: 1px solid #dee2e6; padding: 8px; width: 18%;">MONTO (Bs)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 2px solid #dee2e6;">
                    <td style="border: 1px solid #dee2e6; padding: 8px;">COSTO DE VENTA</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(costoVentaT3)}</td>
                  </tr>
                  <tr style="border-bottom: 2px solid #dee2e6;">
                    <td style="border: 1px solid #dee2e6; padding: 8px;">MARGEN DE UTILIDAD</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(MargenDeUtilidad)}</td>
                  </tr>
                  <tr style="border-bottom: 2px solid #dee2e6;">
                    <td style="border: 1px solid #dee2e6; padding: 8px;">IVA 13% DE PRECIO FACTURA</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(IVAenFactura)}</td>
                  </tr>
                  <tr style="border-bottom: 2px solid #dee2e6; font-weight: bold;">
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">PRECIO FACTURA</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(SumaFactura)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 4.- PRECIO FACTURA - METODO MALLA FINITA -->
            <h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-bottom: 5px;">4.- PRECIO FACTURA - METODO MALLA FINITA</h3>
            <div style="margin-bottom: 20px; overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead style="text-align: center;">
                  <tr>
                    <th style="border: 1px solid #dee2e6; padding: 8px;">DESCRIPCION</th>
                    <th style="border: 1px solid #dee2e6; padding: 8px; width: 18%;">MONTO (Bs)</th>
                    <th style="border: 1px solid #dee2e6; padding: 8px; width: 18%;">%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="border: 1px solid #dee2e6; padding: 8px;">TOTAL GASTOS DE OPERACIÓN</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(totalGastosOperacion)}</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(gastosdeoperacionC2)}%</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #dee2e6; padding: 8px;">VALOR AGREGADO</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(ValorAgregado)}</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(valoragradoC2)}%</td>
                  </tr>
                  <tr style="border-bottom: 2px solid #dee2e6; font-weight: bold;">
                    <td style="border: 1px solid #dee2e6; padding: 8px;">PRECIO FACTURA</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(metodoMallaFinitapreciounitariomasvaloragregado)}</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(preciofacturaC2)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <!-- 📄 Página 2 -->
          <div style="page-break-after: always;">
          <!-- 5.- ESTADO DE RESULTADOS -->
          <h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-bottom: 5px;">5.- ESTADO DE RESULTADOS</h3>
          <div style="margin-bottom: 20px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead style="text-align: center;">
                <tr>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">DESCRIPCION</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px; width: 18%;">EN BOLIVIANOS (Bs)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="font-weight: bold;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">PRECIO FACTURA</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(precioFacturaS2)}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #dee2e6; padding: 8px;">TOTAL GASTOS DE OPERACIÓN</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">-${this.formatearNumeroLocal(totalGastosOperacion)}</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6; font-weight: bold;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">VALOR AGREGADO</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(ValorAgregado)}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #dee2e6; padding: 8px;">Impuestos IVA 13%</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(ImpuestoIva)}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #dee2e6; padding: 8px;">IT 3% de la factura</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(itFactura)}</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">IUE 25% utilidad</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(iueUtilidad)}</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6; font-weight: bold;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">TOTAL IMPUESTOS</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(SumaImpuestos)}</td>
                </tr>
                <tr style="font-weight: bold;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">TOTAL UTILIDAD NETA</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(SumaTotalNeta)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 6.- METODOLOGIA LA GANANCIA ES PRIMERO -->
          <h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-bottom: 5px;">6.- METODOLOGIA LA GANANCIA ES PRIMERO</h3>
          <div style="margin-bottom: 20px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead style="text-align: center;">
                <tr>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">DESCRIPCION</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">GANANCIAS NETAS</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">% DE DISTRIBUCION META</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">IDEAL</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">GANANCIA</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(gananciaPrimero)}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(gananciaPrimeroPorcentage)}%</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">10%</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">COMPENSACION DEL DUEÑO</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(CompensacionDueno)}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(CompensacionDuenoPorcentage)}%</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">10%</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">IMPUESTOS</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(SumaImpuestos)}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(ImpuestoPorcentage)}%</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">15%</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">TOTAL GASTOS DE OPERACIÓN</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(totalGastosOperacion)}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(gastoOperacionPorcentage)}%</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">65%</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6; font-weight: bold;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">PRECIO FACTURA</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(PrecioFacturaPrimero)}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(PorcentajeTotalGananciaPrimero)}%</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 7.- RENTABILIDAD -->
          <h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-bottom: 5px;">7.- RENTABILIDAD</h3>
          <div style="margin-bottom: 20px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead style="text-align: center;">
                <tr>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">DESCRIPCION</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">MONTO (Bs)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 2px solid #dee2e6; font-weight: bold;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">RENTABILIDAD (PROYECTO)</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(RentabilidadProyecto)}%</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">RENTABILIDAD (GANANCIA)</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(RentabilidadGanancia)}%</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">RENTABILIDAD (COMPENSACIÓN DEL DUEÑO)</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(RentabilidadCompensacionDueno)}%</td>
                </tr>
                <tr style="border-bottom: 2px solid #dee2e6;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">RENTABILIDAD (IMPUESTOS)</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(RentabilidadImpuestos)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 8.- RETORNO DE GASTOS DE OPERACIÓN -->
          <h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-bottom: 5px;">8.- RETORNO DE GASTOS DE OPERACIÓN</h3>
          <div style="margin-bottom: 20px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead style="text-align: center;">
                <tr>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">DESCRIPCION</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">NUMERO DE TRANSACCIONES</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 2px solid #dee2e6; font-weight: bold;">
                  <td style="border: 1px solid #dee2e6; padding: 8px;">RETORNO</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatearNumeroLocal(Retorno)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>


          `;        
     // Crear y poblar div temporal (ID único para evitar conflictos)
     const tempDiv = document.createElement('div');
     const tempId = 'temp-pdf-reporte-general';
     tempDiv.id = tempId;
     tempDiv.innerHTML = htmlContent;
     tempDiv.style.position = 'absolute';
     tempDiv.style.left = '-9999px';
     tempDiv.style.top = '-9999px';
     tempDiv.style.width = '800px';  // Ancho fijo para mejor escalado en PDF
     tempDiv.style.fontFamily = 'Arial, sans-serif';
     tempDiv.style.fontSize = '12px';
     tempDiv.style.backgroundColor = '#ffffff';  // Fondo blanco explícito
     document.body.appendChild(tempDiv);

     // Llamar al método existente generatePDF para convertir a PDF
     await this.generatePDF(tempId, fileName);

     // Limpiar div temporal del DOM
     document.body.removeChild(tempDiv);

     console.log(`PDF de Reporte General generado exitosamente: ${fileName}`);
     } catch (error) {
     console.error('Error al generar PDF de Reporte General:', error);
     const errorMessage = (error instanceof Error) ? error.message : 'Error desconocido';
     throw new Error(`Fallo en la generación del PDF de Reporte General: ${errorMessage}`);
     }
  }
  async generatePDFMaterialesProyecto(idProyecto: number, nombreProyecto: string): Promise<void> {
    if (!idProyecto || !nombreProyecto) {
      console.error('ID de proyecto o nombre requeridos.');
      return;
    }

    try {
      // Paso 1: Cargar módulos y gastos en paralelo (tipado explícito)
      const [modulos, gastos] = await forkJoin([
        this.servicios.getModulosPorProyecto(idProyecto) as Observable<Modulo[]>,
        this.servicios.getGastoOperacionID(idProyecto) as Observable<GastoOperacion[]>
      ]).toPromise() as [Modulo[], GastoOperacion[]];

      if (!modulos || !gastos || gastos.length === 0) {
        console.error('No hay gastos en el proyecto.');
        return;
      }

      // Debug: Log datos (remueve en prod)
      console.log('Módulos:', modulos.length, 'Gastos:', gastos.length);

      // Paso 2: Cargar materiales para cada gasto (tipado en map)
      const observablesMateriales = gastos.map((gasto: GastoOperacion) =>
        this.servicios.getMaterialesIDGasto(gasto.id).pipe(
          map((materiales: Materiales[]) => ({ gasto, materiales: materiales || [] } as { gasto: GastoOperacion; materiales: Materiales[] }))
        )
      );

      const gastosConMateriales = await forkJoin(observablesMateriales).toPromise() as { gasto: GastoOperacion; materiales: Materiales[] }[];

      if (!gastosConMateriales) {
        console.error('Error al cargar materiales.');
        return;
      }

      // Paso 3: Replicar ordenamiento del componente (módulos → gastos por módulo → materiales)
      // Gastos sin módulo al final (tipado en filter)
      const gastosSinModulo = gastosConMateriales.filter((g: { gasto: GastoOperacion; materiales: Materiales[] }) => 
        !g.gasto.modulo_id && !g.gasto.modulo?.id
      );

      const modulosConGastos: { modulo: Modulo; gastos: { gasto: GastoOperacion; materiales: Materiales[] }[] }[] = [];

      modulos.forEach((modulo: Modulo) => {
        const gastosDelModulo = gastosConMateriales.filter((g: { gasto: GastoOperacion; materiales: Materiales[] }) => 
          g.gasto.modulo_id === modulo.id || g.gasto.modulo?.id === modulo.id
        );
        if (gastosDelModulo.length > 0) {
          modulosConGastos.push({ modulo, gastos: gastosDelModulo });
        }
      });

      // Estructura completa (incluye "Sin Módulo" si aplica)
      const estructura = modulosConGastos.length > 0 
        ? [...modulosConGastos, { 
            modulo: { id: 0, codigo: 'SIN', nombre: 'MÓDULO' } as Modulo, 
            gastos: gastosSinModulo 
          }]
        : [{ 
            modulo: { id: 0, codigo: 'SIN', nombre: 'MÓDULO' } as Modulo, 
            gastos: gastosConMateriales 
          }];

      // Debug: Log estructura
      console.log('Estructura:', estructura.map((e: { modulo: Modulo; gastos: { gasto: GastoOperacion; materiales: Materiales[] }[] }) => ({ modulo: e.modulo.nombre, gastosCount: e.gastos.length })));


      // Paso 4: Construir HTML tabla (Simplificado: Solo Módulo y Materiales)
      let htmlContent = `
          <div style="font-family: Arial, sans-serif; width: 100%; font-size: 12px; line-height: 1.4;">
            <h2 style="font-size: 18px; text-align: center; margin-bottom: 5px;">REPORTE DE MATERIALES DEL PROYECTO</h2>
            <p style="font-size: 14px; text-align: center; margin-bottom: 20px;"><strong>PROYECTO:</strong> ${nombreProyecto}</p>
            
            <div style="overflow-x: auto; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead style="text-align: center;">
                  <tr>
                    <th style="border: 1px solid #dee2e6; padding: 8px; width: 5%;">Nº</th>
                    <th style="border: 1px solid #dee2e6; padding: 8px; width: 45%;">DESCRIPCION</th>
                    <th style="border: 1px solid #dee2e6; padding: 8px; width: 10%;">UNIDAD</th>
                    <th style="border: 1px solid #dee2e6; padding: 8px; width: 10%;">CANTIDAD</th>
                    <th style="border: 1px solid #dee2e6; padding: 8px; width: 15%;">PRECIO UNITARIO (Bs)</th>
                    <th style="border: 1px solid #dee2e6; padding: 8px; width: 15%;">PRECIO PARCIAL (Bs)</th>
                  </tr>
                </thead>
                <tbody>
      `;

      let itemNum = 1;  // Contador secuencial de materiales
      let totalGlobalMateriales = 0;

      // Iterar sobre los módulos
      estructura.forEach(({ modulo, gastos }: { modulo: Modulo; gastos: { gasto: GastoOperacion; materiales: Materiales[] }[] }) => {
          const nombreModulo = modulo.id === 0 ? 'SIN MÓDULO' : `OBRA: ${modulo.nombre.toUpperCase()}`;
          let subtotalModuloMateriales = 0;
          let materialesDelModulo: Materiales[] = [];

          // Recolectar todos los materiales de todos los gastos dentro de este módulo
          gastos.forEach(({ materiales }: { materiales: Materiales[] }) => {
              materialesDelModulo = materialesDelModulo.concat(materiales);
          });

          // Si hay materiales en este módulo, pintar el encabezado del módulo y las filas
          if (materialesDelModulo.length > 0) {
              // Fila de Módulo (simulando el formato de la imagen)
              htmlContent += `
                <tr style="">
                  <td colspan="5" style="border: 1px solid #dee2e6; padding: 6px; text-align: left; font-weight: bold; font-size: 12px;">
                    MÓDULO: ${nombreModulo}
                  </td>
                  <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right; font-weight: bold; font-size: 12px;">
                    </td>
                </tr>
              `;

              // Iterar y pintar cada material
              materialesDelModulo.forEach((mat: Materiales) => {
                  const cantidadMat = Number(mat.cantidad) || 0;
                  const precioUnitMat = Number(mat.precio_unitario) || 0;
                  const totalMat = Number(mat.total) || (cantidadMat * precioUnitMat);
                  
                  subtotalModuloMateriales += totalMat;
                  totalGlobalMateriales += totalMat;

                  htmlContent += `
                    <tr style="">
                      <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">${itemNum++}</td>
                      <td style="border: 1px solid #dee2e6; padding: 6px; text-align: left;">${mat.descripcion || 'Sin descripción'}</td>
                      <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">${mat.unidad || 'N/A'}</td>
                      <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right;">${cantidadMat}</td>
                      <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right;">${this.formatearNumero(precioUnitMat)}</td>
                      <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right;">${this.formatearNumero(totalMat)}</td>
                    </tr>
                  `;
              });

              // **Este bloque reemplaza la primera adición de htmlContent dentro del forEach:**
              const subtotalModuloCalculado = materialesDelModulo.reduce((acc, mat) => acc + (Number(mat.total) || (Number(mat.cantidad) * Number(mat.precio_unitario)) || 0), 0);
              
              // Retroceder para pintar la fila del Módulo (con el total)
              htmlContent = htmlContent.slice(0, htmlContent.lastIndexOf('</tbody>')); // Quitar el <tbody> si ya se agregó, aunque aquí no debería haber pasado.
              
              htmlContent += `
                <tr style="">
                  <td colspan="5" style="border: 1px solid #dee2e6; padding: 6px; text-align: right; font-weight: bold;">SUBTOTAL MÓDULO:</td>
                  <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right; font-weight: bold;">${this.formatearNumero(subtotalModuloMateriales)}</td>
                </tr>
              `;
          }
      });
      // Cerrar el cuerpo de la tabla
      htmlContent += `
                </tbody>
                <tfoot style="">
                  <tr>
                    <td colspan="5" style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold; font-size: 13px;">TOTAL MATERIALES:</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold; font-size: 13px;">${this.formatearNumero(totalGlobalMateriales)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
      `;

      // Paso 5: Generar PDF (usa tu método generatePDF con div temporal)
      const tempDiv = document.createElement('div');
      tempDiv.id = 'temp-pdf-materiales';
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '210mm';  // Ancho A4 estándar para PDF (ajusta si necesitas landscape)
      tempDiv.style.padding = '20px';
      tempDiv.style.backgroundColor = 'white';
      document.body.appendChild(tempDiv);

      // Generar filename único
      const safeNombre = nombreProyecto.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const fileName = `reporte-materiales-modulos_${safeNombre}_${idProyecto}.pdf`;

      // Llamar a tu método generatePDF existente (asumiendo que maneja html2canvas + jsPDF)
      await this.generatePDF('temp-pdf-materiales', fileName);

      // Limpiar div temporal
      document.body.removeChild(tempDiv);

      console.log(`PDF de materiales por módulos generado exitosamente: ${fileName} | Total: ${this.formatearNumero(totalGlobalMateriales)} Bs.`);
    } catch (error: unknown) {
      console.error('Error al generar PDF de materiales por módulos:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Fallo en generación de PDF: ${errorMsg || 'Datos insuficientes'}`);
    }
  }
  async generatePDFManoDeObraProyecto(idProyecto: number, nombreProyecto: string): Promise<void> {
      if (!idProyecto || !nombreProyecto) {
          console.error('ID de proyecto o nombre requeridos.');
          return;
      }

      try {
          // Paso 1: Cargar módulos y gastos en paralelo (Sin cambios en lógica de carga de módulos/gastos)
          const [modulos, gastos] = await forkJoin([
              this.servicios.getModulosPorProyecto(idProyecto) as Observable<Modulo[]>,
              this.servicios.getGastoOperacionID(idProyecto) as Observable<GastoOperacion[]>
          ]).toPromise() as [Modulo[], GastoOperacion[]];

          if (!modulos || !gastos || gastos.length === 0) {
              console.error('No hay gastos en el proyecto.');
              return;
          }

          console.log('Módulos:', modulos.length, 'Gastos:', gastos.length);

          // Paso 2: Cargar Mano de Obra para cada gasto (Actualizado para ManoDeObra)
          const observablesManoDeObra = gastos.map((gasto: GastoOperacion) =>
              this.servicios.getManoDeObraIDGasto(gasto.id).pipe( // <-- CAMBIO CLAVE: Usa el servicio de Mano de Obra
                  map((manoDeObra: ManoDeObra[]) => ({ gasto, manoDeObra: manoDeObra || [] } as { gasto: GastoOperacion; manoDeObra: ManoDeObra[] })) // <-- Tipado: ManoDeObra
              )
          );

          const gastosConManoDeObra = await forkJoin(observablesManoDeObra).toPromise() as { gasto: GastoOperacion; manoDeObra: ManoDeObra[] }[]; // <-- Tipado: ManoDeObra

          if (!gastosConManoDeObra) {
              console.error('Error al cargar mano de obra.');
              return;
          }

          // Paso 3: Replicar ordenamiento del componente (módulos → gastos por módulo → mano de obra)
          // Se reemplaza 'materiales' por 'manoDeObra' en el tipado y los filtros.
          const gastosSinModulo = gastosConManoDeObra.filter((g: { gasto: GastoOperacion; manoDeObra: ManoDeObra[] }) => 
              !g.gasto.modulo_id && !g.gasto.modulo?.id
          );

          const modulosConGastos: { modulo: Modulo; gastos: { gasto: GastoOperacion; manoDeObra: ManoDeObra[] }[] }[] = [];

          modulos.forEach((modulo: Modulo) => {
              const gastosDelModulo = gastosConManoDeObra.filter((g: { gasto: GastoOperacion; manoDeObra: ManoDeObra[] }) => 
                  g.gasto.modulo_id === modulo.id || g.gasto.modulo?.id === modulo.id
              );
              if (gastosDelModulo.length > 0) {
                  modulosConGastos.push({ modulo, gastos: gastosDelModulo });
              }
          });

          // Estructura completa (incluye "Sin Módulo" si aplica)
          const estructura = modulosConGastos.length > 0 
              ? [...modulosConGastos, { 
                  modulo: { id: 0, codigo: 'SIN', nombre: 'MÓDULO' } as Modulo, 
                  gastos: gastosSinModulo 
              }]
              : [{ 
                  modulo: { id: 0, codigo: 'SIN', nombre: 'MÓDULO' } as Modulo, 
                  gastos: gastosConManoDeObra 
              }];

          // Debug: Log estructura
          console.log('Estructura (M.O.):', estructura.map((e: { modulo: Modulo; gastos: { gasto: GastoOperacion; manoDeObra: ManoDeObra[] }[] }) => ({ modulo: e.modulo.nombre, gastosCount: e.gastos.length })));


          // Paso 4: Construir HTML tabla (Simplificado: Solo Módulo y Mano de Obra con estilos de Materiales)
          let htmlContent = `
              <div style="font-family: Arial, sans-serif; width: 100%; font-size: 12px; line-height: 1.4;">
                <h2 style="font-size: 18px; text-align: center; margin-bottom: 5px;">REPORTE DE MANO DE OBRA DEL PROYECTO</h2> <p style="font-size: 14px; text-align: center; margin-bottom: 20px;"><strong>PROYECTO:</strong> ${nombreProyecto}</p>
                
                <div style="overflow-x: auto; margin-bottom: 20px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead style="text-align: center;">
                      <tr>
                        <th style="border: 1px solid #dee2e6; padding: 8px; width: 5%;">Nº</th>
                        <th style="border: 1px solid #dee2e6; padding: 8px; width: 45%;">DESCRIPCION</th>
                        <th style="border: 1px solid #dee2e6; padding: 8px; width: 10%;">UNIDAD</th>
                        <th style="border: 1px solid #dee2e6; padding: 8px; width: 10%;">CANTIDAD</th>
                        <th style="border: 1px solid #dee2e6; padding: 8px; width: 15%;">PRECIO UNITARIO (Bs)</th>
                        <th style="border: 1px solid #dee2e6; padding: 8px; width: 15%;">PRECIO PARCIAL (Bs)</th>
                      </tr>
                    </thead>
                    <tbody>
          `;

          let itemNum = 1;  // Contador secuencial de mano de obra
          let totalGlobalManoDeObra = 0; // <-- Variable de Total actualizada

          // Iterar sobre los módulos
          estructura.forEach(({ modulo, gastos }: { modulo: Modulo; gastos: { gasto: GastoOperacion; manoDeObra: ManoDeObra[] }[] }) => {
              const nombreModulo = modulo.id === 0 ? 'SIN MÓDULO' : `OBRA: ${modulo.nombre.toUpperCase()}`;
              let subtotalModuloManoDeObra = 0;
              let manoDeObraDelModulo: ManoDeObra[] = [];

              // Recolectar toda la mano de obra de todos los gastos dentro de este módulo
              gastos.forEach(({ manoDeObra }: { manoDeObra: ManoDeObra[] }) => {
                  manoDeObraDelModulo = manoDeObraDelModulo.concat(manoDeObra);
              });

              // Si hay mano de obra en este módulo, pintar el encabezado del módulo y las filas
              if (manoDeObraDelModulo.length > 0) {
                  // Fila de Módulo (manteniendo el estilo del original)
                  htmlContent += `
                    <tr style="">
                      <td colspan="5" style="border: 1px solid #dee2e6; padding: 6px; text-align: left; font-weight: bold; font-size: 12px;">
                        MÓDULO: ${nombreModulo}
                      </td>
                      <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right; font-weight: bold; font-size: 12px;">
                        </td>
                    </tr>
                  `;

                  // Iterar y pintar cada ítem de mano de obra
                  manoDeObraDelModulo.forEach((mo: ManoDeObra) => {
                      const cantidadMO = Number(mo.cantidad) || 0;
                      const precioUnitMO = Number(mo.precio_unitario) || 0;
                      const totalMO = Number(mo.total) || (cantidadMO * precioUnitMO);
                      
                      subtotalModuloManoDeObra += totalMO;
                      totalGlobalManoDeObra += totalMO; // <-- Acumular Total Global de MO

                      htmlContent += `
                        <tr style="">
                          <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">${itemNum++}</td>
                          <td style="border: 1px solid #dee2e6; padding: 6px; text-align: left;">${mo.descripcion || 'Sin descripción'}</td>
                          <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">${mo.unidad || 'N/A'}</td>
                          <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right;">${cantidadMO}</td>
                          <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right;">${this.formatearNumero(precioUnitMO)}</td>
                          <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right;">${this.formatearNumero(totalMO)}</td>
                        </tr>
                      `;
                  });

                  // Fila de Subtotal del Módulo (manteniendo el estilo del original)
                  htmlContent += `
                    <tr style="">
                      <td colspan="5" style="border: 1px solid #dee2e6; padding: 6px; text-align: right; font-weight: bold;">SUBTOTAL MÓDULO:</td>
                      <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right; font-weight: bold;">${this.formatearNumero(subtotalModuloManoDeObra)}</td>
                    </tr>
                  `;
              }
          });

          // Cerrar el cuerpo de la tabla
          htmlContent += `
                    </tbody>
                    <tfoot style="">
                      <tr>
                        <td colspan="5" style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold; font-size: 13px;">TOTAL MANO DE OBRA:</td> <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold; font-size: 13px;">${this.formatearNumero(totalGlobalManoDeObra)}</td> </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
          `;

          // Paso 5: Generar PDF (usa tu método generatePDF con div temporal)
          const tempDiv = document.createElement('div');
          tempDiv.id = 'temp-pdf-mano-de-obra'; // <-- ID ÚNICO
          tempDiv.innerHTML = htmlContent;
          tempDiv.style.position = 'absolute';
          tempDiv.style.left = '-9999px';
          tempDiv.style.top = '-9999px';
          tempDiv.style.width = '210mm';
          tempDiv.style.padding = '20px';
          tempDiv.style.backgroundColor = 'white';
          document.body.appendChild(tempDiv);

          // Generar filename único
          const safeNombre = nombreProyecto.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
          const fileName = `reporte-mano-de-obra-modulos_${safeNombre}_${idProyecto}.pdf`; // <-- Nombre de Archivo

          // Llamar a tu método generatePDF existente (asumiendo que maneja html2canvas + jsPDF)
          await this.generatePDF('temp-pdf-mano-de-obra', fileName); // <-- Uso del nuevo ID

          // Limpiar div temporal
          document.body.removeChild(tempDiv);

          console.log(`PDF de mano de obra por módulos generado exitosamente: ${fileName} | Total: ${this.formatearNumero(totalGlobalManoDeObra)} Bs.`);
      } catch (error: unknown) {
          console.error('Error al generar PDF de mano de obra por módulos:', error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          throw new Error(`Fallo en generación de PDF: ${errorMsg || 'Datos insuficientes'}`);
      }
  }
  async generatePDFEquipoHerramientaProyecto(idProyecto: number, nombreProyecto: string): Promise<void> {
      if (!idProyecto || !nombreProyecto) {
          console.error('ID de proyecto o nombre requeridos.');
          return;
      }

      try {
          // Paso 1: Cargar módulos y gastos en paralelo 
          const [modulos, gastos] = await forkJoin([
              this.servicios.getModulosPorProyecto(idProyecto) as Observable<Modulo[]>,
              this.servicios.getGastoOperacionID(idProyecto) as Observable<GastoOperacion[]>
          ]).toPromise() as [Modulo[], GastoOperacion[]];

          if (!modulos || !gastos || gastos.length === 0) {
              console.error('No hay gastos en el proyecto.');
              return;
          }

          console.log('Módulos:', modulos.length, 'Gastos:', gastos.length);

          // Paso 2: Cargar Equipo y Herramienta para cada gasto (Adaptado para EquipoHerramienta)
          const observablesEquipoHerramienta = gastos.map((gasto: GastoOperacion) =>
              this.servicios.getEquipoHerramientas(gasto.id).pipe( // <-- CAMBIO CLAVE: Usa el servicio de Equipo/Herramienta
                  map((equipoHerramienta: EquipoHerramienta[]) => ({ gasto, equipoHerramienta: equipoHerramienta || [] } as { gasto: GastoOperacion; equipoHerramienta: EquipoHerramienta[] })) // <-- Tipado: EquipoHerramienta
              )
          );

          const gastosConEquipoHerramienta = await forkJoin(observablesEquipoHerramienta).toPromise() as { gasto: GastoOperacion; equipoHerramienta: EquipoHerramienta[] }[]; // <-- Tipado: EquipoHerramienta

          if (!gastosConEquipoHerramienta) {
              console.error('Error al cargar equipo y herramienta.');
              return;
          }

          // Paso 3: Replicar ordenamiento del componente 
          // Se reemplaza 'materiales' por 'equipoHerramienta' en el tipado y los filtros.
          const gastosSinModulo = gastosConEquipoHerramienta.filter((g: { gasto: GastoOperacion; equipoHerramienta: EquipoHerramienta[] }) => 
              !g.gasto.modulo_id && !g.gasto.modulo?.id
          );

          const modulosConGastos: { modulo: Modulo; gastos: { gasto: GastoOperacion; equipoHerramienta: EquipoHerramienta[] }[] }[] = [];

          modulos.forEach((modulo: Modulo) => {
              const gastosDelModulo = gastosConEquipoHerramienta.filter((g: { gasto: GastoOperacion; equipoHerramienta: EquipoHerramienta[] }) => 
                  g.gasto.modulo_id === modulo.id || g.gasto.modulo?.id === modulo.id
              );
              if (gastosDelModulo.length > 0) {
                  modulosConGastos.push({ modulo, gastos: gastosDelModulo });
              }
          });

          // Estructura completa (incluye "Sin Módulo" si aplica)
          const estructura = modulosConGastos.length > 0 
              ? [...modulosConGastos, { 
                  modulo: { id: 0, codigo: 'SIN', nombre: 'MÓDULO' } as Modulo, 
                  gastos: gastosSinModulo 
              }]
              : [{ 
                  modulo: { id: 0, codigo: 'SIN', nombre: 'MÓDULO' } as Modulo, 
                  gastos: gastosConEquipoHerramienta 
              }];


          // Paso 4: Construir HTML tabla (Simplificado: Solo Módulo y Equipo/Herramienta con estilos originales)
          let htmlContent = `
              <div style="font-family: Arial, sans-serif; width: 100%; font-size: 12px; line-height: 1.4;">
                <h2 style="font-size: 18px; text-align: center; margin-bottom: 5px;">REPORTE DE EQUIPO Y HERRAMIENTA DEL PROYECTO</h2> <p style="font-size: 14px; text-align: center; margin-bottom: 20px;"><strong>PROYECTO:</strong> ${nombreProyecto}</p>
                
                <div style="overflow-x: auto; margin-bottom: 20px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead style="text-align: center;">
                      <tr>
                        <th style="border: 1px solid #dee2e6; padding: 8px; width: 5%;">Nº</th>
                        <th style="border: 1px solid #dee2e6; padding: 8px; width: 45%;">DESCRIPCION</th>
                        <th style="border: 1px solid #dee2e6; padding: 8px; width: 10%;">UNIDAD</th>
                        <th style="border: 1px solid #dee2e6; padding: 8px; width: 10%;">CANTIDAD</th>
                        <th style="border: 1px solid #dee2e6; padding: 8px; width: 15%;">PRECIO UNITARIO (Bs)</th>
                        <th style="border: 1px solid #dee2e6; padding: 8px; width: 15%;">PRECIO PARCIAL (Bs)</th>
                      </tr>
                    </thead>
                    <tbody>
          `;

          let itemNum = 1;  // Contador secuencial
          let totalGlobalEquipoHerramienta = 0; // <-- Variable de Total actualizada

          // Iterar sobre los módulos
          estructura.forEach(({ modulo, gastos }: { modulo: Modulo; gastos: { gasto: GastoOperacion; equipoHerramienta: EquipoHerramienta[] }[] }) => {
              const nombreModulo = modulo.id === 0 ? 'SIN MÓDULO' : `OBRA: ${modulo.nombre.toUpperCase()}`;
              let subtotalModuloEquipoHerramienta = 0;
              let equipoHerramientaDelModulo: EquipoHerramienta[] = [];

              // Recolectar todo el equipo/herramienta de todos los gastos dentro de este módulo
              gastos.forEach(({ equipoHerramienta }: { equipoHerramienta: EquipoHerramienta[] }) => {
                  equipoHerramientaDelModulo = equipoHerramientaDelModulo.concat(equipoHerramienta);
              });

              // Si hay ítems en este módulo, pintar el encabezado del módulo y las filas
              if (equipoHerramientaDelModulo.length > 0) {
                  // Fila de Módulo (manteniendo el estilo del original)
                  htmlContent += `
                    <tr style="">
                      <td colspan="5" style="border: 1px solid #dee2e6; padding: 6px; text-align: left; font-weight: bold; font-size: 12px;">
                        MÓDULO: ${nombreModulo}
                      </td>
                      <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right; font-weight: bold; font-size: 12px;">
                        </td>
                    </tr>
                  `;

                  // Iterar y pintar cada ítem de equipo/herramienta
                  equipoHerramientaDelModulo.forEach((eh: EquipoHerramienta) => {
                      const cantidadEH = Number(eh.cantidad) || 0;
                      const precioUnitEH = Number(eh.precio_unitario) || 0;
                      const totalEH = Number(eh.total) || (cantidadEH * precioUnitEH);
                      
                      subtotalModuloEquipoHerramienta += totalEH;
                      totalGlobalEquipoHerramienta += totalEH; // <-- Acumular Total Global

                      htmlContent += `
                        <tr style="">
                          <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">${itemNum++}</td>
                          <td style="border: 1px solid #dee2e6; padding: 6px; text-align: left;">${eh.descripcion || 'Sin descripción'}</td>
                          <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">${eh.unidad || 'N/A'}</td>
                          <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right;">${cantidadEH}</td>
                          <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right;">${this.formatearNumero(precioUnitEH)}</td>
                          <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right;">${this.formatearNumero(totalEH)}</td>
                        </tr>
                      `;
                  });

                  // Fila de Subtotal del Módulo (manteniendo el estilo del original)
                  htmlContent += `
                    <tr style="">
                      <td colspan="5" style="border: 1px solid #dee2e6; padding: 6px; text-align: right; font-weight: bold;">SUBTOTAL MÓDULO:</td>
                      <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right; font-weight: bold;">${this.formatearNumero(subtotalModuloEquipoHerramienta)}</td>
                    </tr>
                  `;
              }
          });

          // Cerrar el cuerpo de la tabla
          htmlContent += `
                    </tbody>
                    <tfoot style="">
                      <tr>
                        <td colspan="5" style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold; font-size: 13px;">TOTAL EQUIPO Y HERRAMIENTA:</td> <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold; font-size: 13px;">${this.formatearNumero(totalGlobalEquipoHerramienta)}</td> </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
          `;

          // Paso 5: Generar PDF (usa tu método generatePDF con div temporal)
          const tempDiv = document.createElement('div');
          tempDiv.id = 'temp-pdf-equipo-herramienta'; // <-- ID ÚNICO
          tempDiv.innerHTML = htmlContent;
          tempDiv.style.position = 'absolute';
          tempDiv.style.left = '-9999px';
          tempDiv.style.top = '-9999px';
          tempDiv.style.width = '210mm';
          tempDiv.style.padding = '20px';
          tempDiv.style.backgroundColor = 'white';
          document.body.appendChild(tempDiv);

          // Generar filename único
          const safeNombre = nombreProyecto.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
          const fileName = `reporte-equipo-herramienta-modulos_${safeNombre}_${idProyecto}.pdf`; // <-- Nombre de Archivo

          // Llamar a tu método generatePDF existente
          await this.generatePDF('temp-pdf-equipo-herramienta', fileName); // <-- Uso del nuevo ID

          // Limpiar div temporal
          document.body.removeChild(tempDiv);

          console.log(`PDF de equipo y herramienta por módulos generado exitosamente: ${fileName} | Total: ${this.formatearNumero(totalGlobalEquipoHerramienta)} Bs.`);
      } catch (error: unknown) {
          console.error('Error al generar PDF de equipo y herramienta por módulos:', error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          throw new Error(`Fallo en generación de PDF: ${errorMsg || 'Datos insuficientes'}`);
      }
  }



  private formatearNumeroLocal(valor: number): string {
    const num = Number.isFinite(valor) ? valor : 0;  // Guard contra NaN/Infinity
    return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  }
  // Método auxiliar para formateo (agrega esto como privado en la clase si no existe)

formatearNumero(valor: any): string {  // ← Hazla pública si no lo es
  const numValor = this.toNum(valor);  // Usa toNum para consistencia
  if (isNaN(numValor) || numValor === null || numValor === undefined) {
    return '0.00'; 
  }
  return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numValor);
}

// Funciones auxiliares para cálculos (replicadas del componente; agrega como privadas en la clase)
private toNum(valor: any): number {
  return Number(valor) || 0;
}

private roundTo(valor: number, decimales: number = 2): number {
  const factor = Math.pow(10, decimales);
  return Math.round(valor * factor) / factor;
}


private getCostoVenta(gasto: GastoOperacion, proyecto: Proyecto): number {
  const precio = this.toNum(gasto.precio_unitario);
  const ivaNominal = this.toNum(proyecto.iva_tasa_nominal);
  const porcentajeGlobal = this.toNum(proyecto.porcentaje_global_100);
  if (porcentajeGlobal === 0) return precio;  // ← AGREGAR: Guard
  return precio - (precio * (ivaNominal / porcentajeGlobal));
}

private getMargenUtilidad(gasto: GastoOperacion, proyecto: Proyecto): number {
  if (this.toNum(proyecto.a_costo_venta) === 0) return 0;
  const margen = this.toNum(proyecto.b_margen_utilidad);
  const aCosto = this.toNum(proyecto.a_costo_venta);
  const porcentajeGlobal = this.toNum(proyecto.porcentaje_global_100);
  return ((margen / porcentajeGlobal) / (aCosto / porcentajeGlobal)) * this.getCostoVenta(gasto, proyecto);
}

private getIvaEfectivaCalculo(proyecto: Proyecto): number {
  const ivaNominal = this.toNum(proyecto.iva_tasa_nominal);
  const aCosto = this.toNum(proyecto.a_costo_venta);
  const margen = this.toNum(proyecto.b_margen_utilidad);
  return ivaNominal / (aCosto + margen);
}

private getIvaEfectiva(gasto: GastoOperacion, proyecto: Proyecto): number {
  return (this.getCostoVenta(gasto, proyecto) + this.getMargenUtilidad(gasto, proyecto)) * this.getIvaEfectivaCalculo(proyecto);
}

private getPrecioFactura(gasto: GastoOperacion, proyecto: Proyecto): number {
  return this.getCostoVenta(gasto, proyecto) + this.getMargenUtilidad(gasto, proyecto) + this.getIvaEfectiva(gasto, proyecto);
}

private getValorAgregado(gasto: GastoOperacion, proyecto: Proyecto): number {
  const valor = this.getPrecioFactura(gasto, proyecto) - this.toNum(gasto.precio_unitario);
  return this.roundTo(valor, 2);
}

private sumaPrecioUnitarioActividad(gasto: GastoOperacion, proyecto: Proyecto): number {
  return this.roundTo(this.toNum(gasto.precio_unitario) + this.getValorAgregado(gasto, proyecto), 2);
}

private multiplicacionPrecioUnitarioActividadPorCantidad(gasto: GastoOperacion, proyecto: Proyecto): number {
  return this.roundTo(this.sumaPrecioUnitarioActividad(gasto, proyecto) * this.toNum(gasto.cantidad), 2);
}

// Método para generar PDF de Gastos de Operación (adaptado del ejemplo de EquipoHerramienta, con estilos idénticos)
async generatePDFGastosOperacionProyecto(idProyecto: number, nombreProyecto: string): Promise<void> {
  if (!idProyecto || !nombreProyecto) {
    console.error('ID de proyecto o nombre requeridos.');
    return;
  }

  try {
    const [modulos, gastos, proyecto] = await forkJoin([
      this.servicios.getModulosPorProyecto(idProyecto) as Observable<Modulo[]>,
      this.servicios.getGastoOperacionID(idProyecto) as Observable<GastoOperacion[]>,
      this.servicios.getIdentificadorGeneralID(idProyecto) as Observable<Proyecto> // ← CORREGIDO: Método existente
    ]).toPromise() as [Modulo[], GastoOperacion[], Proyecto];

    if (!modulos || !gastos || gastos.length === 0 || !proyecto) {
      console.error('No hay datos suficientes (gastos o proyecto) en el proyecto.');
      return;
    }
    console.log('Módulos:', modulos.length, 'Gastos:', gastos.length, 'Proyecto cargado:', proyecto.NombreProyecto);
    const gastosSinModulo = gastos.filter((g: GastoOperacion) => !g.modulo_id && !g.modulo?.id);

    const modulosConGastos: { modulo: Modulo; gastos: GastoOperacion[] }[] = [];

    modulos.forEach((modulo: Modulo) => {
      const gastosDelModulo = gastos.filter((g: GastoOperacion) => 
        g.modulo_id === modulo.id || g.modulo?.id === modulo.id
      );
      if (gastosDelModulo.length > 0) {
        modulosConGastos.push({ modulo, gastos: gastosDelModulo });
      }
    });

    // 1. Lógica modificada: Solo agregar "Sin Módulo" si hay gastos asociados.
    let estructura = [...modulosConGastos];
    if (gastosSinModulo.length > 0) {
        estructura.push({ 
          modulo: { id: 0, codigo: 'SIN', nombre: 'MÓDULO' } as Modulo, 
          gastos: gastosSinModulo 
        });
    } else if (modulosConGastos.length === 0) { }
    
    // Si la estructura quedó vacía (no debería pasar por el chequeo inicial, pero por seguridad):
    if (estructura.length === 0 && gastos.length > 0) {
      if (modulosConGastos.length === 0 && gastos.length > 0) {
        estructura = [{ 
          modulo: { id: 0, codigo: 'SIN', nombre: 'MÓDULO' } as Modulo, 
          gastos
        }];
      }
    }
    const estructuraFinal = modulosConGastos;
    if (gastosSinModulo.length > 0) {
        estructuraFinal.push({ 
            modulo: { id: 0, codigo: 'SIN', nombre: 'MÓDULO' } as Modulo, 
            gastos: gastosSinModulo 
        });
    }

    console.log('Estructura:', estructuraFinal.map(e => ({ modulo: e.modulo.nombre, gastosCount: e.gastos.length })));
    
    // -----------------------------------------------------

    const totalGastosOperacionGeneral = gastos.reduce((acc: number, gasto: GastoOperacion) => acc + this.toNum(gasto.precio_unitario), 0);
    const totalValorAgregado = gastos.reduce((acc: number, gasto: GastoOperacion) => acc + this.getValorAgregado(gasto, proyecto), 0);
    const totalFactura = gastos.reduce((acc: number, gasto: GastoOperacion) => acc + this.multiplicacionPrecioUnitarioActividadPorCantidad(gasto, proyecto), 0);

    console.log('Totales calculados:', { totalGastosOperacionGeneral, totalValorAgregado, totalFactura });
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; width: 100%; font-size: 12px;">
        <h2 style="color: #007bff; font-size: 24px; text-align: center; margin-bottom: 20px;">Reporte de Gastos de Operación por Módulos</h2>
        <p style="font-size: 14px; text-align: center; margin-bottom: 20px;"><strong>Proyecto:</strong> ${nombreProyecto} | <strong>ID:</strong> ${idProyecto} | <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-BO')}</p>
        
        <div style="overflow-x: auto; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #dee2e6;">
            <thead style="">
              <tr>
                <th style="border: 1px solid #dee2e6; padding: 8px; width: 5%; text-align: center;">Item</th>
                <th style="border: 1px solid #dee2e6; padding: 8px; width: 30%; text-align: center;">Descripción</th>
                <th style="border: 1px solid #dee2e6; padding: 8px; width: 6%; text-align: center;">Unidad</th>
                <th style="border: 1px solid #dee2e6; padding: 8px; width: 6%; text-align: center;">Cantidad</th>
                <th style="border: 1px solid #dee2e6; padding: 8px; width: 6%; text-align: center;">Gastos De Operación (Bs.)</th>
                <th style="border: 1px solid #dee2e6; padding: 8px; width: 6%; text-align: center;">Valor Agregado (Bs.)</th>
                <th style="border: 1px solid #dee2e6; padding: 8px; width: 6%; text-align: center;">Precio Unitario Actividad (Bs.)</th>
                <th style="border: 1px solid #dee2e6; padding: 8px; width: 12%; text-align: center;">Precio Unitario Literal</th>
                <th style="border: 1px solid #dee2e6; padding: 8px; width: 6%; text-align: center;">Precio Factura Parcial (Bs.)</th>
              </tr>
            </thead>
            <tbody>
    `;

    let itemNum = 1; // Contador secuencial para gastos (obtenerNumero en componente)

    estructuraFinal.forEach(({ modulo, gastos }: { modulo: Modulo; gastos: GastoOperacion[] }) => {
      const nombreModulo = modulo.id === 0 ? 'Sin Módulo' : `${modulo.codigo} - ${modulo.nombre}`;

      // Fila de Módulo Registrado (estilo bg text-black fw-bold, colspan 9, como en componente; sin acciones/editar)
      htmlContent += `
        <tr style="color: black; font-weight: bold; font-size: 1.1em;">
          <td colspan="9" style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">
            Módulo: ${nombreModulo} (${gastos.length} gasto(s))
          </td>
        </tr>
      `;

      let subtotalModuloGastos = 0;
      let subtotalModuloValorAgregado = 0;
      let subtotalModuloFactura = 0;

      // Filtrar y ordenar gastos por ID (replica lógica del componente)
      const gastosOrdenados = gastos.sort((a, b) => (a.id! > b.id!) ? 1 : -1);

      gastosOrdenados.forEach((gasto: GastoOperacion) => {
        // Cálculos (replica getters del componente)
        const cantidadGasto = this.toNum(gasto.cantidad);
        const gastosOperacion = this.toNum(gasto.precio_unitario);
        const valorAgregado = this.getValorAgregado(gasto, proyecto);
        const precioUnitarioActividad = this.sumaPrecioUnitarioActividad(gasto, proyecto);
        const precioFacturaParcial = this.multiplicacionPrecioUnitarioActividadPorCantidad(gasto, proyecto);
        // Precio Unitario Literal: Simplificado (replica NumeroALetras; usa string básico; integra librería si necesitas)
        const precioLiteral = gasto.precio_literal || `${this.formatearNumero(precioUnitarioActividad)} Bolivianos`;

        subtotalModuloGastos += gastosOperacion;
        subtotalModuloValorAgregado += valorAgregado;
        subtotalModuloFactura += precioFacturaParcial;

        // Fila de Gasto (estilo input-cell text-center, sin drag-handle, inputs, selects, listas, acciones; sin columna Módulo)
        htmlContent += `
          <tr style="">
            <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center; font-weight: bold;">${itemNum++}</td>
            <td style="border: 1px solid #dee2e6; padding: 6px; text-align: left;">${gasto.descripcion || 'Sin descripción'}</td>
            <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">${gasto.unidad || 'N/A'}</td>
            <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">${cantidadGasto}</td>
            <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right;">${this.formatearNumero(gastosOperacion)}</td>
            <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right;">${this.formatearNumero(valorAgregado)}</td>
            <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right;">${this.formatearNumero(precioUnitarioActividad)}</td>
            <td style="border: 1px solid #dee2e6; padding: 6px; text-align: left; white-space: pre-line;">${precioLiteral}</td>
            <td style="border: 1px solid #dee2e6; padding: 6px; text-align: right; font-weight: bold;">${this.formatearNumero(precioFacturaParcial)}</td>
          </tr>
        `;
      });

      // Subtotal por Módulo (opcional; replica tfoot con bg-light, pero por módulo; colspan ajustado a 9 columnas)
      if (gastos.length > 0) {
        htmlContent += `
          <tr style="">
            <td colspan="4" style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold;">Subtotal Módulo (${nombreModulo}):</td>
            <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold;">${this.formatearNumero(subtotalModuloGastos)}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold;">${this.formatearNumero(subtotalModuloValorAgregado)}</td>
            <td colspan="2" style="border: 1px solid #dee2e6; padding: 8px;"></td>
            <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-weight: bold;">${this.formatearNumero(subtotalModuloFactura)}</td>
          </tr>
        `;
      }
    });

    // Si no hay items: Fila vacía (replica *ngIf="items.length === 0")
    if (gastos.length === 0) {
      htmlContent += `
        <tr>
          <td colspan="9" style="border: 1px solid #dee2e6; padding: 20px; text-align: center; color: #6c757d;">
            No hay ítems registrados.
          </td>
        </tr>
      `;
    }

    // Total Global (replica tfoot: table-light, colspan ajustado a 9 columnas, sin botón)
    htmlContent += `
            </tbody>
            <tfoot style="">
              <tr>
                <td colspan="4" style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-weight: bold; font-size: 14px;">TOTALES</td>
                <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-weight: bold;">${this.formatearNumero(totalGastosOperacionGeneral)}</td>
                <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-weight: bold;">${this.formatearNumero(totalValorAgregado)}</td>
                <td colspan="2" style="border: 1px solid #dee2e6; padding: 12px;"></td>
                <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-weight: bold;">${this.formatearNumero(totalFactura)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;

    // Paso 5: Generar PDF (usa tu método generatePDF con div temporal; estilos responsive como table-responsive)
    const tempDiv = document.createElement('div');
    tempDiv.id = 'temp-pdf-gastos-operacion'; // ID único
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '210mm'; // Ancho A4 estándar (ajusta a 'l' en jsPDF si landscape para tabla ancha)
    tempDiv.style.padding = '20px';
    tempDiv.style.backgroundColor = 'white';
   
    document.body.appendChild(tempDiv);

    // Generar filename único
    const safeNombre = nombreProyecto.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const fileName = `reporte-gastos-operacion-modulos_${safeNombre}_${idProyecto}.pdf`;

    // Llamar a tu método generatePDF existente (maneja html2canvas + jsPDF con paginación)
    await this.generatePDF('temp-pdf-gastos-operacion', fileName);

    // Limpiar div temporal
    document.body.removeChild(tempDiv);

    console.log(`PDF de gastos de operación por módulos generado exitosamente: ${fileName} | Total: ${this.formatearNumero(totalFactura)} Bs.`);
  } catch (error: unknown) {
    console.error('Error al generar PDF de gastos de operación por módulos:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Fallo en generación de PDF: ${errorMsg || 'Datos insuficientes'}`);
  }
}

}
