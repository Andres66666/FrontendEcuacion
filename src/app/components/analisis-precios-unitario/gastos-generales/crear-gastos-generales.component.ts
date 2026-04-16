import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ErrorComponent } from '../../mensajes/error/error.component';
import { OkComponent } from '../../mensajes/ok/ok.component';

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

  gastos_generales = 0;
  margen_utilidad = 0;
  iva_tasa_nominal = 0;
  gastoExistente: GastosGenerales | null = null;
  totalMateriales = 0;
  totalManoObra = 0;
  totalEquipos = 0;

  mensajeExito = '';
  mensajeError = '';

  constructor(
    private servicio: ServiciosProyectos,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;

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
  get sumaTotales(): number {
    const cents =
      this.toCents(this.totalMateriales) +
      this.toCents(this.totalManoObra) +
      this.toCents(this.totalEquipos);

    return this.fromCents(cents);
  }

  get totalGastosGenerales(): number {
    const baseCents = this.toCents(this.sumaTotales);
    const ggCents = this.applyPercentCents(baseCents, this.gastos_generales);
    return this.fromCents(ggCents);
  }

  get totalOperacion(): number {
    return this.totalGastosGenerales;
  }

  get suma1234(): number {
    const cents =
      this.toCents(this.sumaTotales) + this.toCents(this.totalGastosGenerales);
    return this.fromCents(cents);
  }
  get TotalesS5(): number {
    const base = 100 - this.parseNumero(this.iva_tasa_nominal);
    const mu = this.parseNumero(this.margen_utilidad);
    const denom = base - mu;

    if (denom <= 0) return 0;

    const baseCents = this.toCents(this.suma1234);
    const ratioBP = Math.round((mu / denom + Number.EPSILON) * 10000);

    const resultCents = Math.round((baseCents * ratioBP) / 10000);

    return this.fromCents(resultCents);
  }

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
    return Math.round((p + Number.EPSILON) * 100);
  }

  private applyPercentCents(baseCents: number, pct: any): number {
    const bp = this.pctToBasisPoints(pct);
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
