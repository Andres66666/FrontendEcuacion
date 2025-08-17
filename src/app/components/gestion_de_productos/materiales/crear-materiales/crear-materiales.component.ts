import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-crear-materiales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-materiales.component.html',
  styleUrl: './crear-materiales.component.css',
})
export class CrearMaterialesComponent {
  formulario: FormGroup;

  constructor(private fb: FormBuilder) {
    this.formulario = this.fb.group({
      materiales: this.fb.array([]),
    });

    // Agregar una fila por defecto al iniciar
    this.agregarMaterial();
  }

  // Getters
  get materiales(): FormArray {
    return this.formulario.get('materiales') as FormArray;
  }

  // Métodos
  agregarMaterial(): void {
    this.materiales.push(
      this.fb.group({
        descripcion: ['', [Validators.required]],
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

  eliminarMaterial(index: number): void {
    this.materiales.removeAt(index);
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

  get totalMateriales(): number {
    const totalPrevio = this.materiales.value.reduce(
      (acc: number, m: any) => acc + m.cantidad * m.precioUnitario,
      0
    );
    const decimal = totalPrevio % 1;
    return decimal >= 0.5 ? Math.round(totalPrevio) : totalPrevio;
  }
}
