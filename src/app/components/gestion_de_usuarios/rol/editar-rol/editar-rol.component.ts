import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OkComponent } from '../../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../../mensajes/error/error.component';
import { ServiciosService } from '../../../../services/servicios.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-editar-rol',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OkComponent, ErrorComponent],
  templateUrl: './editar-rol.component.html',
  styleUrl: './editar-rol.component.css'
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

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.rolService.getRolID(id).subscribe((data) => {
      this.rolOriginal = data;
      this.form.patchValue(data);
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.rolService.updateRol(this.form.value).subscribe({
        next: () => {
          this.mensajeExito = 'Rol editado con éxito';
        },
        error: (error) => {
          this.mensajeError = 'Ocurrió un error al editar el rol';
          console.error('Error al editar rol:', error);
        },
      });
    } else {
      this.form.markAllAsTouched(); // <- esto es correcto y necesario
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
