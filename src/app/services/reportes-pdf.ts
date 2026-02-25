// src/app/services/reportes-pdf.ts
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NumeroALetras } from '../utils/numeroALetras';

export type OrigenReporte = 'PROYECTO' | 'MODULO' | 'ITEM';

export interface ReporteFinancieroInput {
  origen: OrigenReporte;

  id_proyecto: number;
  id_modulo?: number;
  id_item?: number;

  nombreProyecto: string;
  nombreModulo?: string;
  descripcionItem?: string;

  gastosOperacion: number;
  valorAgregado: number;

  iva_tasa_nominal: number;
  it: number;
  iue: number;
  ganancia: number;
  margen_utilidad: number;
}
export type TipoReporteProyecto =
  | 'preciogeneral'
  | 'analisis'
  | 'materiales'
  | 'manoDeObra'
  | 'equipos';

export interface ReporteProyectoData {
  proyecto: {
    NombreProyecto: string;
    carga_social?: number;
    iva_efectiva?: number;
    herramientas?: number;
    gastos_generales?: number;
    iva_tasa_nominal?: number;
    margen_utilidad?: number;
  };

  modulos: Array<{ id: number; codigo?: string; nombre?: string }>;

  gastos: Array<{
    id: number;
    descripcion: string;
    unidad: string;
    cantidad: number;
    // puede venir number o {id}
    modulo: number | { id: number } | null | undefined;
    // opcional, si ya lo tienes calculado
    precio_unitario?: number;
    costo_parcial?: number;
    // si tienes gastosGenerales.total en tu UI nuevo, pásalo y úsalo en getTotalFinal
    gastosGenerales?: { total?: number };
  }>;

  materiales: any[];
  manoDeObra: any[];
  equipos: any[];
}
@Injectable({
  providedIn: 'root',
})
export class ReportesPdf {
  // ========================
  // FORMATOS / HELPERS
  // ========================
  
