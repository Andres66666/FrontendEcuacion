// src/app/shared/validators/custom-validators.service.ts
import { Injectable } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { ServiciosService } from '../services/servicios.service';

@Injectable({
  providedIn: 'root',
})
export class CustomValidatorsService {
  constructor(private userService: ServiciosService) {}

  // Validador para permitir solo texto (letras y espacios)
  soloTexto(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) return null; // Si el campo está vacío, es válido
      const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/; // Solo letras (mayúsculas y minúsculas) y espacios
      return regex.test(control.value) ? null : { soloTexto: true }; // Devuelve error si no cumple
    };
  }

  // Validador para dirección (letras, números y algunos caracteres especiales)
  direccionValida(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) return null; // Campo vacío es válido
      const regex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\.,#-]+$/; // Permite letras, números y caracteres comunes en direcciones
      return regex.test(control.value) ? null : { direccionInvalida: true }; // Devuelve error si es inválido
    };
  }

  validateEmail(): AsyncValidatorFn {
    return async (
      control: AbstractControl,
    ): Promise<ValidationErrors | null> => {
      const email = control.value?.trim();
      const regex = /^[a-zA-Z0-9._-]+@(gmail\.com|hotmail\.com|outlook\.com)$/;
      if (!email) return { required: true };
      if (!regex.test(email)) return { invalidEmail: true };

      try {
        const users = await this.userService.getUsuarios().toPromise();
        const emailExists = users?.some((user) => user.correo === email);
        return emailExists ? { emailExists: true } : null;
      } catch {
        return { userFetchError: true };
      }
    };
  }

  // Validador asincrónico para número de teléfono (formato y unicidad)
  // ✅ Validador sin necesidad de usar (keypress) en HTML
  validatePhone(): AsyncValidatorFn {
    return async (
      control: AbstractControl,
    ): Promise<ValidationErrors | null> => {
      const phone = control.value?.trim();

      if (!phone) return { required: true };

      // Validar que solo contenga números y tenga 8 dígitos comenzando con 6 o 7
      const regex = /^[67]\d{7}$/;
      if (!regex.test(phone)) return { invalidPhone: true };

      try {
        const users = await this.userService.getUsuarios().toPromise();
        const phoneExists = users?.some((user) => user.telefono === phone);
        return phoneExists ? { phoneExists: true } : null;
      } catch {
        return { userFetchError: true };
      }
    };
  }
  // Validador asincrónico para Cédula de Identidad (longitud válida y unicidad)
  validateCI(): AsyncValidatorFn {
    return async (
      control: AbstractControl,
    ): Promise<ValidationErrors | null> => {
      const ci = control.value?.trim();

      if (!ci) return { required: true };

      // Validar longitud del CI
      if (ci.length < 7 || ci.length > 8) {
        return { invalidCI: true };
      }

      try {
        const users = await this.userService.getUsuarios().toPromise();
        const ciExists = users?.some((user) => user.ci === ci);
        return ciExists ? { ciExists: true } : null;
      } catch {
        return { userFetchError: true };
      }
    };
  }

  // Validador para verificar que el usuario tenga al menos 18 años
  validateDateOfBirth(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) {
        return { required: true }; // Campo obligatorio
      }

      const dateOfBirth = new Date(control.value);
      const today = new Date();

      let age = today.getFullYear() - dateOfBirth.getFullYear();
      const monthDiff = today.getMonth() - dateOfBirth.getMonth();
      const dayDiff = today.getDate() - dateOfBirth.getDate();

      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }

      return age >= 18 ? null : { underage: true };
    };
  }

  // Validador para contraseña segura
  validatePassword(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const password = control.value;

      if (!password || password.trim() === '') {
        return { required: true };
      }

      const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

      return regex.test(password) ? null : { invalidPassword: true };
    };
  }

  /* este es es la seccion de productos de madera  */
  limpiarEspaciosValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const valor = control.value.trim().replace(/\s+/g, ' ');
      if (valor !== control.value) {
        control.setValue(valor, { emitEvent: false }); // Limpia los espacios
      }
      return null;
    };
  }
  /* validateProductoMaderaDuplicado(): AsyncValidatorFn {
    return async (
      control: AbstractControl,
    ): Promise<ValidationErrors | null> => {
      const formGroup = control.parent;
      if (!formGroup) return null;

      const especie = formGroup.get('especie')?.value?.trim().toLowerCase();
      const ancho = formGroup.get('ancho')?.value;
      const espesor = formGroup.get('espesor')?.value;
      const largo = formGroup.get('largo')?.value;
      const sucursal = formGroup.get('sucursal')?.value;

      if (!especie || !ancho || !espesor || !largo || !sucursal) return null;

      try {
        const productos = await this.userService
          .getProductoMaderas()
          .toPromise();
        if (!productos) return null;

        const existe = productos.some(
          (p) =>
            p.especie?.trim().toLowerCase() === especie &&
            +p.ancho === +ancho &&
            +p.espesor === +espesor &&
            +p.largo === +largo &&
            +p.sucursal?.id === +sucursal,
        );

        return existe ? { productoDuplicado: true } : null;
      } catch (err) {
        return { errorConsulta: true };
      }
    };
  } */
  formatoEspecie(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (!valor) return null;

      // Limpia espacios extremos
      const texto = valor.trim();

      // Verifica que solo tenga letras y espacios
      const soloLetrasYEspacios = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(texto);
      if (!soloLetrasYEspacios) {
        return { soloTexto: true };
      }

      // Verifica el formato tipo: Una sola palabra con primera letra mayúscula y el resto minúsculas
      const palabras = texto.split(' ');

      const formatoValido = palabras.every((palabra: string) =>
        /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,49}$/.test(palabra),
      );

      if (!formatoValido) {
        return { formatoInvalido: true };
      }

      return null;
    };
  }

  NoNegativo(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (value === null || value === undefined || value === '') {
        return null; // No validamos si está vacío; eso lo hace Validators.required
      }

      // Validar que sea un número positivo (entero o decimal)
      const regex = /^\d+(\.\d+)?$/;

      return regex.test(value) ? null : { invalido: true };
    };
  }
  soloNumeros(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (value === null || value === undefined || value === '') {
        return null;
      }

      const regex = /^[0-9]+$/; // solo dígitos enteros
      return regex.test(value.toString()) ? null : { soloNumeros: true };
    };
  }
  soloDosDecimales(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (value === null || value === undefined || value === '') {
        return null;
      }

      const regex = /^\d+(\.\d{1,2})?$/; // enteros o decimales con 1 o 2 decimales
      return regex.test(value.toString()) ? null : { soloDosDecimales: true };
    };
  }

  soloPositivosNumericos(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (value === null || value === undefined || value === '') {
        return null; // deja que Validators.required se encargue
      }

      // Acepta números enteros o decimales positivos
      const regex = /^\d+(\.\d{1,2})?$/; // opcionalmente 1 o 2 decimales

      return regex.test(value.toString())
        ? null
        : { soloPositivosNumericos: true };
    };
  }
}
