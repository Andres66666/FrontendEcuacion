import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OkComponent } from '../../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { ServiciosService } from '../../../../services/servicios.service';
import { Router } from '@angular/router';
import { CustomValidatorsService } from '../../../../shared/custom-validators.service';

@Component({
  selector: 'app-crear-permiso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OkComponent, ErrorComponent],
  templateUrl: './crear-permiso.component.html',
  styleUrl: './crear-permiso.component.css'
})
export class CrearPermisoComponent {
  form!: FormGroup;
  mensajeExito: string = '';
  mensajeError: string = '';
  constructor(
    private fb: FormBuilder,
    private permisoService: ServiciosService,
    private router: Router,
    private customValidators: CustomValidatorsService,
  ) { }
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
      ],
      estado: [true],
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.permisoService.createPermiso(this.form.value).subscribe({
        next: () => {
          this.mensajeExito = 'Permiso registrado con éxito';
        },
        error: (error) => {
          this.mensajeError = 'Ocurrió un error al registrar el Permiso';
          console.error('Error al registrar Permiso:', error);
        },
      });
    } else {
      this.form.markAllAsTouched(); // <- esto es correcto y necesario
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
