import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExportService } from '../../../services/export.service';

@Component({
  selector: 'app-precio-factura',
  imports: [CommonModule, FormsModule],
  templateUrl: './precio-factura.component.html',
  styleUrl: './precio-factura.component.css',
})
export class PrecioFacturaComponent {
  id_gasto_operaciones: number = 0;
  identificadorGeneral: number = 0;
  precio_unitario: number = 0; // De cada Item


  iva_efectiva: number = 0;   // IVA % mostrado Variable Principal
  it: number = 0;      // IT % mostrado Variable Principal
  iue: number = 0;    // IUE % mostrado Variable Principal
  ganancia: number = 0; // Ganancia mostrada Variable Principal

  a_costo_venta: number = 0;     // % A ingresado (ej: 77)
  b_margen_utilidad: number = 0;     // % B ingresado (ej: 10)
  porcentaje_global_100: number = 0; // Porcentaje de ganancia

  constructor(private route: ActivatedRoute, public router: Router,  private exportService: ExportService ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      this.identificadorGeneral = Number(params['identificadorGeneral']) || 0;
      this.precio_unitario = Number(params['precio_unitario']) || 0;
      this.iva_efectiva = Number(params['iva_efectiva']) || 0;
      this.it = Number(params['it']) || 0;
      this.iue = Number(params['iue']) || 0;
      this.ganancia = Number(params['ganancia']) || 0;
      this.a_costo_venta = Number(params['a_costo_venta']) || 0;
      this.b_margen_utilidad = Number(params['b_margen_utilidad']) || 0;
      this.porcentaje_global_100 = Number(params['porcentaje_global_100']) || 0;
    });
  }
  // ========================
  // 🔹 SECCIÓN 1
  // ========================
  get creditoFiscal(): number {
    return this.precio_unitario * (this.iva_efectiva / this.porcentaje_global_100);
  }
  get costoVenta(): number {
    return this.precio_unitario - this.creditoFiscal;
  }
  // ========================
  // 🔹 SECCIÓN 2
  // ========================
  get SumaAB(): number {
    return this.a_costo_venta + this.b_margen_utilidad;
  }
  get mensajeErrorAB(): string | null {
    return this.SumaAB !== 87 ? "PORCENTAJE INCORRECTO" : null;
  }
  get SumaIva_SumaAB(): number {
    return this.SumaAB + this.iva_efectiva;
  }
  get mensajeErrorIva(): string | null {
    return this.SumaIva_SumaAB !== this.porcentaje_global_100 ? "DATOS INCORRECTOS" : null;
  }
  get margenUtilidad(): number {
    return (this.b_margen_utilidad / this.a_costo_venta) * this.costoVenta;
  }
  get ivaEfectivaCalculo(): number {
    return this.iva_efectiva / this.SumaAB;
  }
  get ivaEfectiva(): number {
    return (this.costoVenta + this.margenUtilidad) * this.ivaEfectivaCalculo;
  }
  get precioFacturaS2(): number {
    return this.costoVenta + this.margenUtilidad + this.ivaEfectiva;
  }
  // ========================
  // 🔹 SECCIÓN 3
  // ========================
  get costoVentaT3 (): number{
    return (this.a_costo_venta / this.porcentaje_global_100) * this.precioFacturaS2;
  }
  get MargenDeUtilidad (): number{
    return (this.b_margen_utilidad / this.porcentaje_global_100) * this.precioFacturaS2;
  }
  get IVAenFactura (): number{
    return (this.iva_efectiva / this.porcentaje_global_100) * this.precioFacturaS2;
  }
  get SumaFactura (): number{
    return this.costoVentaT3 + this.MargenDeUtilidad + this.IVAenFactura;
  }
  // ========================
  // 🔹 SECCIÓN 4
  // ========================
  get ValorAgregado (): number{
    return this.precioFacturaS2 - this.precio_unitario;
  }
  get ImpuestoIva (): number{
    return (this.iva_efectiva / this.porcentaje_global_100)*this.ValorAgregado
  }
  get itFactura (): number{
    return (this.it / this.porcentaje_global_100) * this.precioFacturaS2;
  }
  get iueUtilidad (): number{
    return (this.ValorAgregado - this.ImpuestoIva - this.itFactura) * (this.iue / this.porcentaje_global_100);
  }
  get SumaImpuestos (): number{
    return this.ImpuestoIva + this.itFactura + this.iueUtilidad;
  }
  get SumaTotalNeta (): number{
    return this.ValorAgregado - this.SumaImpuestos;
  }
  // ========================
  // 🔹 SECCIÓN 5
  // ========================
  get gananciaPrimero (): number{
    return this.SumaTotalNeta * (this.ganancia / this.porcentaje_global_100);
  }
  get CompensacionDueno (): number{
    return this.SumaTotalNeta * (this.ganancia / this.porcentaje_global_100);
  }
  get PrecioFacturaPrimero (): number{
    return this.gananciaPrimero + this.CompensacionDueno + this.SumaImpuestos + this.precio_unitario;
  }
  //Columna 2 
  get gananciaPrimeroPorcentage (): number{
    return (this.gananciaPrimero / this.PrecioFacturaPrimero) * this.porcentaje_global_100;
  }
  get CompensacionDuenoPorcentage (): number{
    return (this.CompensacionDueno / this.PrecioFacturaPrimero) * this.porcentaje_global_100;
  }
  get ImpuestoPorcentage (): number{
    return (this.SumaImpuestos / this.PrecioFacturaPrimero) * this.porcentaje_global_100;
  }
  get gastoOperacionPorcentage (): number{
    return (this.precio_unitario / this.PrecioFacturaPrimero) * this.porcentaje_global_100 ;
  }
  get PorcentajeTotalGananciaPrimero (): number{
    return this.gananciaPrimeroPorcentage + this.CompensacionDuenoPorcentage + this.ImpuestoPorcentage + this.gastoOperacionPorcentage;
  }
  // ========================
  // 🔹 SECCIÓN 6
  // ========================
  get RentabilidadProyecto(): number{
    return (this.ValorAgregado/ this.precio_unitario) * this.porcentaje_global_100;
  }
  get RentabilidadGanancia(): number{
    return (this.gananciaPrimero/ this.precio_unitario) * this.porcentaje_global_100;
  }
  get RentabilidadCompensacionDueno(): number{
    return (this.CompensacionDueno/ this.precio_unitario) * this.porcentaje_global_100;
  }
  get RentabilidadImpuestos(): number{
    return (this.SumaImpuestos/ this.precio_unitario) * this.porcentaje_global_100;
  } 
  // ========================
  // 🔹 SECCIÓN 7
  // ========================
  get Retorno():number{
    return this.precio_unitario/ this.gananciaPrimero
  }
  navigateToHome(): void {
    this.router.navigate(['/panel-control/gastos-operaciones']);
  }

  exportPDF() {
    this.exportService.generatePDF('contentToExport', 'factura.pdf');
  }
  exportWORD() {
    this.exportService.generateWord('contentToExport', 'factura.docx');
  }
}