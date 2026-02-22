import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { OkComponent } from '../../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { ServiciosService } from '../../../../services/servicios.service';
import { Router } from '@angular/router';
import { CustomValidatorsService } from '../../../../../validators/custom-validators.service';

@Component({
  selector: 'app-crear-permiso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OkComponent, ErrorComponent],
  templateUrl: './crear-permiso.component.html',
  styleUrl: './crear-permiso.component.css',
})
export class CrearPermisoComponent {
  form!: FormGroup;
  mensajeExito: string = '';
  mensajeError: string = '';
  constructor(
    private fb: FormBuilder,
    private permisoService: ServiciosService,
    private router: Router,
    private customValidators: CustomValidatorsService
  ) {}
  ngOnInit(): void {
    this.form = this.fb.group({
      id: [null],
      nombre: [
        null,
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
          this.customValidators.soloTexto(),
        ],
        [this.customValidators.permisoUnico()],
      ],
      estado: [true],
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      // 🔹 Normalizar nombre
      let nombre = this.form.value.nombre.trim().replace(/\s+/g, ' ');
      nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();

      const permisoFormateado = {
        ...this.form.value,
        nombre,
      };

      this.permisoService.createPermiso(permisoFormateado).subscribe({
        next: () => {
          this.mensajeExito = 'Permiso registrado con éxito';
        },
        error: (error) => {
          this.mensajeError = 'Ocurrió un error al registrar el Permiso';
          console.error('Error al registrar Permiso:', error);
        },
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  volver(): void {
    this.router.navigate(['panel-control/listar-permiso']);
  }

  limpiarFormulario(): void {
    this.form.reset({
      id: null,
      nombre: null,
      estado: true,
    });
  }
  manejarOk() {
    this.mensajeExito = '';
    // Moved the navigation here, after the modal is closed
    this.router.navigate(['panel-control/listar-permiso']);
  }

  manejarError() {
    this.mensajeError = '';
  }
}
