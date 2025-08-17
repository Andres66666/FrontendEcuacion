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
  selector: 'app-crear-mano-de-obra',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-mano-de-obra.component.html',
  styleUrl: './crear-mano-de-obra.component.css',
})
export class CrearManoDeObraComponent {
  formulario: FormGroup;

  constructor(private fb: FormBuilder) {
    this.formulario = this.fb.group({
      manoObra: this.fb.array([]),
      cargasSociales: [
        0.55,
        [Validators.required, Validators.min(0.55), Validators.max(0.7118)],
      ],
      iva: [
        0.1494,
        [Validators.required, Validators.min(0.01), Validators.max(1)],
      ],
    });

    // Inicializar con al menos un ítem
    this.agregarManoObra();
  }

  // Getters
  get manoObra(): FormArray {
    return this.formulario.get('manoObra') as FormArray;
  }

  get cargasSociales(): number {
    return this.formulario.get('cargasSociales')?.value || 0.55;
  }

  get iva(): number {
    return this.formulario.get('iva')?.value || 0.1494;
  }

  // Métodos
  agregarManoObra(): void {
    this.manoObra.push(
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

  eliminarManoObra(index: number): void {
    this.manoObra.removeAt(index);
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

  get subtotalManoObra(): number {
    return this.manoObra.controls.reduce((acc, control) => {
      const cantidad = control.get('cantidad')?.value || 0;
      const precio = control.get('precioUnitario')?.value || 0;
      return acc + cantidad * precio;
    }, 0);
  }

  get cargasManoObra(): number {
    return this.subtotalManoObra * this.cargasSociales;
  }

  get ivaManoObra(): number {
    return (this.subtotalManoObra + this.cargasManoObra) * this.iva;
  }

  get totalManoObra(): number {
    const total =
      this.subtotalManoObra + this.cargasManoObra + this.ivaManoObra;
    const decimal = total % 1;
    return decimal >= 0.5 ? Math.round(total) : total;
  }
}
