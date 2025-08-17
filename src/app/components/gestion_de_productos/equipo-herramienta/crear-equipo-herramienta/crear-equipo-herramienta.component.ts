import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-crear-equipo-herramienta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-equipo-herramienta.component.html',
  styleUrl: './crear-equipo-herramienta.component.css',
})
export class CrearEquipoHerramientaComponent {
  formulario: FormGroup;

  constructor(private fb: FormBuilder) {
    this.formulario = this.fb.group({
      equipos: this.fb.array([]),
      herramientas: [0.05, [Validators.required, Validators.min(0.05)]],
    });

    // Agregamos al menos un equipo por defecto
    this.agregarEquipo();
  }

  // ===== Getters =====
  get equipos(): FormArray {
    return this.formulario.get('equipos') as FormArray;
  }

  get herramientas(): number {
    return this.formulario.get('herramientas')?.value || 0.05;
  }

  // ===== Métodos =====
  agregarEquipo(): void {
    this.equipos.push(
      this.fb.group({
        descripcion: ['', Validators.required],
        unidad: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/),
          ],
        ],
        cantidad: [1, [Validators.required, Validators.min(1)]],
        precioUnitario: [1, [Validators.required, Validators.min(1)]],
        precioParcial: [{ value: 1, disabled: true }],
      })
    );
  }

  eliminarEquipo(index: number): void {
    this.equipos.removeAt(index);
  }

  onUnidadChange(control: AbstractControl): void {
    control.get('unidad')?.markAsTouched();
  }

  onCantidadChange(control: AbstractControl): void {
    control.get('cantidad')?.markAsTouched();
    this.actualizarPrecioParcial(control);
  }

  onPrecioUniChange(control: AbstractControl): void {
    control.get('precioUnitario')?.markAsTouched();
    this.actualizarPrecioParcial(control);
  }

  actualizarPrecioParcial(control: AbstractControl): void {
    const cantidad = control.get('cantidad')?.value || 0;
    const precioUnitario = control.get('precioUnitario')?.value || 0;
    const parcial = cantidad * precioUnitario;
    control.get('precioParcial')?.setValue(parcial, { emitEvent: false });
  }

  blockE(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault();
    }
  }

  // ===== Cálculos Totales =====
  get subtotalEquipos(): number {
    return this.equipos.controls.reduce((acc, control) => {
      const cantidad = control.get('cantidad')?.value || 0;
      const precio = control.get('precioUnitario')?.value || 0;
      return acc + cantidad * precio;
    }, 0);
  }

  get herramientasPorcentaje(): number {
    return this.subtotalEquipos * this.herramientas;
  }

  get totalEquipos(): number {
    const total = this.subtotalEquipos + this.herramientasPorcentaje;
    const decimal = total % 1;
    return decimal >= 0.5 ? Math.round(total) : total;
  }
}
