import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ServiciosProyectos } from '../service/servicios-proyectos';

type Origen = 'ITEM' | 'PROYECTO' | 'MODULO' | '';

@Component({
  selector: 'app-precio-factura',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './precio-factura.component.html',
  styleUrl: './precio-factura.component.css',
})
export class PrecioFacturaComponent implements OnInit {
  // ========================
  // IDENTIFICACIÓN
  // ========================
  id_item_gasto_operacion = 0;
  id_proyecto_general = 0;

  // ========================
  // CONTROL DE ORIGEN
  // ========================
  origen: Origen = '';

  // ========================
  // REPORTE PRINCIPAL
  // ========================
  REPORTE_GASTOS_DE_OPERACION = 0;
  REPORTE_VALOR_AGREGADO = 0;

  // ========================
  // VARIABLES FINANCIERAS
  // ========================
  iva_tasa_nominal = 0;
  it = 0;
  iue = 0;
  ganancia = 0;
  margen_utilidad = 0;

  // ========================
  // DATOS VISUALES DEL REPORTE
  // ========================
  nombreProyecto = '';
  nombreModulo = '';
  descripcionItem = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ServiciosProyectos,
  ) {}

  // ========================
  // INIT
  // ========================
  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.origen = (params['origen'] as Origen) || '';
      this.id_proyecto_general = Number(params['id_proyecto']) || 0;

      if (this.origen === 'PROYECTO') {
        this.REPORTE_GASTOS_DE_OPERACION =
          Number(params['total_proyecto_gastos_operacion_parcial']) || 0;
        this.REPORTE_VALOR_AGREGADO =
          Number(params['total_proyecto_valor_agregado']) || 0;
      }

      if (this.origen === 'MODULO') {
        this.REPORTE_GASTOS_DE_OPERACION =
          Number(params['total_modulo_gastos_operacion_parcial']) || 0;
        this.REPORTE_VALOR_AGREGADO =
          Number(params['total_modulo_valor_agregado']) || 0;
      }

      if (this.origen === 'ITEM') {
        this.REPORTE_GASTOS_DE_OPERACION =
          Number(params['total_Item_gasto_operacion_parcial']) || 0;
        this.REPORTE_VALOR_AGREGADO =
          Number(params['total_Item_valor_agregado_item']) || 0;
      }

      if (this.id_proyecto_general > 0) {
        this.service
          .getProyectoID(this.id_proyecto_general)
          .pipe(
            catchError((err) => {
              console.error(err);
              return of(null);
            }),
          )
          .subscribe((p: any) => {
            if (!p) return;

            this.nombreProyecto = p?.NombreProyecto || '';

            this.iva_tasa_nominal = Number(p?.iva_tasa_nominal) || 0;
            this.it = Number(p?.it) || 0;
            this.iue = Number(p?.iue) || 0;
            this.ganancia = Number(p?.ganancia) || 0;
            this.margen_utilidad = Number(p?.margen_utilidad) || 0;
          });
      }

      this.nombreModulo = params['nombreModulo'] || this.nombreModulo;
      this.descripcionItem = params['descripcionItem'] || this.descripcionItem;
      this.id_item_gasto_operacion =
        Number(params['id_item_gasto_operacion']) ||
        this.id_item_gasto_operacion;
    });
  }

  // ========================
  // FORMATOS (VISTA)
  // ========================
  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(valor) || 0);
  }

  formatearNumero3(valor: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(Number(valor) || 0);
  }

  // ========================
  // PRECISIÓN / REDONDEOS
  // ========================
  private toCents(valor: number): number {
    return Math.round((Number(valor) + Number.EPSILON) * 100);
  }

  private fromCents(cents: number): number {
    return cents / 100;
  }

  private toMil(valor: number): number {
    return Math.round((Number(valor) + Number.EPSILON) * 1000);
  }

  private fromMil(mil: number): number {
    return mil / 1000;
  }

  private redondear2(valor: number): number {
    return this.fromCents(this.toCents(valor));
  }

  private redondear3(valor: number): number {
    return this.fromMil(this.toMil(valor));
  }

  // ========================
  // SECCIÓN 1 – IVA
  // ========================
  get creditoFiscal(): number {
    return this.redondear2(
      this.REPORTE_GASTOS_DE_OPERACION * (this.iva_tasa_nominal / 100),
    );
  }

  get costoVenta(): number {
    return this.redondear2(
      this.REPORTE_GASTOS_DE_OPERACION - this.creditoFiscal,
    );
  }

  // ========================
  // SECCIÓN 3 – PRECIO FACTURA (MALLA FINITA)
  // ========================
  get GastoOperacion3(): number {
    return Number(this.REPORTE_GASTOS_DE_OPERACION) || 0;
  }

  get ValorAgregado3(): number {
    return Number(this.REPORTE_VALOR_AGREGADO) || 0;
  }

  get precioFactura3(): number {
    return this.redondear2(this.GastoOperacion3 + this.ValorAgregado3);
  }

  get GastoOperacion31(): number {
    const total = this.precioFactura3;
    return total > 0
      ? this.redondear2((this.GastoOperacion3 * 100) / total)
      : 0;
  }

  get ValorAgregado31(): number {
    const total = this.precioFactura3;
    return total > 0 ? this.redondear2((this.ValorAgregado3 * 100) / total) : 0;
  }

  get precioFactura31(): number {
    return this.redondear2(this.GastoOperacion31 + this.ValorAgregado31); // debería ~100
  }

  // ========================
  // SECCIÓN 4 – FISCALIZACIÓN
  // ========================
  get costoVenta4(): number {
    return this.costoVenta;
  }

  get iva13(): number {
    return this.redondear2(this.precioFactura3 * (this.iva_tasa_nominal / 100));
  }

  get margenUtilidad(): number {
    return this.redondear2(this.precioFactura3 - this.costoVenta4 - this.iva13);
  }

  // ========================
  // SECCIÓN 5 – ESTADO DE RESULTADOS
  // ========================
  get impuestoIva5(): number {
    return this.redondear2(this.ValorAgregado3 * (this.iva_tasa_nominal / 100));
  }

  get itefactura5(): number {
    return this.redondear2(this.precioFactura3 * (this.it / 100));
  }

  get iueUtilidad5(): number {
    const utilidad = this.ValorAgregado3 - this.impuestoIva5 - this.itefactura5;
    return this.redondear2(utilidad * (this.iue / 100));
  }

  get totalImpuestos5(): number {
    return this.redondear2(
      this.impuestoIva5 + this.itefactura5 + this.iueUtilidad5,
    );
  }

  get totalUtilidadNeta(): number {
    const utilidadBruta =
      this.ValorAgregado3 - this.impuestoIva5 - this.itefactura5;
    return this.redondear2(utilidadBruta - this.iueUtilidad5);
  }

  // SECCIÓN 6 – GANANCIA COMO MOTOR
  get ganaciaColumna1(): number {
    return this.redondear3(this.totalUtilidadNeta * (this.ganancia / 100));
  }

  get CompensacioDuenoColumna1(): number {
    return this.redondear3(this.totalUtilidadNeta - this.ganaciaColumna1);
  }
  get CompensacionDuenoPorcentajeMeta(): number {
    const comp = 100 - (Number(this.ganancia) || 0);
    return Math.max(0, Math.min(100, comp));
  }

  get CompensacionDuenoPorcentajeMetaTxt(): string {
    return `${this.CompensacionDuenoPorcentajeMeta.toFixed(0)}%`;
  }

  get ImpuestosColumna1(): number {
    return this.redondear2(this.totalImpuestos5);
  }

  get GastosOperacionColumna1(): number {
    return this.redondear2(this.REPORTE_GASTOS_DE_OPERACION);
  }

  get PrecioFacturaColumna1(): number {
    const suma =
      this.ganaciaColumna1 +
      this.CompensacioDuenoColumna1 +
      this.ImpuestosColumna1 +
      this.GastosOperacionColumna1;

    return this.redondear2(suma);
  }

  get gananciaColumna2(): number {
    return (this.ganaciaColumna1 / this.PrecioFacturaColumna1) * 100;
  }

  get CompensacioDuenoColumna2(): number {
    return (this.CompensacioDuenoColumna1 / this.PrecioFacturaColumna1) * 100;
  }

  get ImpuestosColumna2(): number {
    return (this.ImpuestosColumna1 / this.PrecioFacturaColumna1) * 100;
  }

  get GastosOperacionColumna2(): number {
    return (this.GastosOperacionColumna1 / this.PrecioFacturaColumna1) * 100;
  }

  get PrecioFacturaColumna2(): number {
    return this.redondear2(
      this.gananciaColumna2 +
        this.CompensacioDuenoColumna2 +
        this.ImpuestosColumna2 +
        this.GastosOperacionColumna2,
    );
  }

  // ========================
  // SECCIÓN 7 – RENTABILIDAD (3 decimales + suma exacta)
  // ========================
  get RentabilidadProyecto7(): number {
    const gastos = this.GastosOperacionColumna1;
    if (gastos <= 0) return 0;

    return this.redondear3((this.REPORTE_VALOR_AGREGADO / gastos) * 100);
  }

  get RentabilidadGanacia7(): number {
    const gastos = this.GastosOperacionColumna1;
    if (gastos <= 0) return 0;

    return this.redondear3((this.ganaciaColumna1 / gastos) * 100);
  }

  get RentabilidadCompensacionDuenio(): number {
    const gastos = this.GastosOperacionColumna1;
    if (gastos <= 0) return 0;

    return this.redondear3((this.CompensacioDuenoColumna1 / gastos) * 100);
  }

  get RentabilidadImpuestos(): number {
    const gastos = this.GastosOperacionColumna1;
    if (gastos <= 0) return 0;

    const proyectoMil = this.toMil(this.RentabilidadProyecto7);
    const ganMil = this.toMil(this.RentabilidadGanacia7);
    const compMil = this.toMil(this.RentabilidadCompensacionDuenio);

    const impMil = proyectoMil - ganMil - compMil;
    return this.fromMil(impMil);
  }

  // ========================
  // SECCIÓN 8 – RETORNO
  // ========================
  get RetornoInversion8(): number {
    const ganancia = this.ganaciaColumna1;
    return ganancia > 0
      ? this.redondear2(this.GastosOperacionColumna1 / ganancia)
      : 0;
  }

  // ========================
  // NAVEGACIÓN
  // ========================
  navigateToHome(): void {
    this.router.navigate(['/panel-control/proyectos']);
  }
}
