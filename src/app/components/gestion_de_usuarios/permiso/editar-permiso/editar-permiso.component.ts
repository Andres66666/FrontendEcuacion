import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OkComponent } from '../../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ServiciosService } from '../../../../services/servicios.service';

@Component({
  selector: 'app-editar-permiso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OkComponent, ErrorComponent],
  templateUrl: './editar-permiso.component.html',
  styleUrl: './editar-permiso.component.css'
})
export class EditarPermisoComponent implements OnInit {
  form!: FormGroup;
  permisoOriginal: any;
  mensajeExito: string = '';
  mensajeError: string = '';
  
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private permisoService: ServiciosService,
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
      estado: [true],
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.permisoService.getPermisoID(id).subscribe((data) => {
      this.permisoOriginal = data;
      this.form.patchValue(data);
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.permisoService.updatePermiso(this.form.value).subscribe({
        next: () => {
          this.mensajeExito = 'Permiso editado con éxito';
        },
        error: (error) => {
          this.mensajeError = 'Ocurrió un error al editar el Permiso';
          console.error('Error al editar Permiso:', error);
        },
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
  volver(): void {
    this.router.navigate(['panel-control/listar-permiso']);
  }
  restablecerFormulario(): void {
    if (this.permisoOriginal) {
      this.form.patchValue(this.permisoOriginal);
    }
  }
  manejarOk() {
    this.mensajeExito = '';
    this.router.navigate(['panel-control/listar-permiso']);
  }
  manejarError() {
    this.mensajeError = '';
  }
}
