import { Injectable } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ServiciosService } from '../app/services/servicios.service';
@Injectable({
  providedIn: 'root',
})
export class CustomValidatorsService {
  constructor(private userService: ServiciosService) {}

  // Validador para permitir solo texto (letras y espacios)
  limpiarEspaciosValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const valor = control.value;
      // No permitir dos o más espacios seguidos
      if (/\s{2,}/.test(valor)) {
        return { espaciosMultiples: true };
      }
      return null;
    };
  }
  soloTextoUnEspacio(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) return null;
      const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+(?:\s[a-zA-ZáéíóúÁÉÍÓÚñÑ]+)*$/;
      return regex.test(control.value) ? null : { soloTexto: true };
    };
  }
  soloTexto(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) return null; 
      const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/; // Solo letras (mayúsculas y minúsculas) y espacios
      return regex.test(control.value) ? null : { soloTexto: true }; // Devuelve error si no cumple
    };
  }
  soloNumeros(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const regex = /^[0-9]+$/;
      return regex.test(control.value) ? null : { soloNumeros: true };
    };
  }
  rolUnico(idActual?: number): AsyncValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) {
        return of(null);
      }

      // Normalizamos el nombre
      const nombreNormalizado = control.value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

      return this.userService.getRoles().pipe(
        map((roles) => {
          const existe = roles.some((r) => {
            const nombreRol = r.nombre
              .trim()
              .toLowerCase()
              .replace(/\s+/g, ' ');
            // 🔹 Si el ID es diferente, entonces sí se considera duplicado
            return nombreRol === nombreNormalizado && r.id !== idActual;
          });
          return existe ? { rolExistente: true } : null;
        }),
        catchError((error) => {
          console.error('Error al validar rol:', error);
          return of(null);
        }),
      );
    };
  }
  permisoUnico(idActual?: number): AsyncValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) return of(null);

      const nombreNormalizado = control.value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

      return this.userService.getPermisos().pipe(
        map((permisos) => {
          const existe = permisos.some((p) => {
            const nombrePermiso = p.nombre
              .trim()
              .toLowerCase()
              .replace(/\s+/g, ' ');
            return nombrePermiso === nombreNormalizado && p.id !== idActual;
          });
          return existe ? { permisoExistente: true } : null;
        }),
        catchError((error) => {
          console.error('Error al validar permiso:', error);
          return of(null);
        }),
      );
    };
  }
  correoValido(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const email = control.value?.trim();
      if (!email) return { required: true };

      if (email.length > 30) return { maxLength: true };

      const regex = /^[a-zA-Z0-9._%+-]+@(gmail|hotmail|outlook)\.(com|es)$/;
      return regex.test(email) ? null : { invalidEmail: true };
    };
  }
  correoUnico(): AsyncValidatorFn {
    return async (
      control: AbstractControl,
    ): Promise<ValidationErrors | null> => {
      const email = control.value?.trim().toLowerCase();
      if (!email) return null;

      try {
        const users = await this.userService.getUsuarios().toPromise();
        const existe = users?.some(
          (u) => u.correo.trim().toLowerCase() === email,
        );
        return existe ? { emailExists: true } : null;
      } catch {
        return { userFetchError: true };
      }
    };
  }
  telefonoValido(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const phone = control.value?.trim();
      if (!phone) return { required: true };

      const regex = /^[67]\d{7}$/;
      return regex.test(phone) ? null : { invalidPhone: true };
    };
  }
  telefonoUnico(): AsyncValidatorFn {
    return async (
      control: AbstractControl,
    ): Promise<ValidationErrors | null> => {
      const phone = control.value?.trim();
      if (!phone) return null;

      try {
        const users = await this.userService.getUsuarios().toPromise();
        const existe = users?.some((u) => u.telefono === phone);
        return existe ? { phoneExists: true } : null;
      } catch {
        return { userFetchError: true };
      }
    };
  }
  ciValido(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const ci = control.value?.trim();
      if (!ci) return { required: true };
      if (!/^[0-9]+$/.test(ci)) return { soloNumeros: true };
      if (ci.length < 7 || ci.length > 8) return { invalidCI: true };
      return null;
    };
  }
  ciUnico(): AsyncValidatorFn {
    return async (
      control: AbstractControl,
    ): Promise<ValidationErrors | null> => {
      const ci = control.value?.trim();
      if (!ci) return null;

      try {
        const users = await this.userService.getUsuarios().toPromise();
        const existe = users?.some((u) => u.ci === ci);
        return existe ? { ciExists: true } : null;
      } catch {
        return { userFetchError: true };
      }
    };
  }
  mayorDeEdad(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return { required: true };

      const hoy = new Date();
      const fechaNacimiento = new Date(control.value);
      let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
      const mes = hoy.getMonth() - fechaNacimiento.getMonth();
      const dia = hoy.getDate() - fechaNacimiento.getDate();

      if (mes < 0 || (mes === 0 && dia < 0)) edad--;

      return edad >= 18 ? null : { underage: true };
    };
  }
  passwordSegura(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.value;
      if (!password || password.trim() === '') return { required: true };

      const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{11,}$/;
      return regex.test(password) ? null : { invalidPassword: true };
    };
  }
  passwordSeguraeditar(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.value;
      if (!password || password.trim() === '') return null; // Cambio aquí: Si está vacío, no retorna error
      const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{11,}$/; // Solo valida si hay un valor
      return regex.test(password) ? null : { invalidPassword: true };
    };
  }
}
