import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { OkComponent } from '../../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { ServiciosService } from '../../../../services/servicios.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomValidatorsService } from '../../../../../validators/custom-validators.service';

@Component({
  selector: 'app-editar-rol',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OkComponent, ErrorComponent],
  templateUrl: './editar-rol.component.html',
  styleUrl: './editar-rol.component.css',
})
export class EditarRolComponent implements OnInit {
  form!: FormGroup;
  rolOriginal: any;
  mensajeExito: string = '';
  mensajeError: string = '';

  constructor(
    private fb: FormBuilder,
    private rolService: ServiciosService,
    private route: ActivatedRoute,
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
      ],
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.rolService.getRolID(id).subscribe((data) => {
      this.rolOriginal = data;

      // ✅ Aplicar validador asíncrono rolUnico con el id actual
      this.form
        .get('nombre')
        ?.setAsyncValidators(this.customValidators.rolUnico(id));

      this.form.patchValue(data);
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      let nombre = this.form.value.nombre.trim().replace(/\s+/g, ' ');
      nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();

      const rolActualizado = { ...this.form.value, nombre };

      this.rolService.updateRol(rolActualizado).subscribe({
        next: () => {
          this.mensajeExito = 'Rol editado con éxito';
        },
        error: (error) => {
          this.mensajeError = 'Ocurrió un error al editar el rol';
          console.error('Error al editar rol:', error);
        },
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  volver(): void {
    this.router.navigate(['panel-control/listar-rol']);
  }

  restablecerFormulario(): void {
    if (this.rolOriginal) {
      this.form.patchValue(this.rolOriginal);
    }
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
