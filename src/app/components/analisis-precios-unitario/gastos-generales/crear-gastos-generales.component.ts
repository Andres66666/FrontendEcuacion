// crear-gastos-generales.component.ts (refactorizado y limpiado)
import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, ReactiveFormsModule, OkComponent, ErrorComponent],
  templateUrl: './crear-gastos-generales.component.html',
  styleUrls: ['./crear-gastos-generales.component.css'],
})
export class CrearGastosGeneralesComponent {
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
    private route: ActivatedRoute
  ) {}

  ngOnChanges(): void {
    if (this.proyectoData) {
      this.gastos_generales = this.proyectoData.gastos_generales;
      this.margen_utilidad = this.proyectoData.margen_utilidad;
      this.iva_tasa_nominal = this.proyectoData.iva_tasa_nominal;
    }
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      this.gastos_generales = Number(params['gastos_generales']) || 0;
      this.margen_utilidad = Number(params['margen_utilidad']) || 0;
      this.iva_tasa_nominal = Number(params['iva_tasa_nominal']) || 0;
      this.cargarGastosGeneralesExistente();
    });

    this.servicio.totalMateriales$.subscribe(
      (total) => (this.totalMateriales = total)
    );
    this.servicio.totalManoObra$.subscribe(
      (total) => (this.totalManoObra = total)
    );
    this.servicio.totalEquipos$.subscribe(
      (total) => (this.totalEquipos = total)
    );
  }

  cargarGastosGeneralesExistente(): void {
    this.servicio
      .getGastosGenerales(this.id_gasto_operaciones)
      .subscribe((gastos) => {
        this.gastoExistente = gastos.length > 0 ? gastos[0] : null;
      });
  }

  registrarGastosGenerales(): void {
    if (!this.id_gasto_operaciones) return;

    const nuevoGasto: GastosGenerales = {
      id: 0,
      id_gasto_operacion: this.id_gasto_operaciones,
      totalgastosgenerales: this.suma1234,
      total: this.Total12345,
    };

    this.servicio.createGasto(nuevoGasto).subscribe({
      next: (res) => {
        this.gastoExistente = res;
        this.mensajeExito = 'Gasto registrado correctamente.';
      },
      error: (err) => {
        console.error('Error al registrar gasto:', err);
        this.mensajeError = 'Error al registrar gasto.';
      },
    });
  }

  actualizarGastosGenerales(): void {
    if (!this.gastoExistente) return;

    const gastoActualizado: GastosGenerales = {
      id: this.gastoExistente.id,
      id_gasto_operacion: this.id_gasto_operaciones,
      totalgastosgenerales: this.suma1234,
      total: this.Total12345,
    };

    this.servicio.updateGasto(gastoActualizado).subscribe({
      next: () => {
        this.cargarGastosGeneralesExistente();
        this.mensajeExito = 'Gasto actualizado correctamente.';
      },
      error: (err) => {
        console.error('Error al actualizar gasto:', err);
        this.mensajeError = 'Error al actualizar gasto.';
      },
    });
  }

  manejarOk(): void {
    this.mensajeExito = '';
  }

  manejarError(): void {
    this.mensajeError = '';
  }

  // Cálculos internos con todos los decimales
  get sumaTotales(): number {
    return (
      (this.totalMateriales || 0) +
      (this.totalManoObra || 0) +
      (this.totalEquipos || 0)
    );
  }

  get totalGastosGenerales(): number {
    return this.sumaTotales * (this.gastos_generales / 100);
  }

  get totalOperacion(): number {
    return this.totalGastosGenerales;
  }
  /* nuevas operaciones para la sección 5 */
  get suma1234(): number {
    return (
      (this.totalMateriales || 0) +
      (this.totalManoObra || 0) +
      (this.totalEquipos || 0) +
      (this.totalGastosGenerales || 0)
    );
  }
  get TotalesS5(): number {
    const base = 100 - this.iva_tasa_nominal;
    return (
      this.suma1234 * (this.margen_utilidad / (base - this.margen_utilidad))
    );
  }

  get sumaTotalGeneral12345(): number {
    // Redondear cada valor a dos decimales antes de sumar
    const mat = Math.round(this.totalMateriales * 100) / 100;
    const mano = Math.round(this.totalManoObra * 100) / 100;
    const equi = Math.round(this.totalEquipos * 100) / 100;
    const gast = Math.round(this.totalGastosGenerales * 100) / 100;
    const totS5 = Math.round(this.TotalesS5 * 100) / 100;
    return mat + mano + equi + gast + totS5;
  }
  get Total12345(): number {
    return this.sumaTotalGeneral12345;
  }
  // Para mostrar los resultados redondeados
  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  }
}
