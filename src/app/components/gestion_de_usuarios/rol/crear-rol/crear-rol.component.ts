import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CustomValidatorsService } from '../../../../../validators/custom-validators.service';
import { ServiciosService } from '../../../../services/servicios.service';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { OkComponent } from '../../../mensajes/ok/ok.component';

@Component({
  selector: 'app-crear-rol',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OkComponent, ErrorComponent],
  templateUrl: './crear-rol.component.html',
  styleUrl: './crear-rol.component.css',
})
export class CrearRolComponent {
  form!: FormGroup;
  mensajeExito: string = '';
  mensajeError: string = '';

  constructor(
    private fb: FormBuilder,
    private rolService: ServiciosService,
    private router: Router,
    private customValidators: CustomValidatorsService,
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
        [this.customValidators.rolUnico()],
      ],
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      let nombre = this.form.value.nombre.trim().replace(/\s+/g, ' ');
      nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();

      const rolFormateado = { ...this.form.value, nombre };

      this.rolService.createRol(rolFormateado).subscribe({
        next: () => {
          this.mensajeExito = 'Rol registrado con éxito';
        },
        error: (error) => {
          this.mensajeError = 'Ocurrió un error al registrar el rol';
          console.error('Error al registrar rol:', error);
        },
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  volver(): void {
    this.router.navigate(['panel-control/listar-rol']);
  }

  limpiarFormulario(): void {
    this.form.reset({
      id: null,
      nombre: null,
    });
  }

  manejarOk() {
    this.mensajeExito = '';
    this.router.navigate(['panel-control/listar-rol']);
  }

  manejarError() {
    this.mensajeError = '';
  }
}
