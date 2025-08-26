import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OkComponent } from '../../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { ServiciosService } from '../../../../services/servicios.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-crear-rol',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OkComponent, ErrorComponent],
  templateUrl: './crear-rol.component.html',
  styleUrl: './crear-rol.component.css'
})
export class CrearRolComponent {
  form!: FormGroup;
  mensajeExito: string = '';
  mensajeError: string = '';

  constructor(
    private fb: FormBuilder,
    private rolService: ServiciosService,
    private router: Router,
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
        ],
      ],
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.rolService.createRol(this.form.value).subscribe({
        next: () => {
          this.mensajeExito = 'Rol registrado con éxito';
        },
        error: (error) => {
          this.mensajeError = 'Ocurrió un error al registrar el rol';
          console.error('Error al registrar rol:', error);
        },
      });
    } else {
      this.form.markAllAsTouched(); // <- esto es correcto y necesario
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
    // Moved the navigation here, after the modal is closed
    this.router.navigate(['panel-control/listar-rol']);
  }

  manejarError() {
    this.mensajeError = '';
  }
}
