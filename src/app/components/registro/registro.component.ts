import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  AbstractControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common'; // Necesario para *ngIf y otras directivas
import { NgIf } from '@angular/common';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, NgIf],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css'],
})
export class RegistroComponent {
  registerForm: FormGroup;

  constructor(private fb: FormBuilder, private alertService: AlertService) {
    this.registerForm = this.fb.group({
      ci: ['', [Validators.required, Validators.pattern(/^\d{7,13}$/)]],
      telefono: ['', [Validators.required, Validators.pattern(/^[67]\d{7}$/)]],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      fecha_nacimiento: ['', [Validators.required, this.validateAge]],
      clave: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Z])(?=.*[^A-Za-z0-9])(?=.{8,})/),
        ],
      ],
    });
  }

  // función para bloquear la letra e y símbolos +,- en campos numéricos
  blockE(event: KeyboardEvent) {
    if (['e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault();
    }
  }

  // validación edad
  validateAge(control: AbstractControl): { [key: string]: any } | null {
    const birthDate = new Date(control.value);
    if (!birthDate || isNaN(birthDate.getTime())) return null;

    // Obtener la hora actual en UTC
    const nowUTC = new Date();

    // Ajustar a hora de Bolivia (UTC-4)
    const boliviaTime = new Date(nowUTC.getTime() - 4 * 60 * 60 * 1000); // Restamos 4 horas

    const age = boliviaTime.getFullYear() - birthDate.getFullYear();
    const monthDiff = boliviaTime.getMonth() - birthDate.getMonth();
    const dayDiff = boliviaTime.getDate() - birthDate.getDate();
    const hourDiff = boliviaTime.getHours() - birthDate.getHours();
    const minuteDiff = boliviaTime.getMinutes() - birthDate.getMinutes();

    const isUnderage =
      age < 18 ||
      (age === 18 &&
        (monthDiff < 0 ||
          (monthDiff === 0 && dayDiff < 0) ||
          (monthDiff === 0 && dayDiff === 0 && hourDiff < 0) ||
          (monthDiff === 0 &&
            dayDiff === 0 &&
            hourDiff === 0 &&
            minuteDiff < 0))); // calcula exactamente que el usuario sea mayor de edad

    return isUnderage ? { underage: true } : null;
  }

  onSubmit() {
    const formValues = this.registerForm.value;
    const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9])(?=.{8,})/;

    const allFieldsEmpty = Object.values(formValues).every((value) => {
      if (typeof value === 'string') {
        return value.trim() === '';
      }
      return !value; // para campos no string como null, undefined, etc.
    });

    if (allFieldsEmpty) {
      this.alertService.show({
        title: 'Formulario vacío',
        description: 'Por favor, complete los campos antes de continuar.',
        bgColor: '#fff3cd',
        textColor: '#856404',
        timeout: 4000,
        closable: true,
      });
      return; // Evita seguir con la validación si está vacío
    }

    if (this.registerForm.valid) {
      console.log('Registro:', this.registerForm.value);
    } else {
      this.alertService.show({
        title: 'Error en el registro',
        description:
          'Datos incorrectos. \n revise sus datos y vuelva a intentarlo',
        bgColor: '#f8d7da',
        textColor: '#721c24',
        timeout: 5000,
        closable: true,
      });
    }
  }
}
