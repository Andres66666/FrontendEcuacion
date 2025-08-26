import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ActivatedRoute } from '@angular/router';
import { ServiciosService } from '../../../services/servicios.service';
import { Materiales } from '../../../models/models';

@Component({
  selector: 'app-crear-materiales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './crear-materiales.component.html',
  styleUrl: './crear-materiales.component.css',
})
export class CrearMaterialesComponent {
  formulario: FormGroup;
  id_gasto_operaciones = 0;

  constructor(
    private fb: FormBuilder,
    private servicio: ServiciosService,
    private route: ActivatedRoute
  ) {
    this.formulario = this.fb.group({
      materiales: this.fb.array([]),
    });
    this.agregarMaterial();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      if (this.id_gasto_operaciones) this.cargarMaterialesExistentes();
    });
  }

  get materiales(): FormArray {
    return this.formulario.get('materiales') as FormArray;
  }

  get totalMateriales(): number {
    const total = this.materiales.controls.reduce((acc, mat) => {
      const cantidad = mat.get('cantidad')?.value || 0;
      const precio = mat.get('precio_unitario')?.value || 0;
      return acc + cantidad * precio;
    }, 0);
    this.servicio.setTotalMateriales(total);
    return total;
  }

  agregarMaterial(): void {
    this.materiales.push(
      this.fb.group({
        id: [null],
        descripcion: ['', Validators.required],
        unidad: ['', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/)]],
        cantidad: [1, [Validators.required, Validators.min(1)]],
        precio_unitario: [1, [Validators.required, Validators.min(1)]],
        total: [{ value: 1, disabled: true }],
        esNuevo: [true],
      })
    );
  }

  cargarMaterialesExistentes(): void {
    this.servicio.getMaterialesIDGasto(this.id_gasto_operaciones).subscribe((materiales) => {
      this.materiales.clear();
      materiales.forEach((mat) => {
        this.materiales.push(
          this.fb.group({
            id: [mat.id],
            descripcion: [mat.descripcion, Validators.required],
            unidad: [mat.unidad, [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/)]],
            cantidad: [mat.cantidad, [Validators.required, Validators.min(1)]],
            precio_unitario: [mat.precio_unitario, [Validators.required, Validators.min(1)]],
            total: [{ value: mat.total, disabled: true }],
            esNuevo: [false],
          })
        );
      });
    });
  }

  registrarItem(index: number): void {
    const mat = this.materiales.at(index);
    if (mat.invalid) {
      mat.markAllAsTouched();
      return;
    }
    const nuevoMaterial: Materiales = {
      id: 0,
      id_gasto_operacion: this.id_gasto_operaciones,
      descripcion: mat.get('descripcion')?.value,
      unidad: mat.get('unidad')?.value,
      cantidad: mat.get('cantidad')?.value,
      precio_unitario: mat.get('precio_unitario')?.value,
      total: mat.get('total')?.value,
    };
    this.servicio.createMaterial(nuevoMaterial).subscribe((res) => {
      mat.patchValue({ id: res.id, esNuevo: false });
    });
  }

  actualizarItem(index: number): void {
    const mat = this.materiales.at(index);
    if (mat.invalid || !mat.get('id')?.value) return;
    const materialActualizado: Materiales = {
      id: mat.get('id')?.value,
      id_gasto_operacion: this.id_gasto_operaciones,
      descripcion: mat.get('descripcion')?.value,
      unidad: mat.get('unidad')?.value,
      cantidad: mat.get('cantidad')?.value,
      precio_unitario: mat.get('precio_unitario')?.value,
      total: mat.get('total')?.value,
    };
    this.servicio.updateMaterial(materialActualizado).subscribe();
  }

  eliminarItem(index: number): void {
    const mat = this.materiales.at(index);
    if (mat.get('esNuevo')?.value) {
      this.materiales.removeAt(index);
    } else {
      this.servicio.deleteMaterial(mat.get('id')?.value).subscribe(() => {
        this.materiales.removeAt(index);
      });
    }
  }

  actualizarPrecioParcial(control: AbstractControl): void {
    const cantidad = control.get('cantidad')?.value || 0;
    const precio_unitario = control.get('precio_unitario')?.value || 0;
    control.get('total')?.setValue(cantidad * precio_unitario, { emitEvent: false });
  }

  onUnidadChange(control: AbstractControl): void {
    control.get('unidad')?.markAsTouched();
  }
  onCantidadChange(control: AbstractControl): void {
    control.get('cantidad')?.markAsTouched();
    this.actualizarPrecioParcial(control);
  }
  onPrecioUniChange(control: AbstractControl): void {
    control.get('precio_unitario')?.markAsTouched();
    this.actualizarPrecioParcial(control);
  }
  blockE(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  }
}