  // ===================== LITERAL (Bs) =====================
  private numeroLiteralBs(valor: number): string {
    const n = Number(valor) || 0;

    // 2 decimales exactos
    const red = this.redondear2(n);
    const entero = Math.floor(red);
    const cent = Math.round((red - entero) * 100);

    // Literal solo entero (sin "bolivianos")
    let literal = NumeroALetras.convertir(entero);
    if (!literal) literal = 'cero';

    // Capitaliza primera letra
    literal = literal.charAt(0).toUpperCase() + literal.slice(1);

    const centStr = cent.toString().padStart(2, '0');
    return `${literal} ${centStr}/100`;
  }
  private formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(valor) || 0);
  }
  private formatearNumero5(valor: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 5,
      maximumFractionDigits: 5,
    }).format(Number(valor) || 0);
  }
  private formatearNumero3(valor: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(Number(valor) || 0);
  }

  private redondear2(v: number): number {
    return Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
  }

  private redondear3(v: number): number {
    return Math.round((Number(v || 0) + Number.EPSILON) * 1000) / 1000;
  }
  private roundToTwo(num: number): number {
    return Math.round(Number(num || 0) * 100) / 100;
  }
  private safeText(s?: string): string {
    return (s || '').toString().trim();
  }
  private parseNumero(valor: any): number {
    if (valor === null || valor === undefined || valor === '') return 0;
    if (typeof valor === 'number') return valor;
    const texto = valor.toString().trim();
    const limpio =
      texto.includes(',') && texto.includes('.')
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto.replace(',', '.');
    return parseFloat(limpio) || 0;
  }
  private nombreArchivo(input: ReporteFinancieroInput): string {
    const base = 'reporte_financiero';
    if (input.origen === 'PROYECTO')
      return `${base}_proyecto_${input.id_proyecto}.pdf`;
    if (input.origen === 'MODULO')
      return `${base}_modulo_${input.id_modulo ?? 'x'}.pdf`;
    return `${base}_item_${input.id_item ?? 'x'}.pdf`;
  }
  // ===================== HELPERS GASTOS =====================
  private getModuloId(g: any): number {
    if (typeof g?.modulo === 'number') return Number(g.modulo);
    if (g?.modulo?.id != null) return Number(g.modulo.id);
    return -1;
  }

  private getTotalFinal(g: any): number {
    // si viene desde tu UI nuevo con gastosGenerales.total úsalo:
    const gg = g?.gastosGenerales?.total;
    if (gg != null) return Number(gg) || 0;

    // si no, cae a precio_unitario
    return Number(g?.precio_unitario) || 0;
  }

  private getPrecioTotalItem(g: any): number {
    const cantidad = Number(g?.cantidad) || 0;
    const unit = this.getTotalFinal(g);
    return this.redondear2(cantidad * unit);
  }
  // ====== ARITMÉTICA EXACTA (igual que tu componente) ======
  private toCents(valor: any): number {
    const n = this.parseNumero(valor);
    return Math.round((n + Number.EPSILON) * 100);
  }

  private fromCents(cents: number): number {
    return cents / 100;
  }

  // convierte 71.00% -> 7100 (basis points)
  private pctToBasisPoints(pct: any): number {
    const p = this.parseNumero(pct);
    return Math.round((p + Number.EPSILON) * 100);
  }

  // baseCents * bp / 10000 => centavos
  private applyPercentCents(baseCents: number, pct: any): number {
    const bp = this.pctToBasisPoints(pct);
    return Math.round((baseCents * bp) / 10000);
  }

  // redondeo final de subtotal: centavos -> bs
  private roundMoney(v: any): number {
    return this.fromCents(this.toCents(v));
  }

  // ===================== INYECTAR cantidad_item DESDE GASTOS =====================
  private withCantidadItem(data: ReporteProyectoData, rows: any[]): any[] {
    const map = new Map<number, number>(
      (data.gastos || []).map((g) => [Number(g.id), Number(g.cantidad) || 0]),
    );

    return (rows || []).map((r) => {
      // acepta todas las variantes posibles de id del gasto
      const idGo = Number(
        r?.id_gasto_operacion ??
          r?.gasto_operacion ??
          r?.gasto_operacion_id ??
          r?.gastoOperacion ??
          0,
      );

      const cantItem = map.get(idGo);

      return {
        ...r,
        id_gasto_operacion: idGo,     // normalizado para filtros
        cantidad_item: cantItem ?? 1, //  fallback 1 (NO 0)
      };
    });
  }
  // ===================== AGRUPACIONES =====================
  private agruparPorDescripcion(
    datos: any[],
    descripcionKey: string,
    cantidadKey: string,
    precioKey: string,
    cantidadItemKey: string = 'cantidad_item',
  ): any[] {
    const QTY_SCALE = 100000; // 5 decimales
    const mapa = new Map<
      string,
      { qtyMicro: number; totalCents: number; unidad?: string }
    >();

    (datos || []).forEach((item) => {
      const desc = (item?.[descripcionKey] || '').toString().toUpperCase().trim();
      if (!desc) return;

      const cantInsumo = this.parseNumero(item?.[cantidadKey]);        // cantidad del material/MO/equipo
      const cantItem = this.parseNumero(item?.[cantidadItemKey] ?? 1); // ✅ fallback 1
      const precio = this.parseNumero(item?.[precioKey]);              // precio unitario

      // cantidad real por fila = cantidad_insumo * cantidad_item
      const qtyReal = cantInsumo * cantItem;

      // qty a micro-unidades (5 decimales) para suma exacta
      const qtyMicro = Math.round((qtyReal + Number.EPSILON) * QTY_SCALE);

      // subtotal por fila redondeado a centavos
      const priceCents = this.toCents(precio);
      const subtotalCents = Math.round((qtyMicro * priceCents) / QTY_SCALE);

      const unidad = (item?.['unidad'] || '').toString();

      const prev = mapa.get(desc);
      if (prev) {
        prev.qtyMicro += qtyMicro;
        prev.totalCents += subtotalCents;
        if (!prev.unidad) prev.unidad = unidad;
      } else {
        mapa.set(desc, { qtyMicro, totalCents: subtotalCents, unidad });
      }
    });

    return Array.from(mapa.entries()).map(([descripcion, d]) => {
      const cantidad = d.qtyMicro / QTY_SCALE;    // cantidad total (5 decimales)
      const total = this.fromCents(d.totalCents); // total exacto en Bs (2 decimales)

      // precio unitario ponderado coherente con total
      const precio_unitario = cantidad ? this.redondear2(total / cantidad) : 0;

      return {
        descripcion,
        unidad: d.unidad || '',
        cantidad,
        precio_unitario,
        total: this.redondear2(total),
      };
    });
  }

  private filtrarPorModulo(
    data: ReporteProyectoData,
    datos: any[],
    moduloId: number | string,
  ): any[] {
    const mid = Number(moduloId);
    const ids = (data.gastos || [])
      .filter((g) => this.getModuloId(g) === mid)
      .map((g) => Number(g.id));
    return (datos || []).filter((d) =>
      ids.includes(Number(d.id_gasto_operacion)),
    );
  }

  private filtrarPorItem(datos: any[], itemId: number | string): any[] {
    const iid = Number(itemId);
    return (datos || []).filter((d) => Number(d.id_gasto_operacion) === iid);
  }

  // ===================== PDF SIMPLE (MATERIALES/MO/EQUIPOS) =====================
  private generarPDFSimple(
    data: ReporteProyectoData,
    titulo: string,
    datos: any[],
    subtitle?: string,
  ) {
    const rows = [...(datos || [])].sort((a, b) =>
      (a.descripcion || '').localeCompare(b.descripcion || ''),
    );
    const total = this.roundToTwo(
      rows.reduce((s, d) => s + (Number(d.total) || 0), 0),
    );

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const marginLeft = 30;
    const marginRight = 20;
    const marginTop = 20;
    const marginBottom = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const tituloTexto = `PRECIO DE ${titulo.toUpperCase()}`;
    doc.text(
      tituloTexto,
      (pageWidth - doc.getTextWidth(tituloTexto)) / 2,
      marginTop - 2,
    );

    let startY = marginTop + 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    doc.text('Proyecto:', marginLeft, startY);
    doc.setFont('helvetica', 'bold');

    const proyectoLineas = doc.splitTextToSize(
      (data.proyecto?.NombreProyecto || 'N/A').toUpperCase(),
      pageWidth - marginLeft - marginRight - 25,
    );
    proyectoLineas.forEach((l: string, i: number) => {
      doc.text(l, marginLeft + 25, startY + i * 4);
    });
    startY += proyectoLineas.length * 4 + 2;

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const subtitleLabel = subtitle.includes('Módulo:') ? 'Módulo:' : 'Ítem:';
      const subtitleValue = subtitle.replace(/^(Módulo:|Ítem:)\s*/, '');
      doc.text(subtitleLabel, marginLeft, startY);
      doc.setFont('helvetica', 'bold');
      doc.text(subtitleValue, marginLeft + 25, startY);
      startY += 6;
    }

    doc.setFont('helvetica', 'normal');
    doc.text('Moneda:', marginLeft, startY);
    doc.setFont('helvetica', 'bold');
    doc.text('Bolivianos', marginLeft + 25, startY);
    startY += 6;

    const tableWidthDisponible = pageWidth - marginLeft - marginRight;
    const colUnidad = 16;
    const colCantidad = 18;
    const colPrecio = 22;
    const colTotal = 22;
    const colDescripcion =
      tableWidthDisponible - (colUnidad + colCantidad + colPrecio + colTotal);

    const tableFontSize = rows.length > 45 ? 7 : rows.length > 30 ? 7.5 : 8;

    autoTable(doc, {
      startY,
      head: [
        [
          'Descripción',
          'Unidad',
          'Cantidad',
          'Precio Unitario',
          'Precio Total',
        ],
      ],
      body: [
        ...rows.map((d) => [
          d.descripcion,
          d.unidad || '',
          this.formatearNumero5(d.cantidad),
          this.formatearNumero(d.precio_unitario),
          this.formatearNumero(d.total),
        ]),
        [
          {
            content: 'PRECIO TOTAL',
            colSpan: 4,
            styles: { halign: 'right', fontStyle: 'bold' },
          },
          {
            content: this.formatearNumero(total),
            styles: { fontStyle: 'bold' },
          },
        ],
      ],
      theme: 'grid',
      pageBreak: 'auto',
      styles: {
        fontSize: tableFontSize,
        cellPadding: 2,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fontSize: tableFontSize,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: colDescripcion, overflow: 'linebreak' },
        1: { halign: 'center', cellWidth: colUnidad },
        2: { halign: 'right', cellWidth: colCantidad },
        3: { halign: 'right', cellWidth: colPrecio },
        4: { halign: 'right', cellWidth: colTotal },
      },
      margin: {
        left: marginLeft,
        right: marginRight,
        top: marginTop,
        bottom: marginBottom,
      },
    });

    doc.save(`${titulo.replace(/ /g, '_')}.pdf`);
  }

  // ===================== REPORTE: PRECIO GENERAL =====================
  private generarPDFTablaVista(data: ReporteProyectoData) {
    if (!(data.gastos || []).length) return;

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 30;
    const marginRight = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PRECIO GENERAL', pageWidth / 2, 12, { align: 'center' });

    const proyectoTexto = `PROYECTO: ${(data.proyecto?.NombreProyecto || '').toUpperCase()}`;
    doc.setFont('helvetica', 'normal');
    const baseFontSize = 8;
    doc.setFontSize(baseFontSize);

    let currentY = 18;
    const lineHeight = 5;
    const availableWidth = pageWidth - marginLeft - marginRight;

    let textWidth = doc.getTextWidth(proyectoTexto);
    if (textWidth <= availableWidth) {
      doc.text(proyectoTexto, pageWidth / 2, currentY, { align: 'center' });
      currentY += lineHeight;
    } else {
      const factor = availableWidth / textWidth;
      const newFontSize = Math.max(6, Math.floor(baseFontSize * factor));
      doc.setFontSize(newFontSize);
      textWidth = doc.getTextWidth(proyectoTexto);

      if (textWidth <= availableWidth) {
        doc.text(proyectoTexto, pageWidth / 2, currentY, { align: 'center' });
        currentY += lineHeight;
      } else {
        const ellipsis = '...';
        let truncated = proyectoTexto;
        while (
          truncated.length > 0 &&
          doc.getTextWidth(truncated + ellipsis) > availableWidth
        ) {
          truncated = truncated.slice(0, -1);
        }
        const finalText = truncated.length ? truncated + ellipsis : '';
        doc.text(finalText, pageWidth / 2, currentY, { align: 'center' });
        currentY += lineHeight;
      }
      doc.setFontSize(baseFontSize);
    }

    doc.text('Moneda: en Bolivianos', pageWidth / 2, currentY, { align: 'center' });
    currentY += lineHeight;

    const body: any[] = [];
    let contadorGlobal = 1;

    const modulosConGastos = (data.modulos || []).filter((m) =>
      (data.gastos || []).some((g) => this.getModuloId(g) === Number(m.id)),
    );

    modulosConGastos.forEach((m) => {
      const gastosModulo = (data.gastos || []).filter(
        (g) => this.getModuloId(g) === Number(m.id),
      );
      if (!gastosModulo.length) return;

      const subtotalModulo = this.roundToTwo(
        gastosModulo.reduce((sum, g) => sum + this.getPrecioTotalItem(g), 0),
      );

      const subtotalLiteral = this.numeroLiteralBs(subtotalModulo);

      //  7 columnas (Literal antes del Total)
      body.push([
        {
          content: `MÓDULO: ${(m.codigo || '').trim()} ${(m.nombre || '').trim()}`.trim(),
          colSpan: 5,
          styles: { fontStyle: 'bold', halign: 'left' },
        },
        {
          content: subtotalLiteral,
          styles: {
            halign: 'left',
            fontStyle: 'bold',
            overflow: 'linebreak', //  NO RECORTAR
          },
        },
        {
          content: this.formatearNumero(subtotalModulo),
          styles: { halign: 'right', fontStyle: 'bold' },
        },
      ]);

      gastosModulo.forEach((g) => {
        const precioUnit = this.getTotalFinal(g);
        const precioTotal = this.roundToTwo((Number(g.cantidad) || 0) * precioUnit);
        const literalItem = this.numeroLiteralBs(precioTotal);

        body.push([
          contadorGlobal++,
          g.descripcion,
          g.unidad,
          this.formatearNumero(Number(g.cantidad) || 0),
          this.formatearNumero(precioUnit),
          {
            content: literalItem,
            styles: {
              halign: 'left',
              overflow: 'linebreak', //  NO RECORTAR
            },
          },
          this.formatearNumero(precioTotal),
        ]);
      });
    });

    const totalProyecto = this.roundToTwo(
      (data.gastos || []).reduce((sum, g) => sum + this.getPrecioTotalItem(g), 0),
    );

    const totalProyectoLiteral = this.numeroLiteralBs(totalProyecto);

    //  7 columnas (Literal antes del Total)
    body.push([
      {
        content: 'PRECIO TOTAL DEL PROYECTO',
        colSpan: 5,
        styles: { halign: 'right', fontStyle: 'bold' },
      },
      {
        content: totalProyectoLiteral,
        styles: {
          halign: 'left',
          fontStyle: 'bold',
          overflow: 'linebreak', //  NO RECORTAR
        },
      },
      {
        content: this.formatearNumero(totalProyecto),
        styles: { halign: 'right', fontStyle: 'bold' },
      },
    ]);

    const totalTableWidth = pageWidth - marginLeft - marginRight;

    //  MÁS ANCHO PARA LITERAL
    const wItem = 12;
    const wUnidad = 16;
    const wCantidad = 18;
    const wUnitario = 30;
    const wLiteral = 70; //  antes 55 (muy poco)
    const wTotal = 22;

    const wDescripcion =
      totalTableWidth - (wItem + wUnidad + wCantidad + wUnitario + wLiteral + wTotal);

    autoTable(doc, {
      startY: currentY + 2,
      head: [
        [
          { content: 'Ítem', styles: { halign: 'center' } },
          { content: 'Descripción', styles: { halign: 'center' } },
          { content: 'Unidad', styles: { halign: 'center' } },
          { content: 'Cantidad', styles: { halign: 'center' } },
          { content: 'Precio Unitario (Numeral)', styles: { halign: 'center' } },
          { content: 'Precio Unitario (Literal)', styles: { halign: 'center' } },
          { content: 'Precio Total (Numeral)', styles: { halign: 'center' } },
        ],
      ],
      body,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        valign: 'middle',
        font: 'helvetica',
        overflow: 'linebreak', //  en general mejor que hidden (no corta)
      },
      headStyles: {
        fontSize: 8,
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: wItem, halign: 'center' }, // Ítem
        1: { cellWidth: wDescripcion, halign: 'left', overflow: 'linebreak' }, // Descripción
        2: { cellWidth: wUnidad, halign: 'center' }, // Unidad
        3: { cellWidth: wCantidad, halign: 'right' }, // Cantidad
        4: { cellWidth: wUnitario, halign: 'right' }, // Precio Unitario
        5: {
          cellWidth: wLiteral,
          halign: 'left',
          overflow: 'linebreak', //  Literal completo
        },
        6: { cellWidth: wTotal, halign: 'right' }, // Precio Total
      },
      margin: { left: marginLeft, right: marginRight },
    });

    doc.save('Reporte_Presupuesto_General.pdf');
  }

  // ===================== REPORTE: ANÁLISIS (APU) =====================
  private generarPDFPorItemsCompletos(data: ReporteProyectoData) {
    if (!(data.gastos || []).length) return;

    const doc = new jsPDF();
    const herramientas = Number(data.proyecto?.herramientas) || 0;

    data.gastos.forEach((gasto, indexGasto) => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginLeft = 30;
      const marginRight = 20;
      const marginTop = 20;
      const marginBottom = 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      const tituloTexto = 'ANÁLISIS DE PRECIO UNITARIO';
      doc.text(
        tituloTexto,
        (pageWidth - doc.getTextWidth(tituloTexto)) / 2,
        marginTop - 2,
      );

      doc.setFontSize(8);
      let startY = 25;
      const labelX = marginLeft;
      const valueX = marginLeft + 25;
      const lineSpacing = 4;

      // Proyecto (auto ajuste)
      doc.setFont('helvetica', 'normal');
      doc.text('Proyecto:', labelX, startY);
      doc.setFont('helvetica', 'bold');

      const availableWidth = pageWidth - valueX - marginRight;
      const proyectoLineas = doc.splitTextToSize(
        (data.proyecto?.NombreProyecto || '').toUpperCase(),
        availableWidth,
      );
      proyectoLineas.forEach((linea: string, i: number) => {
        doc.text(linea, valueX, startY + i * lineSpacing);
      });

      startY += lineSpacing * 2;

      // Item
      doc.setFont('helvetica', 'normal');
      doc.text('Actividad:', labelX, startY);
      doc.setFont('helvetica', 'bold');
      doc.text((gasto.descripcion || '').toUpperCase(), valueX, startY);

      startY += lineSpacing;
      doc.setFont('helvetica', 'normal');
      doc.text('Unidad:', labelX, startY);
      doc.setFont('helvetica', 'bold');
      doc.text((gasto.unidad || '').toUpperCase(), valueX, startY);

      startY += lineSpacing;
      doc.setFont('helvetica', 'normal');
      doc.text('Cantidad:', labelX, startY);
      doc.setFont('helvetica', 'bold');
      doc.text(
        this.formatearNumero(Number(gasto.cantidad) || 0),
        valueX,
        startY,
      );

      startY += lineSpacing;
      doc.setFont('helvetica', 'normal');
      doc.text('Moneda:', labelX, startY);
      doc.setFont('helvetica', 'bold');
      doc.text('Bolivianos', valueX, startY);

      startY += 5;

      const body: any[] = [];

      // -------- 1) MATERIALES --------
      const materialesPorItem = this.filtrarPorItem(data.materiales, gasto.id);
      let totalMateriales = 0;

      body.push([
        {
          content: '1.- MATERIALES',
          colSpan: 5,
          styles: { fontStyle: 'bold', halign: 'left' },
        },
      ]);

      if (materialesPorItem.length) {
        materialesPorItem.forEach((mat) => {
          const cantidad = this.parseNumero(mat.cantidad);
          const precioUnit = this.redondear2(
            this.parseNumero(mat.precio_unitario),
          );
          const total = this.redondear2(cantidad * precioUnit);

          body.push([
            mat.descripcion || '',
            mat.unidad || '',
            this.formatearNumero5(cantidad),
            this.formatearNumero(precioUnit),
            this.formatearNumero(total),
          ]);

          totalMateriales += total;
        });
      } else {
        body.push([
          '',
          '',
          this.formatearNumero5(0),
          this.formatearNumero(0),
          this.formatearNumero(0),
        ]);
      }

      body.push([
        {
          content: 'TOTAL MATERIALES',
          colSpan: 4,
          styles: { halign: 'right', fontStyle: 'bold' },
        },
        {
          content: this.formatearNumero(totalMateriales),
          styles: { fontStyle: 'bold' },
        },
      ]);

      // -------- 2) MANO DE OBRA --------
      const moPorItem = this.filtrarPorItem(data.manoDeObra, gasto.id);
      let totalManoObra = 0;

      body.push([
        {
          content: '2.- MANO DE OBRA',
          colSpan: 5,
          styles: { fontStyle: 'bold', halign: 'left' },
        },
      ]);

      if (moPorItem.length) {
        // 🔹 1) SUBTOTAL EXACTO (igual que componente)
        let subtotalBruto = 0;

        moPorItem.forEach((mo) => {
          const cantidad = this.parseNumero(mo.cantidad);
          const precioUnit = this.parseNumero(mo.precio_unitario);

          const totalFilaBruto = cantidad * precioUnit; // sin redondear aquí
          subtotalBruto += totalFilaBruto;

          body.push([
            mo.descripcion || '',
            mo.unidad || '',
            this.formatearNumero5(cantidad),
            this.formatearNumero(this.redondear2(precioUnit)), // solo visual
            this.formatearNumero(this.roundMoney(totalFilaBruto)), // visual 2 decimales
          ]);
        });

        // 🔹 Redondeo final del subtotal (centavos)
        const subtotalMO = this.roundMoney(subtotalBruto);

        body.push([
          {
            content: 'SUBTOTAL MANO DE OBRA',
            colSpan: 4,
            styles: { halign: 'right', fontStyle: 'bold' },
          },
          {
            content: this.formatearNumero(subtotalMO),
            styles: { fontStyle: 'bold' },
          },
        ]);

        const cargaSocial = this.parseNumero(data.proyecto?.carga_social);
        const ivaEfectiva = this.parseNumero(data.proyecto?.iva_efectiva);

        // 🔹 2) CARGAS SOCIALES EXACTAS (centavos)
        const subtotalCents = this.toCents(subtotalMO);
        const cargasCents = this.applyPercentCents(subtotalCents, cargaSocial);
        const cargas = this.fromCents(cargasCents);

        body.push([
          {
            content: 'CARGAS SOCIALES - % DEL SUBTOTAL DE MANO DE OBRA',
            colSpan: 3,
            styles: { halign: 'left' },
          },
          {
            content: `${this.formatearNumero(cargaSocial)}%`,
            styles: { halign: 'right' },
          },
          {
            content: this.formatearNumero(cargas),
            styles: { halign: 'right' },
          },
        ]);

        // 🔹 3) IVA EXACTO sobre (SUBTOTAL + CARGAS)
        const baseCents = subtotalCents + cargasCents;
        const ivaCents = this.applyPercentCents(baseCents, ivaEfectiva);
        const iva = this.fromCents(ivaCents);

        body.push([
          {
            content:
              'IMPUESTOS IVA - % (SUBTOTAL MANO DE OBRA + CARGAS SOCIALES)',
            colSpan: 3,
            styles: { halign: 'left' },
          },
          {
            content: `${this.formatearNumero(ivaEfectiva)}%`,
            styles: { halign: 'right' },
          },
          {
            content: this.formatearNumero(iva),
            styles: { halign: 'right' },
          },
        ]);

        // 🔹 4) TOTAL EXACTO
        const totalCents = subtotalCents + cargasCents + ivaCents;
        totalManoObra = this.fromCents(totalCents);
      } else {
        body.push([
          '',
          '',
          this.formatearNumero5(0),
          this.formatearNumero(0),
          this.formatearNumero(0),
        ]);
      }

      body.push([
        {
          content: 'TOTAL MANO DE OBRA',
          colSpan: 4,
          styles: { halign: 'right', fontStyle: 'bold' },
        },
        {
          content: this.formatearNumero(totalManoObra),
          styles: { fontStyle: 'bold' },
        },
      ]);

      // -------- 3) EQUIPO Y HERRAMIENTAS --------

      const equiposPorItem = (data.equipos || [])
        .filter(
          (eq) =>
            Number(eq.id_gasto_operacion) === Number(gasto.id) &&
            this.parseNumero(eq.cantidad) > 0,
        )
        .map((eq) => {
          const cantidad = this.parseNumero(eq.cantidad); // mantener precisión real
          const precioUnit = this.redondear2(
            this.parseNumero(eq.precio_unitario),
          ); // 2 decimales
          const total = this.redondear2(cantidad * precioUnit); // ✅ total por fila redondeado

          return {
            descripcion: (eq.descripcion || '').toString(),
            unidad: (eq.unidad || '').toString(),
            cantidad,
            precioUnit,
            total, // ✅ este es el que se muestra y el que se suma
          };
        });

      // ✅ Subtotal sumando los totales visibles (ya redondeados)
      const subtotalEquipos = this.redondear2(
        equiposPorItem.reduce((sum, e) => sum + (Number(e.total) || 0), 0),
      );

      const porcentajeHerramientas = this.redondear2(
        totalManoObra * (herramientas / 100),
      );

      const totalEquiposYHerramientas = this.redondear2(
        subtotalEquipos + porcentajeHerramientas,
      );

      body.push([
        {
          content: '3.- EQUIPO Y HERRAMIENTAS',
          colSpan: 5,
          styles: { fontStyle: 'bold', halign: 'left' },
        },
      ]);

      if (equiposPorItem.length) {
        equiposPorItem.forEach((e) => {
          body.push([
            e.descripcion,
            e.unidad,
            this.formatearNumero5(e.cantidad), // 5 decimales (cantidad)
            this.formatearNumero(e.precioUnit), // 2 decimales
            this.formatearNumero(e.total), // 2 decimales (total por fila)
          ]);
        });
      } else {
        body.push([
          '',
          '',
          this.formatearNumero5(0),
          this.formatearNumero(0),
          this.formatearNumero(0),
        ]);
      }

      body.push([
        {
          content: 'HERRAMIENTAS - % DEL TOTAL DE LA MANO DE OBRA',
          colSpan: 3,
          styles: { halign: 'left' },
        },
        {
          content: `${this.formatearNumero(herramientas)}%`,
          styles: { halign: 'right' },
        },
        {
          content: this.formatearNumero(porcentajeHerramientas),
          styles: { halign: 'right' },
        },
      ]);

      body.push([
        {
          content: 'TOTAL EQUIPO Y HERRAMIENTAS',
          colSpan: 4,
          styles: { halign: 'right', fontStyle: 'bold' },
        },
        {
          content: this.formatearNumero(totalEquiposYHerramientas),
          styles: { fontStyle: 'bold' },
        },
      ]);

      // -------- 4) GASTOS GENERALES --------
      const gastosGeneralesPct = Number(data.proyecto?.gastos_generales) || 0;
      const subtotalPrevio =
        totalMateriales + totalManoObra + totalEquiposYHerramientas;
      const totalGastosGenerales = this.redondear2(
        subtotalPrevio * (gastosGeneralesPct / 100),
      );

      body.push([
        {
          content: '4.- GASTOS GENERALES Y ADMINISTRATIVOS',
          colSpan: 5,
          styles: { fontStyle: 'bold', halign: 'left' },
        },
      ]);
      body.push([
        {
          content: 'GASTOS GENERALES Y ADMINISTRATIVOS - % DE 1+2+3',
          colSpan: 3,
          styles: { halign: 'left' },
        },
        {
          content: `${this.formatearNumero(gastosGeneralesPct)}%`,
          styles: { halign: 'right' },
        },
        {
          content: this.formatearNumero(totalGastosGenerales),
          styles: { halign: 'right' },
        },
      ]);
      body.push([
        {
          content: 'TOTAL GASTOS GENERALES Y ADMINISTRATIVOS',
          colSpan: 4,
          styles: { halign: 'right', fontStyle: 'bold' },
        },
        {
          content: this.formatearNumero(totalGastosGenerales),
          styles: { fontStyle: 'bold' },
        },
      ]);

      // -------- 5) VALOR AGREGADO --------
      const ivaNominal = Number(data.proyecto?.iva_tasa_nominal) || 0;
      const margenUtilidad = Number(data.proyecto?.margen_utilidad) || 0;

      const suma1234 = this.redondear2(subtotalPrevio + totalGastosGenerales);
      const base = 100 - ivaNominal;

      const valorAgregado = this.redondear2(
        suma1234 * (margenUtilidad / (base - margenUtilidad)),
      );
      const totalUnitario = this.redondear2(suma1234 + valorAgregado);

      body.push([
        {
          content: '5.- VALOR AGREGADO',
          colSpan: 5,
          styles: { fontStyle: 'bold', halign: 'left' },
        },
      ]);
      body.push([
        {
          content: 'MARGEN DE UTILIDAD',
          colSpan: 3,
          styles: { halign: 'left' },
        },
        {
          content: `${this.formatearNumero(margenUtilidad)}%`,
          styles: { halign: 'right' },
        },
        {
          content: this.formatearNumero(valorAgregado),
          styles: { halign: 'right' },
        },
      ]);
      body.push([
        {
          content: 'TOTAL VALOR AGREGADO',
          colSpan: 4,
          styles: { halign: 'right', fontStyle: 'bold' },
        },
        {
          content: this.formatearNumero(valorAgregado),
          styles: { fontStyle: 'bold' },
        },
      ]);
      body.push([
        {
          content: 'TOTAL PRECIO UNITARIO (1+2+3+4+5)',
          colSpan: 4,
          styles: { halign: 'right', fontStyle: 'bold' },
        },
        {
          content: this.formatearNumero(totalUnitario),
          styles: { fontStyle: 'bold' },
        },
      ]);

      const tableFontSize = body.length > 45 ? 7 : body.length > 35 ? 7.5 : 8;
      const espacioMinimoTabla = 35;
      if (startY + espacioMinimoTabla > pageHeight - marginBottom) {
        doc.addPage();
        startY = marginTop;
      }

      autoTable(doc, {
        startY,
        head: [
          [
            'Descripción',
            'Unidad',
            'Cantidad',
            'Precio Unitario',
            'Precio Total',
          ],
        ],
        body,
        theme: 'grid',
        pageBreak: 'auto',
        styles: {
          fontSize: tableFontSize,
          cellPadding: 2,
          overflow: 'hidden',
          valign: 'middle',
        },
        headStyles: {
          fontSize: tableFontSize,
          fontStyle: 'bold',
          textColor: [0, 0, 0],
          fillColor: [255, 255, 255],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 70, overflow: 'hidden' },
          1: { halign: 'center', cellWidth: 18 },
          2: { halign: 'right', cellWidth: 22 },
          3: { halign: 'right', cellWidth: 25 },
          4: { halign: 'right', cellWidth: 25 },
        },
        margin: { left: marginLeft, right: marginLeft },
      });

      if (indexGasto < data.gastos.length - 1) doc.addPage();
    });

    doc.save('Reporte_Analisis_de_Precio_Unitario.pdf');
  }

  // ===================== API PÚBLICA =====================
  generarReporteProyecto(
    tipo: TipoReporteProyecto,
    data: ReporteProyectoData,
  ): void {
    switch (tipo) {
      case 'materiales': {
        const rows = this.withCantidadItem(data, data.materiales);
        const d = this.agruparPorDescripcion(rows, 'descripcion', 'cantidad', 'precio_unitario');
        this.generarPDFSimple(data, 'Materiales', d);
        return;
      }
      case 'manoDeObra': {
        const rows = this.withCantidadItem(data, data.manoDeObra);
        const d = this.agruparPorDescripcion(rows, 'descripcion', 'cantidad', 'precio_unitario');
        this.generarPDFSimple(data, 'Mano de Obra', d);
        return;
      }
      case 'equipos': {
        const rows = this.withCantidadItem(data, data.equipos);
        const d = this.agruparPorDescripcion(rows, 'descripcion', 'cantidad', 'precio_unitario');
        this.generarPDFSimple(data, 'Equipo y Herramientas', d);
        return;
      }
      case 'analisis':
        this.generarPDFPorItemsCompletos(data);
        return;

      case 'preciogeneral':
        this.generarPDFTablaVista(data);
        return;
    }
  }

  generarReporteModulo(
    tipo: 'materiales' | 'manoDeObra' | 'equipos',
    data: ReporteProyectoData,
    moduloId: number,
  ): void {
    let datos: any[] = [];
    let titulo = '';
    let tipoNombre = '';

    switch (tipo) {
      case 'materiales':
        datos = this.filtrarPorModulo(data, data.materiales, moduloId);
        titulo = 'MATERIALES POR MODULO';
        tipoNombre = 'materiales';
        break;
      case 'manoDeObra':
        datos = this.filtrarPorModulo(data, data.manoDeObra, moduloId);
        titulo = 'MANO DE OBRA POR MODULO';
        tipoNombre = 'mano de obra';
        break;
      case 'equipos':
        datos = this.filtrarPorModulo(data, data.equipos, moduloId);
        titulo = 'EQUIPO Y HERRAMIENTAS POR MODULO';
        tipoNombre = 'equipos';
        break;
    }

    if (!datos.length) {
      throw new Error(`No hay ${tipoNombre} para este módulo.`);
    }

    //  clave: inyectar cantidad_item desde GastoOperacion
    datos = this.withCantidadItem(data, datos);

    const datosAgrupados = this.agruparPorDescripcion(
      datos,
      'descripcion',
      'cantidad',
      'precio_unitario',
    );

    const moduloActual = (data.modulos || []).find(
      (m) => Number(m.id) === Number(moduloId),
    );
    const subtitle = moduloActual
      ? `Módulo: ${(moduloActual.codigo || '').trim()} ${(moduloActual.nombre || '').trim()}`.trim()
      : '';

    this.generarPDFSimple(data, titulo, datosAgrupados, subtitle);
  }

  generarReporteItem(
    tipo: 'materiales' | 'manoDeObra' | 'equipos',
    data: ReporteProyectoData,
    itemId: number,
  ): void {
    let datos: any[] = [];
    let titulo = '';
    let tipoNombre = '';

    switch (tipo) {
      case 'materiales':
        datos = this.filtrarPorItem(data.materiales, itemId);
        titulo = 'MATERIALES POR ITEM';
        tipoNombre = 'materiales';
        break;
      case 'manoDeObra':
        datos = this.filtrarPorItem(data.manoDeObra, itemId);
        titulo = 'MANO DE OBRA POR ITEM';
        tipoNombre = 'mano de obra';
        break;
      case 'equipos':
        datos = this.filtrarPorItem(data.equipos, itemId);
        titulo = 'EQUIPO Y HERRAMIENTAS POR ITEM';
        tipoNombre = 'equipos';
        break;
    }

    if (!datos.length) {
      throw new Error(`No hay ${tipoNombre} para este ítem.`);
    }

    //  clave: inyectar cantidad_item desde GastoOperacion
    datos = this.withCantidadItem(data, datos);

    const datosAgrupados = this.agruparPorDescripcion(
      datos,
      'descripcion',
      'cantidad',
      'precio_unitario',
    );

    const gastoActual = (data.gastos || []).find(
      (g) => Number(g.id) === Number(itemId),
    );
    const subtitle = gastoActual ? `Ítem: ${gastoActual.descripcion}` : '';

    this.generarPDFSimple(data, titulo, datosAgrupados, subtitle);
  }

  // ========================
  // REPORTE FINANCIERO
  // ========================
  generarReporteFinanciero(input: ReporteFinancieroInput): void {
    const doc = new jsPDF();

    // Márgenes
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 30;
    const marginRight = 20;
    const marginTop = 20;

    // ========= Helpers dinero exacto (centavos) =========
    const toCents = (v: any) => Math.round((Number(v || 0) + Number.EPSILON) * 100);
    const fromCents = (c: number) => c / 100;

    // % a basis points (2 decimales de %): 13 => 1300
    const pctToBp = (pct: any) => Math.round((Number(pct || 0) + Number.EPSILON) * 100);
    // baseCents * bp / 10000 => centavos (redondeo real)
    const applyPctCents = (baseCents: number, pct: any) => {
      const bp = pctToBp(pct);
      return Math.round((baseCents * bp) / 10000);
    };

    // ========= Datos base =========
    const gastosOperacionC = toCents(input.gastosOperacion);
    const valorAgregadoC = toCents(input.valorAgregado);

    const ivaNominal = Number(input.iva_tasa_nominal) || 0;
    const itPct = Number(input.it) || 0;
    const iuePct = Number(input.iue) || 0;

    // ganancia “motor”
    const gananciaPct = Math.max(0, Math.min(100, Number(input.ganancia) || 0));
    const compensacionPctUtilidad = this.redondear2(100 - gananciaPct);

    // ========================
    // SECCIÓN 1 (exacto)
    // credito fiscal = gastosOperacion * IVA nominal
    // ========================
    const creditoFiscalC = applyPctCents(gastosOperacionC, ivaNominal);
    const costoVentaC = gastosOperacionC - creditoFiscalC;

    // ========================
    // SECCIÓN 3 (exacto)
    // precioFactura = gastos + valorAgregado
    // porcentajes de composición
    // ========================
    const precioFactura3C = gastosOperacionC + valorAgregadoC;

    const precioFactura3 = fromCents(precioFactura3C);
    const gastosOperacion = fromCents(gastosOperacionC);
    const valorAgregado = fromCents(valorAgregadoC);
    const creditoFiscal = fromCents(creditoFiscalC);
    const costoVenta = fromCents(costoVentaC);

    const gastoOperacion31 =
      precioFactura3C > 0 ? this.redondear2((gastosOperacionC * 100) / precioFactura3C) : 0;

    const valorAgregado31 =
      precioFactura3C > 0 ? this.redondear2((valorAgregadoC * 100) / precioFactura3C) : 0;

    //  Ajuste para que % sume 100.00 exacto (por redondeos)
    const precioFactura31 = this.redondear2(100 - (gastoOperacion31 + valorAgregado31)) + gastoOperacion31 + valorAgregado31;

    // ========================
    // SECCIÓN 4 (exacto)
    // iva sobre precio factura
    // margen utilidad = PF - costo venta - IVA
    // ========================
    const iva13C = applyPctCents(precioFactura3C, ivaNominal);
    const margenUtilidadC = precioFactura3C - costoVentaC - iva13C;

    const iva13 = fromCents(iva13C);
    const margenUtilidad = fromCents(margenUtilidadC);
    const costoVenta4 = fromCents(costoVentaC);

    // ========================
    // SECCIÓN 5 (exacto)
    // impuestoIva = valorAgregado * IVA
    // IT = PF * IT
    // utilidadBruta = VA - IVA(VA) - IT(PF)
    // IUE = utilidadBruta * IUE
    // ========================
    const impuestoIva5C = applyPctCents(valorAgregadoC, ivaNominal);
    const itefactura5C = applyPctCents(precioFactura3C, itPct);

    const utilidadBruta5C = valorAgregadoC - impuestoIva5C - itefactura5C;

    //  Si por algún caso utilidad queda negativa, se mantiene (depende tu negocio)
    const iueUtilidad5C = applyPctCents(utilidadBruta5C, iuePct);

    const totalImpuestos5C = impuestoIva5C + itefactura5C + iueUtilidad5C;
    const totalUtilidadNetaC = utilidadBruta5C - iueUtilidad5C;

    const impuestoIva5 = fromCents(impuestoIva5C);
    const itefactura5 = fromCents(itefactura5C);
    const iueUtilidad5 = fromCents(iueUtilidad5C);
    const totalImpuestos5 = fromCents(totalImpuestos5C);
    const totalUtilidadNeta = fromCents(totalUtilidadNetaC);

    // ========================
    // SECCIÓN 6 – Ganancia como motor (exacto)
    // Ganancia = utilidad neta * gananciaPct
    // Compensación = utilidad neta - ganancia
    // Precio factura = gastos + impuestos + utilidad neta
    // ========================
    const gananciaCol1C = applyPctCents(totalUtilidadNetaC, gananciaPct);
    const compensacionDuenoCol1C = totalUtilidadNetaC - gananciaCol1C;

    const impuestosCol1C = totalImpuestos5C;

    //  PF = gastos + impuestos + utilidad neta (NO sumes ganancia+comp por separado, ya están dentro de utilidad neta)
    const precioFacturaCol1C = gastosOperacionC + impuestosCol1C + totalUtilidadNetaC;

    const gananciaCol1 = fromCents(gananciaCol1C);
    const compensacionDuenoCol1 = fromCents(compensacionDuenoCol1C);
    const impuestosCol1 = fromCents(impuestosCol1C);
    const gastosOperacionCol1 = fromCents(gastosOperacionC);
    const precioFacturaCol1 = fromCents(precioFacturaCol1C);

    const gananciaCol2 = precioFacturaCol1C > 0 ? (gananciaCol1C * 100) / precioFacturaCol1C : 0;
    const compensacionDuenoCol2 = precioFacturaCol1C > 0 ? (compensacionDuenoCol1C * 100) / precioFacturaCol1C : 0;
    const impuestosCol2 = precioFacturaCol1C > 0 ? (impuestosCol1C * 100) / precioFacturaCol1C : 0;
    const gastosOperacionCol2 = precioFacturaCol1C > 0 ? (gastosOperacionC * 100) / precioFacturaCol1C : 0;

    //  Ajuste exacto para que % sume 100.000 (3 decimales)
    const toMil = (v: number) => Math.round((Number(v || 0) + Number.EPSILON) * 1000);
    const fromMil = (m: number) => m / 1000;

    const ganMil6 = toMil(gananciaCol2);
    const compMil6 = toMil(compensacionDuenoCol2);
    const impMil6 = toMil(impuestosCol2);
    const goMil6 = toMil(gastosOperacionCol2);

    const pfMil6 = 100000; // 100.000%
    const ajusteGoMil6 = pfMil6 - (ganMil6 + compMil6 + impMil6); // lo que falte se lo damos a GO
    const gastosOperacionCol2Fix = fromMil(ajusteGoMil6);

    const precioFacturaCol2 = 100; // 100%

    // ========================
    // SECCIÓN 7 (rentabilidad) 3 decimales, suma exacta
    // ========================
    let rentabilidadProyecto7 = 0;
    let rentabilidadGanancia7 = 0;
    let rentabilidadCompDueno7 = 0;
    let rentabilidadImpuestos7 = 0;

    if (gastosOperacionC > 0) {
      const proyectoMil = toMil((valorAgregadoC * 100) / gastosOperacionC);
      const ganMil = toMil((gananciaCol1C * 100) / gastosOperacionC);
      const compMil = toMil((compensacionDuenoCol1C * 100) / gastosOperacionC);

      //  impuestos = proyecto - gan - comp (exacto)
      const impMil = proyectoMil - ganMil - compMil;

      rentabilidadProyecto7 = fromMil(proyectoMil);
      rentabilidadGanancia7 = fromMil(ganMil);
      rentabilidadCompDueno7 = fromMil(compMil);
      rentabilidadImpuestos7 = fromMil(impMil);
    }

    // ========================
    // SECCIÓN 8 (retorno) exacto
    // retorno = gastosOperacion / ganancia
    // ========================
    const retornoInversion8 =
      gananciaCol1C !== 0 ? this.redondear2(gastosOperacionC / gananciaCol1C) : 0;

    // ========================
    // PDF: TÍTULO + ENCABEZADO
    // ========================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titulo = 'REPORTE FINANCIERO';
    doc.text(titulo, (pageWidth - doc.getTextWidth(titulo)) / 2, marginTop);

    doc.setFontSize(9);
    let startY = marginTop + 8;

    const labelX = marginLeft;
    const valueX = marginLeft + 22;
    const lineHeight = 3;
    const availableWidth = pageWidth - valueX - marginRight;

    // Proyecto
    doc.setFont('helvetica', 'normal');
    doc.text('Proyecto:', labelX, startY);

    doc.setFont('helvetica', 'bold');
    const proyectoLineas = doc.splitTextToSize(
      this.safeText(input.nombreProyecto),
      availableWidth,
    );
    proyectoLineas.forEach((linea: string, i: number) => {
      doc.text(linea, valueX, startY + i * lineHeight);
    });
    startY += proyectoLineas.length * lineHeight + 4;

    // Item / Módulo
    if (input.origen === 'ITEM') {
      doc.setFont('helvetica', 'normal');
      doc.text('Ítem:', labelX, startY);

      doc.setFont('helvetica', 'bold');
      const itemLineas = doc.splitTextToSize(
        this.safeText(input.descripcionItem),
        availableWidth,
      );
      itemLineas.forEach((linea: string, i: number) => {
        doc.text(linea, valueX, startY + i * lineHeight);
      });
      startY += itemLineas.length * lineHeight + 4;
    } else if (input.origen === 'MODULO') {
      doc.setFont('helvetica', 'normal');
      doc.text('Módulo:', labelX, startY);

      doc.setFont('helvetica', 'bold');
      const moduloLineas = doc.splitTextToSize(
        this.safeText(input.nombreModulo),
        availableWidth,
      );
      moduloLineas.forEach((linea: string, i: number) => {
        doc.text(linea, valueX, startY + i * lineHeight);
      });
      startY += moduloLineas.length * lineHeight + 4;
    }

    startY += 5;

    // ========================
    // SECCIÓN 1
    // ========================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('1.- GASTOS DE OPERACIÓN Y COSTO DE VENTA', marginLeft, startY);
    startY += 5;

    autoTable(doc, {
      startY,
      head: [['DESCRIPCION', 'MONTO (Bs)']],
      body: [
        ['GASTOS DE OPERACIÓN', this.formatearNumero(gastosOperacion)],
        [
          `CREDITO FISCAL IVA TASA NOMINAL: (${this.formatearNumero(ivaNominal)}%)`,
          `-${this.formatearNumero(creditoFiscal)}`,
        ],
        ['COSTO DE VENTA', this.formatearNumero(costoVenta)],
      ],
      theme: 'grid',
      pageBreak: 'auto',
      styles: { fontSize: 7, cellPadding: 2, overflow: 'hidden', valign: 'middle' },
      headStyles: {
        fontSize: 7, fontStyle: 'bold', fillColor: [255,255,255], textColor: [0,0,0],
        lineWidth: 0.1, halign: 'center',
      },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 20, halign: 'right' } },
      margin: { left: marginLeft, right: marginRight },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;

    // ========================
    // SECCIÓN 2
    // ========================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('2.- VALOR AGREGADO', marginLeft, startY);
    startY += 5;

    autoTable(doc, {
      startY,
      head: [['DESCRIPCION', 'MONTO (Bs)']],
      body: [['VALOR AGREGADO', this.formatearNumero(valorAgregado)]],
      theme: 'grid',
      pageBreak: 'auto',
      styles: { fontSize: 7, cellPadding: 2, overflow: 'hidden', valign: 'middle' },
      headStyles: {
        fontSize: 7, fontStyle: 'bold', fillColor: [255,255,255], textColor: [0,0,0],
        lineWidth: 0.1, halign: 'center',
      },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 20, halign: 'right' } },
      margin: { left: marginLeft, right: marginRight },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;

    // ========================
    // SECCIÓN 3
    // ========================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('3.- PRECIO FACTURA - METODO MALLA FINITA', marginLeft, startY);
    startY += 5;

    autoTable(doc, {
      startY,
      head: [['DESCRIPCION', 'MONTO (Bs)', '%']],
      body: [
        ['GASTOS DE OPERACIÓN', this.formatearNumero(gastosOperacion), `${this.formatearNumero(gastoOperacion31)}%`],
        ['VALOR AGREGADO', this.formatearNumero(valorAgregado), `${this.formatearNumero(valorAgregado31)}%`],
        ['PRECIO FACTURA', this.formatearNumero(precioFactura3), `${this.formatearNumero(precioFactura31)}%`],
      ],
      theme: 'grid',
      pageBreak: 'auto',
      styles: { fontSize: 7, cellPadding: 2, overflow: 'hidden', valign: 'middle' },
      headStyles: {
        fontSize: 7, fontStyle: 'bold', fillColor: [255,255,255], textColor: [0,0,0],
        lineWidth: 0.1, halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 25, halign: 'right' },
      },
      margin: { left: marginLeft, right: marginRight },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;

    // ========================
    // SECCIÓN 4
    // ========================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('4.- FISCALIZACION POR IMPUESTOS INTERNOS', marginLeft, startY);
    startY += 5;

    autoTable(doc, {
      startY,
      head: [['DESCRIPCION', 'MONTO (Bs)']],
      body: [
        ['COSTO DE VENTA', this.formatearNumero(costoVenta4)],
        ['MARGEN DE UTILIDAD', this.formatearNumero(margenUtilidad)],
        [`IVA ${this.formatearNumero(ivaNominal)}% DE PRECIO FACTURA`, this.formatearNumero(iva13)],
        ['PRECIO FACTURA', this.formatearNumero(precioFactura3)],
      ],
      theme: 'grid',
      pageBreak: 'auto',
      styles: { fontSize: 7, cellPadding: 2, overflow: 'hidden', valign: 'middle' },
      headStyles: {
        fontSize: 7, fontStyle: 'bold', fillColor: [255,255,255], textColor: [0,0,0],
        lineWidth: 0.1, halign: 'center',
      },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 20, halign: 'right' } },
      margin: { left: marginLeft, right: marginRight },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;

    // ========================
    // SECCIÓN 5
    // ========================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('5.- ESTADO DE RESULTADOS', marginLeft, startY);
    startY += 5;

    autoTable(doc, {
      startY,
      head: [['DESCRIPCION', 'MONTO (Bs)']],
      body: [
        ['PRECIO FACTURA', this.formatearNumero(precioFactura3)],
        ['GASTOS DE OPERACIÓN', `-${this.formatearNumero(gastosOperacion)}`],
        ['VALOR AGREGADO', this.formatearNumero(valorAgregado)],
        [`IMPUESTO IVA ${this.formatearNumero(ivaNominal)}%`, this.formatearNumero(impuestoIva5)],
        [`IT ${this.formatearNumero(itPct)}% DE LA FACTURA`, this.formatearNumero(itefactura5)],
        [`IUE ${this.formatearNumero(iuePct)}% UTILIDAD`, this.formatearNumero(iueUtilidad5)],
        ['TOTAL IMPUESTOS', this.formatearNumero(fromCents(totalImpuestos5C))],
        ['TOTAL UTILIDAD NETA (100%)', this.formatearNumero(fromCents(totalUtilidadNetaC))],
      ],
      theme: 'grid',
      pageBreak: 'auto',
      styles: { fontSize: 7, cellPadding: 2, overflow: 'hidden', valign: 'middle' },
      headStyles: {
        fontSize: 7, fontStyle: 'bold', fillColor: [255,255,255], textColor: [0,0,0],
        lineWidth: 0.1, halign: 'center',
      },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 20, halign: 'right' } },
      margin: { left: marginLeft, right: marginRight },
    });

    // NUEVA PÁGINA
    doc.addPage();
    startY = marginTop;

    // ========================
    // SECCIÓN 6
    // ========================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('6.- LA GANANCIA COMO MOTOR DEL NEGOCIO', marginLeft, startY);
    startY += 5;

    autoTable(doc, {
      startY,
      head: [['DESCRIPCION', 'GANANCIAS NETAS (Bs)', '%', 'IDEAL']],
      body: [
        [
          `GANANCIA (${this.redondear2(gananciaPct)}%)`,
          this.formatearNumero3(this.redondear3(gananciaCol1)),
          `${fromMil(ganMil6).toFixed(3)}%`,
          '10%',
        ],
        [
          `COMPENSACION DEL DUEÑO (${this.redondear2(compensacionPctUtilidad)}%)`,
          this.formatearNumero3(this.redondear3(compensacionDuenoCol1)),
          `${fromMil(compMil6).toFixed(3)}%`,
          '10%',
        ],
        [
          'IMPUESTOS',
          this.formatearNumero(impuestosCol1),
          `${fromMil(impMil6).toFixed(3)}%`,
          '15%',
        ],
        [
          'GASTOS DE OPERACIÓN',
          this.formatearNumero(gastosOperacionCol1),
          `${this.redondear3(gastosOperacionCol2Fix).toFixed(3)}%`,
          '65%',
        ],
        [
          'PRECIO FACTURA',
          this.formatearNumero(precioFacturaCol1),
          `${this.formatearNumero(precioFacturaCol2)}%`,
          '100%',
        ],
      ],
      theme: 'grid',
      pageBreak: 'auto',
      styles: { fontSize: 7, cellPadding: 2, overflow: 'hidden', valign: 'middle' },
      headStyles: {
        fontSize: 7, fontStyle: 'bold', fillColor: [255,255,255], textColor: [0,0,0],
        lineWidth: 0.1, halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 20, halign: 'center' },
      },
      margin: { left: marginLeft, right: marginRight },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;

    // ========================
    // SECCIÓN 7
    // ========================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('7.- RENTABILIDAD', marginLeft, startY);
    startY += 5;

    autoTable(doc, {
      startY,
      head: [['DESCRIPCION', 'PORCENTAJE']],
      body: [
        ['RENTABILIDAD (PROYECTO)', `${this.formatearNumero(rentabilidadProyecto7)}%`],
        ['RENTABILIDAD (GANANCIA)', `${this.formatearNumero3(rentabilidadGanancia7)}%`],
        ['RENTABILIDAD (COMPENSACIÓN DEL DUEÑO)', `${this.formatearNumero3(rentabilidadCompDueno7)}%`],
        ['RENTABILIDAD (IMPUESTOS)', `${this.formatearNumero(rentabilidadImpuestos7)}%`],
      ],
      theme: 'grid',
      pageBreak: 'auto',
      styles: { fontSize: 7, cellPadding: 2, overflow: 'hidden', valign: 'middle' },
      headStyles: {
        fontSize: 7, fontStyle: 'bold', fillColor: [255,255,255], textColor: [0,0,0],
        lineWidth: 0.1, halign: 'center',
      },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 25, halign: 'right' } },
      margin: { left: marginLeft, right: marginRight },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;

    // ========================
    // SECCIÓN 8
    // ========================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('8.- RETORNO DE GASTOS DE OPERACIÓN', marginLeft, startY);
    startY += 5;

    autoTable(doc, {
      startY,
      head: [['DESCRIPCION', 'VALOR']],
      body: [['RETORNO', this.formatearNumero(retornoInversion8)]],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
      headStyles: {
        fontSize: 7, fontStyle: 'bold', fillColor: [255,255,255], textColor: [0,0,0],
        halign: 'center',
      },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 20, halign: 'right' } },
      margin: { left: marginLeft, right: marginRight },
    });

    // GUARDAR
    doc.save(this.nombreArchivo(input));
  }
}
