import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { OkComponent } from '../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../mensajes/error/error.component';

import {
  GastosGenerales,
  Proyecto,
} from '../../gestion_proyectos/models/modelosProyectos';
import { ServiciosProyectos } from '../../gestion_proyectos/service/servicios-proyectos';

@Component({
  selector: 'app-crear-gastos-generales',
  standalone: true,
  imports: [CommonModule, OkComponent, ErrorComponent],
  templateUrl: './crear-gastos-generales.component.html',
  styleUrls: ['./crear-gastos-generales.component.css'],
})
export class CrearGastosGeneralesComponent implements OnInit, OnChanges {
  @Input() proyectoData!: Proyecto;
  @Input() id_gasto_operaciones!: number;

  // % configurables desde proyecto
  gastos_generales = 0; // %
  margen_utilidad = 0; // %
  iva_tasa_nominal = 0; // %

  gastoExistente: GastosGenerales | null = null;

  // Totales de secciones 1-2-3
  totalMateriales = 0;
  totalManoObra = 0;
  totalEquipos = 0;

  mensajeExito = '';
  mensajeError = '';

  constructor(
    private servicio: ServiciosProyectos,
    private route: ActivatedRoute,
  ) {}

  // ================= LIFECYCLE =================
  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;

      // si llegan por query (por compatibilidad), los tomamos; si no, quedan los del proyectoData
      this.gastos_generales = this.parseNumero(
        params['gastos_generales'] ?? this.gastos_generales,
      );
      this.margen_utilidad = this.parseNumero(
        params['margen_utilidad'] ?? this.margen_utilidad,
      );
      this.iva_tasa_nominal = this.parseNumero(
        params['iva_tasa_nominal'] ?? this.iva_tasa_nominal,
      );

      if (this.id_gasto_operaciones) this.cargarGastosGeneralesExistente();
    });

    // Suscripciones de totales (1-2-3)
    this.servicio.totalMateriales$.subscribe(
      (t) => (this.totalMateriales = Number(t || 0)),
    );
    this.servicio.totalManoObra$.subscribe(
      (t) => (this.totalManoObra = Number(t || 0)),
    );
    this.servicio.totalEquipos$.subscribe(
      (t) => (this.totalEquipos = Number(t || 0)),
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyectoData'] && this.proyectoData) {
      this.gastos_generales = this.parseNumero(
        this.proyectoData.gastos_generales as any,
      );
      this.margen_utilidad = this.parseNumero(
        this.proyectoData.margen_utilidad as any,
      );
      this.iva_tasa_nominal = this.parseNumero(
        this.proyectoData.iva_tasa_nominal as any,
      );
    }
  }

  // ================= BACKEND =================
  cargarGastosGeneralesExistente(): void {
    if (!this.id_gasto_operaciones) return;

    this.servicio.getGastosGenerales(this.id_gasto_operaciones).subscribe({
      next: (gastos) => {
        this.gastoExistente = gastos && gastos.length > 0 ? gastos[0] : null;
      },
      error: (err) => {
        console.error('Error al cargar gastos generales:', err);
        this.gastoExistente = null;
      },
    });
  }

  registrarGastosGenerales(): void {
    if (!this.id_gasto_operaciones) return;

    this.servicio
      .recalcularGastosGeneralesItem(this.id_gasto_operaciones)
      .subscribe({
        next: (res: any) => {
          this.gastoExistente = res;
          this.mensajeExito = 'Gastos generales recalculados correctamente.';
          this.cargarGastosGeneralesExistente();
        },
        error: (err) => {
          console.error('Error al recalcular:', err);
          this.mensajeError = 'Error al recalcular gastos generales.';
        },
      });
  }

  manejarOk(): void {
    this.mensajeExito = '';
  }

  manejarError(): void {
    this.mensajeError = '';
  }

  // ================= OPERACIONES (SEGURAS) =================
  // 1) totales base
  get sumaTotales(): number {
    const cents =
      this.toCents(this.totalMateriales) +
      this.toCents(this.totalManoObra) +
      this.toCents(this.totalEquipos);

    return this.fromCents(cents);
  }

  // 4) gastos generales = % * (1+2+3)
  get totalGastosGenerales(): number {
    const baseCents = this.toCents(this.sumaTotales);
    const ggCents = this.applyPercentCents(baseCents, this.gastos_generales);
    return this.fromCents(ggCents);
  }

  // alias para tu tabla (manteniendo nombres)
  get totalOperacion(): number {
    return this.totalGastosGenerales;
  }

  // 1+2+3+4
  get suma1234(): number {
    const cents =
      this.toCents(this.sumaTotales) + this.toCents(this.totalGastosGenerales);
    return this.fromCents(cents);
  }

  /**
   * 5) Valor agregado:
   * base = 100 - IVA
   * VA = (1+2+3+4) * ( MU / (base - MU) )
   *
   * ✅ Se hace en centavos + basis points para reducir error.
   * ⚠️ Si (base - MU) <= 0, devolvemos 0 para evitar infinito.
   */
  get TotalesS5(): number {
    const base = 100 - this.parseNumero(this.iva_tasa_nominal);
    const mu = this.parseNumero(this.margen_utilidad);
    const denom = base - mu;

    if (denom <= 0) return 0;

    const baseCents = this.toCents(this.suma1234);

    // ratio = mu / denom  (ambos en % pero como números)
    // lo convertimos a "basis points de ratio" para operar entero
    // ratioBP = ratio * 10000
    const ratioBP = Math.round((mu / denom + Number.EPSILON) * 10000);

    // resultCents = baseCents * ratioBP / 10000
    const resultCents = Math.round((baseCents * ratioBP) / 10000);

    return this.fromCents(resultCents);
  }

  // 1+2+3+4+5
  get sumaTotalGeneral12345(): number {
    const cents = this.toCents(this.suma1234) + this.toCents(this.TotalesS5);

    return this.fromCents(cents);
  }

  get Total12345(): number {
    return this.sumaTotalGeneral12345;
  }

  // ================= HELPERS NUMÉRICOS =================
  private parseNumero(valor: any): number {
    if (valor === null || valor === undefined || valor === '') return 0;
    if (typeof valor === 'number') return valor;

    const texto = valor.toString().trim();
    const limpio =
      texto.includes(',') && texto.includes('.')
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto.replace(',', '.');

    const n = Number(limpio);
    return isFinite(n) ? n : 0;
  }

  private toCents(valor: any): number {
    const n = this.parseNumero(valor);
    return Math.round((n + Number.EPSILON) * 100);
  }

  private fromCents(cents: number): number {
    return cents / 100;
  }

  private pctToBasisPoints(pct: any): number {
    const p = this.parseNumero(pct);
    return Math.round((p + Number.EPSILON) * 100); // 2 decimales de %
  }

  private applyPercentCents(baseCents: number, pct: any): number {
    const bp = this.pctToBasisPoints(pct); // pct * 100
    return Math.round((baseCents * bp) / 10000);
  }

  // ================= FORMAT =================
  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor || 0);
  }
}
