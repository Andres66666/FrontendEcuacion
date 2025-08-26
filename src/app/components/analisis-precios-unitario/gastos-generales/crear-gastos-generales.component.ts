import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ServiciosService } from '../../../services/servicios.service';
import { ActivatedRoute } from '@angular/router';
import { GastosGenerales } from '../../../models/models';

@Component({
  selector: 'app-crear-gastos-generales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-gastos-generales.component.html',
  styleUrl: './crear-gastos-generales.component.css',
})
export class CrearGastosGeneralesComponent {
  formulario: FormGroup;
  id_gasto_operaciones = 0;
  gastos_generales = 0;
  porcentaje_global_100 = 0;

  gastoExistente: GastosGenerales | null = null;
  totalMateriales = 0;
  totalManoObra = 0;
  totalEquipos = 0;

  constructor(
    private fb: FormBuilder,
    private servicio: ServiciosService,
    private route: ActivatedRoute
  ) {
    this.formulario = this.fb.group({
      gastos_generales: [0, [Validators.required, Validators.min(0.01), Validators.max(1)]],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      this.gastos_generales = Number(params['gastos_generales']) || 0;
      this.porcentaje_global_100 = Number(params['porcentaje_global_100']) || 0;
      this.formulario.get('gastos_generales')?.setValue(this.gastos_generales);
      this.formulario.get('porcentaje_global_100')?.setValue(this.porcentaje_global_100);

      this.cargarGastosGeneralesExistente();
    });

    this.servicio.totalMateriales$.subscribe((total) => (this.totalMateriales = total));
    this.servicio.totalManoObra$.subscribe((total) => (this.totalManoObra = total));
    this.servicio.totalEquipos$.subscribe((total) => (this.totalEquipos = total));
  }

  cargarGastosGeneralesExistente(): void {
    this.servicio.getGastosGenerales(this.id_gasto_operaciones).subscribe((gastos) => {
      this.gastoExistente = gastos.length > 0 ? gastos[0] : null;
    });
  }

  registrarGastosGenerales(): void {
    if (!this.id_gasto_operaciones) return;
    const nuevoGasto = {
      id: 0,
      id_gasto_operacion: this.id_gasto_operaciones,
      total: this.totalOperacion
    };
    this.servicio.createGasto(nuevoGasto).subscribe({
      next: (res) => {
        this.gastoExistente = res;
      },
      error: (err) => {
        console.error('Error al registrar gasto:', err);
      }
    });
  }

  // ...en tu componente...
    actualizarGastosGenerales(): void {
      if (!this.gastoExistente) return;

      const gastoActualizado: GastosGenerales = {
        id: this.gastoExistente.id,
        id_gasto_operacion: this.id_gasto_operaciones,
        total: this.totalOperacion
      };
      this.servicio.updateGasto(gastoActualizado).subscribe({
        next: (res) => {
          this.cargarGastosGeneralesExistente();
        },
        error: (err) => {
          console.error('Error al actualizar gasto:', err);
        }
      });
    }

  get gastosGeneralesPorcentaje(): number {
    return this.formulario.get('gastos_generales')?.value;
  }

  get totalGastosGenerales(): number {
    const suma = this.totalMateriales + this.totalManoObra + this.totalEquipos;
    return suma * (this.gastosGeneralesPorcentaje / this.porcentaje_global_100);
  }

  get sumaTotales(): number {
    return this.totalMateriales + this.totalManoObra + this.totalEquipos;
  }

  get totalOperacion(): number {
    return this.sumaTotales + this.totalGastosGenerales;
  }

  blockE(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  }
}