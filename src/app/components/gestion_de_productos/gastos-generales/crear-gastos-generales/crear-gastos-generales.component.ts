import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-crear-gastos-generales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-gastos-generales.component.html',
  styleUrl: './crear-gastos-generales.component.css',
})
export class CrearGastosGeneralesComponent {
  formulario: FormGroup;

  // Simulaciones de totales base (estos deberían venir de servicios o inputs del componente padre)
  totalMateriales = 1000;
  totalManoObra = 2000;
  totalEquipos = 500;

  constructor(private fb: FormBuilder) {
    this.formulario = this.fb.group({
      gastosGenerales: [
        0.12,
        [Validators.required, Validators.min(0.01), Validators.max(1)],
      ],
    });
  }

  // Getter para el porcentaje
  get gastosGeneralesPorcentaje(): number {
    return this.formulario.get('gastosGenerales')?.value || 0.12;
  }

  // Cálculo del valor monetario de gastos generales
  get gastosGenerales(): number {
    const suma = this.totalMateriales + this.totalManoObra + this.totalEquipos;
    return suma * this.gastosGeneralesPorcentaje;
  }

  // Total gastos de operación
  get totalOperacion(): number {
    return (
      this.totalMateriales +
      this.totalManoObra +
      this.totalEquipos +
      this.gastosGenerales
    );
  }

  blockE(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault();
    }
  }
}
