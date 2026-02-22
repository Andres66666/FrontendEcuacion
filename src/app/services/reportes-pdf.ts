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

  // ===================== AGRUPACIONES =====================
  private agruparPorDescripcion(
    datos: any[],
    descripcionKey: string,
    cantidadKey: string,
    precioKey: string,
    cantidadItemKey: string = 'cantidad_item',
  ): any[] {
    const mapa = new Map<
      string,
      { cantidad: number; totalExacto: number; unidad?: string }
    >();

    (datos || []).forEach((item) => {
      const desc = (item?.[descripcionKey] || '')
        .toString()
        .toUpperCase()
        .trim();
      if (!desc) return;

      const cantMaterial = this.parseNumero(item?.[cantidadKey]);
      const precio = this.parseNumero(item?.[precioKey]);
      const cantItem = this.parseNumero(item?.[cantidadItemKey] ?? 1);

      const cantidadReal = cantMaterial * cantItem;
      const subtotalExacto = cantidadReal * precio;

      if (mapa.has(desc)) {
        const e = mapa.get(desc)!;
        e.cantidad += cantidadReal;
        e.totalExacto += subtotalExacto;
      } else {
        mapa.set(desc, {
          cantidad: cantidadReal,
          totalExacto: subtotalExacto,
          unidad: (item?.['unidad'] || '').toString(),
        });
      }
    });

    return Array.from(mapa.entries()).map(([descripcion, d]) => {
      const totalRedondeado = this.redondear2(d.totalExacto);
      const cantidad = d.cantidad;

      return {
        descripcion,
        cantidad, // se mostrará con 5 decimales
        // precio_unitario “promedio” coherente con el total mostrado:
        precio_unitario: cantidad
          ? this.redondear2(totalRedondeado / cantidad)
          : 0,
        unidad: d.unidad || '',
        total: totalRedondeado,
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

    doc.text('Moneda: en Bolivianos', pageWidth / 2, currentY, {
      align: 'center',
    });
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

      body.push([
        {
          content: `MÓDULO: ${(m.codigo || '').trim()} ${(m.nombre || '').trim()}`.trim(),
          colSpan: 5,
          styles: { fontStyle: 'bold', halign: 'left' },
        },
        {
          content: this.formatearNumero(subtotalModulo),
          styles: { halign: 'right', fontStyle: 'bold' },
        },
        {
          content: subtotalLiteral, 
          styles: { halign: 'left', fontStyle: 'bold' },
        },
      ]);
      gastosModulo.forEach((g) => {
        const precioUnit = this.getTotalFinal(g);
        const precioTotal = this.roundToTwo(
          (Number(g.cantidad) || 0) * precioUnit,
        );

        
        const literalItem = this.numeroLiteralBs(precioTotal);

        body.push([
          contadorGlobal++,
          g.descripcion,
          g.unidad,
          this.formatearNumero(Number(g.cantidad) || 0),
          this.formatearNumero(precioUnit),
          this.formatearNumero(precioTotal),
          literalItem, 
        ]);
      });
    });

    const totalProyecto = this.roundToTwo(
      (data.gastos || []).reduce(
        (sum, g) => sum + this.getPrecioTotalItem(g),
        0,
      ),
    );

    const totalProyectoLiteral = this.numeroLiteralBs(totalProyecto);

   body.push([
  {
    content: 'PRECIO TOTAL DEL PROYECTO',
    colSpan: 5, 
    styles: { halign: 'right', fontStyle: 'bold' },
  },
  {
    content: this.formatearNumero(totalProyecto), 
    styles: { halign: 'right', fontStyle: 'bold' },
  },
  {
    content: totalProyectoLiteral, // Precio Total Literal
    styles: { halign: 'left', fontStyle: 'bold' },
  },
]);

    const totalTableWidth = pageWidth - marginLeft - marginRight;

    autoTable(doc, {
      startY: currentY + 2,
      head: [
        [
          { content: 'Ítem', styles: { halign: 'center' } },
          { content: 'Descripción', styles: { halign: 'center' } },
          { content: 'Unidad', styles: { halign: 'center' } },
          { content: 'Cantidad', styles: { halign: 'left' } },
          { content: 'Precio Unitario', styles: { halign: 'left' } },
          { content: 'Precio Total', styles: { halign: 'center' } },
          { content: 'Precio Total Literal', styles: { halign: 'center' } }, // ✅ nueva columna
        ],
      ],
      body,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        valign: 'middle',
        font: 'helvetica',
        overflow: 'hidden',
      },
      headStyles: {
        fontSize: 8,
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' }, // Ítem
        1: {
          // Descripción ajustada porque ahora hay 7 columnas
          cellWidth: totalTableWidth - (12 + 16 + 18 + 30 + 22 + 55),
          halign: 'left',
        },
        2: { cellWidth: 16, halign: 'center' }, // Unidad
        3: { cellWidth: 18, halign: 'right' }, // Cantidad
        4: { cellWidth: 30, halign: 'right' }, // P.Unit
        5: { cellWidth: 22, halign: 'right' }, // P.Total
        6: { cellWidth: 55, halign: 'left' },  // ✅ Literal
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
          'Sin materiales',
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
          'Sin mano de obra',
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
          'Sin equipos',
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
        const d = this.agruparPorDescripcion(
          data.materiales,
          'descripcion',
          'cantidad',
          'precio_unitario',
        );
        this.generarPDFSimple(data, 'Materiales', d);
        return;
      }
      case 'manoDeObra': {
        const d = this.agruparPorDescripcion(
          data.manoDeObra,
          'descripcion',
          'cantidad',
          'precio_unitario',
        );
        this.generarPDFSimple(data, 'Mano de Obra', d);
        return;
      }
      case 'equipos': {
        const d = this.agruparPorDescripcion(
          data.equipos,
          'descripcion',
          'cantidad',
          'precio_unitario',
        );
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

    // Márgenes (mm aprox)
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 30; // ~3cm
    const marginRight = 20; // ~2cm
    const marginTop = 20; // ~2cm

    // Datos base
    const gastosOperacion = Number(input.gastosOperacion) || 0;
    const valorAgregado = Number(input.valorAgregado) || 0;

    const iva_tasa_nominal = Number(input.iva_tasa_nominal) || 0;
    const it = Number(input.it) || 0;
    const iue = Number(input.iue) || 0;
    const ganancia = Number(input.ganancia) || 0;
    const margen_utilidad = Number(input.margen_utilidad) || 0; // (por ahora no lo usas en cálculos, pero lo dejo)

    // ========================
    // CÁLCULOS (equivalentes a tu component)
    // ========================
    // Sección 1
    const creditoFiscal = this.redondear2(
      gastosOperacion * (iva_tasa_nominal / 100),
    );
    const costoVenta = this.redondear2(gastosOperacion - creditoFiscal);

    // Sección 3
    const precioFactura3 = this.redondear2(gastosOperacion + valorAgregado);
    const gastoOperacion31 =
      precioFactura3 > 0
        ? this.redondear2((gastosOperacion * 100) / precioFactura3)
        : 0;
    const valorAgregado31 =
      precioFactura3 > 0
        ? this.redondear2((valorAgregado * 100) / precioFactura3)
        : 0;
    const precioFactura31 = this.redondear2(gastoOperacion31 + valorAgregado31);

    // Sección 4
    const costoVenta4 = this.redondear2(gastosOperacion - creditoFiscal);
    const iva13 = this.redondear2(precioFactura3 * (iva_tasa_nominal / 100));
    const margenUtilidad = this.redondear2(
      precioFactura3 - costoVenta4 - iva13,
    );

    // Sección 5
    const impuestoIva5 = this.redondear2(
      valorAgregado * (iva_tasa_nominal / 100),
    );
    const itefactura5 = this.redondear2(precioFactura3 * (it / 100));
    const utilidadBruta5 = valorAgregado - impuestoIva5 - itefactura5;
    const iueUtilidad5 = this.redondear2(utilidadBruta5 * (iue / 100));
    const totalImpuestos5 = this.redondear2(
      impuestoIva5 + itefactura5 + iueUtilidad5,
    );
    const totalUtilidadNeta = this.redondear2(utilidadBruta5 - iueUtilidad5);

    const toMil = (v: number) =>
      Math.round((Number(v || 0) + Number.EPSILON) * 1000);
    const fromMil = (m: number) => m / 1000;

    // ========================
    // SECCIÓN 6 – GANANCIA COMO MOTOR 

    // ========================


    const gananciaPct = Math.max(0, Math.min(100, ganancia));
    const compensacionPctUtilidad = this.redondear2(100 - gananciaPct);

    const gananciaCol1 = this.redondear3(
      totalUtilidadNeta * (gananciaPct / 100),
    );

    
    const compensacionDuenoCol1 = this.redondear3(
      totalUtilidadNeta - gananciaCol1,
    );

    const impuestosCol1 = this.redondear2(totalImpuestos5);
    const gastosOperacionCol1 = this.redondear2(gastosOperacion);

    const precioFacturaCol1 = this.redondear2(
      gananciaCol1 + compensacionDuenoCol1 + impuestosCol1 + gastosOperacionCol1,
    );

    const gananciaCol2 =
      precioFacturaCol1 > 0 ? (gananciaCol1 / precioFacturaCol1) * 100 : 0;

    const compensacionDuenoCol2 =
      precioFacturaCol1 > 0
        ? (compensacionDuenoCol1 / precioFacturaCol1) * 100
        : 0;

    const impuestosCol2 =
      precioFacturaCol1 > 0 ? (impuestosCol1 / precioFacturaCol1) * 100 : 0;

    const gastosOperacionCol2 =
      precioFacturaCol1 > 0 ? (gastosOperacionCol1 / precioFacturaCol1) * 100 : 0;

    const precioFacturaCol2 = this.redondear2(
      gananciaCol2 + compensacionDuenoCol2 + impuestosCol2 + gastosOperacionCol2,
    );
    // ========================
    // SECCIÓN 7 (3 decimales + suma exacta)
    // ========================
    let rentabilidadProyecto7 = 0;
    let rentabilidadGanancia7 = 0;
    let rentabilidadCompDueno7 = 0;
    let rentabilidadImpuestos7 = 0;

    if (gastosOperacionCol1 > 0) {
      const proyectoMil = toMil((valorAgregado / gastosOperacionCol1) * 100);
      const ganMil = toMil((gananciaCol1 / gastosOperacionCol1) * 100);
      const compMil = toMil(
        (compensacionDuenoCol1 / gastosOperacionCol1) * 100,
      );

      // ✅ Ajuste exacto: impuestos = proyecto - gan - comp
      const impMil = proyectoMil - ganMil - compMil;

      rentabilidadProyecto7 = fromMil(proyectoMil);
      rentabilidadGanancia7 = fromMil(ganMil);
      rentabilidadCompDueno7 = fromMil(compMil);
      rentabilidadImpuestos7 = fromMil(impMil);
    }
    // Sección 8
    const retornoInversion8 =
      gananciaCol1 > 0
        ? this.redondear2(gastosOperacionCol1 / gananciaCol1)
        : 0;
    const GastosOperacionColumna1 = input.gastosOperacion;
    const ValorAgregado3 = input.valorAgregado;
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
          `CREDITO FISCAL IVA TASA NOMINAL: (${this.formatearNumero(iva_tasa_nominal)}%)`,
          `-${this.formatearNumero(creditoFiscal)}`,
        ],
        ['COSTO DE VENTA', this.formatearNumero(costoVenta)],
      ],
      theme: 'grid',
      pageBreak: 'auto',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'hidden',
        valign: 'middle',
      },
      headStyles: {
        fontSize: 7,
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineWidth: 0.1,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 20, halign: 'right' },
      },
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
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'hidden',
        valign: 'middle',
      },
      headStyles: {
        fontSize: 7,
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineWidth: 0.1,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 20, halign: 'right' },
      },
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
        [
          'GASTOS DE OPERACIÓN',
          this.formatearNumero(gastosOperacion),
          `${this.formatearNumero(gastoOperacion31)}%`,
        ],
        [
          'VALOR AGREGADO',
          this.formatearNumero(valorAgregado),
          `${this.formatearNumero(valorAgregado31)}%`,
        ],
        [
          'PRECIO FACTURA',
          this.formatearNumero(precioFactura3),
          `${this.formatearNumero(precioFactura31)}%`,
        ],
      ],
      theme: 'grid',
      pageBreak: 'auto',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'hidden',
        valign: 'middle',
      },
      headStyles: {
        fontSize: 7,
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineWidth: 0.1,
        halign: 'center',
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
        [
          `IVA ${this.formatearNumero(iva_tasa_nominal)}% DE PRECIO FACTURA`,
          this.formatearNumero(iva13),
        ],
        ['PRECIO FACTURA', this.formatearNumero(precioFactura3)],
      ],
      theme: 'grid',
      pageBreak: 'auto',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'hidden',
        valign: 'middle',
      },
      headStyles: {
        fontSize: 7,
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineWidth: 0.1,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 20, halign: 'right' },
      },
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
        [
          `IMPUESTO IVA ${this.formatearNumero(iva_tasa_nominal)}%`,
          this.formatearNumero(impuestoIva5),
        ],
        [
          `IT ${this.formatearNumero(it)}% DE LA FACTURA`,
          this.formatearNumero(itefactura5),
        ],
        [
          `IUE ${this.formatearNumero(iue)}% UTILIDAD`,
          this.formatearNumero(iueUtilidad5),
        ],
        ['TOTAL IMPUESTOS', this.formatearNumero(totalImpuestos5)],
        ['TOTAL UTILIDAD NETA (100%)', this.formatearNumero(totalUtilidadNeta)],
      ],
      theme: 'grid',
      pageBreak: 'auto',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'hidden',
        valign: 'middle',
      },
      headStyles: {
        fontSize: 7,
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineWidth: 0.1,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 20, halign: 'right' },
      },
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
          `${this.redondear3(gananciaCol2).toFixed(3)}%`,
          '10%',
        ],
        [
          `COMPENSACION DEL DUEÑO (${this.redondear2(compensacionPctUtilidad)}%)`,
          this.formatearNumero3(this.redondear3(compensacionDuenoCol1)),
          `${this.redondear3(compensacionDuenoCol2).toFixed(3)}%`,
          '10%',
        ],
        [
          'IMPUESTOS',
          this.formatearNumero(impuestosCol1),
          `${this.formatearNumero(impuestosCol2)}%`,
          '15%',
        ],
        [
          'GASTOS DE OPERACIÓN',
          this.formatearNumero(gastosOperacionCol1),
          `${this.formatearNumero(gastosOperacionCol2)}%`,
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
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'hidden',
        valign: 'middle',
      },
      headStyles: {
        fontSize: 7,
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineWidth: 0.1,
        halign: 'center',
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
        [
          'RENTABILIDAD (PROYECTO)',
          `${this.formatearNumero(rentabilidadProyecto7)}%`,
        ],
        [
          'RENTABILIDAD (GANANCIA)',
          `${this.formatearNumero3(rentabilidadGanancia7)}%`,
        ],
        [
          'RENTABILIDAD (COMPENSACIÓN DEL DUEÑO)',
          `${this.formatearNumero3(rentabilidadCompDueno7)}%`,
        ],
        [
          'RENTABILIDAD (IMPUESTOS)',
          `${this.formatearNumero(rentabilidadImpuestos7)}%`,
        ],
      ],
      theme: 'grid',
      pageBreak: 'auto',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'hidden',
        valign: 'middle',
      },
      headStyles: {
        fontSize: 7,
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineWidth: 0.1,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 25, halign: 'right' },
      },
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

    const retorno =
      gananciaCol1 > 0
        ? this.redondear2(gastosOperacionCol1 / gananciaCol1)
        : 0;

    autoTable(doc, {
      startY,
      head: [['DESCRIPCION', 'VALOR']],
      body: [['RETORNO', this.formatearNumero(retorno)]],
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        valign: 'middle',
      },
      headStyles: {
        fontSize: 7,
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 20, halign: 'right' },
      },
      margin: { left: marginLeft, right: marginRight },
    });

    // ========================
    // GUARDAR PDF
    // ========================
    doc.save(this.nombreArchivo(input));
  }
}
