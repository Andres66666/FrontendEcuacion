import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ServiciosService } from '../../../services/servicios.service';
import { EquipoHerramienta } from '../../../models/models';

@Component({
  selector: 'app-crear-equipo-herramienta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-equipo-herramienta.component.html',
  styleUrl: './crear-equipo-herramienta.component.css',
})
export class CrearEquipoHerramientaComponent {
  formulario: FormGroup;
  id_gasto_operaciones = 0;
  herramientas = 0;
  totalManoObra = 0;
  porcentaje_global_100 = 0;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private servicio: ServiciosService
  ) {
    this.formulario = this.fb.group({
      equipos: this.fb.array([]),
      herramientas: [0, [Validators.required, Validators.min(0.05)]],
    });
    this.agregarEquipo();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      this.herramientas = Number(params['herramientas']) || 0;
      this.porcentaje_global_100 = Number(params['porcentaje_global_100']) || 0;
      this.formulario.get('herramientas')?.setValue(this.herramientas);
      this.formulario.get('porcentaje_global_100')?.setValue(this.porcentaje_global_100);
      if (this.id_gasto_operaciones) this.cargarEquipoHerramientaExistente();
    });
    this.servicio.totalManoObra$.subscribe((total) => (this.totalManoObra = total));
  }
    unidadTexto(value: string): string {
    const map: { [key: string]: string } = {
      h: 'h – hora',
      dia: 'día – día',
      sem: 'sem – semana',
      mes: 'mes – mes',
    };
    return map[value] || 'Seleccione unidad';
  }

  get equipos(): FormArray {
    return this.formulario.get('equipos') as FormArray;
  }
  get herramienta(): number {
    return this.formulario.get('herramientas')?.value;
  }

  agregarEquipo(): void {
    this.equipos.push(
      this.fb.group({
        descripcion: ['', Validators.required],
        unidad: ['', Validators.required],
        cantidad: [1, [Validators.required, Validators.min(1)]],
        precio_unitario: [1, [Validators.required, Validators.min(1)]],
        total: [{ value: 1, disabled: true }],
        esNuevo: [true],
        editarUnidad: [true],
      })
    );
  }

  cargarEquipoHerramientaExistente(): void {
    this.servicio.getEquipoHerramientas(this.id_gasto_operaciones).subscribe((equipos) => {
      this.equipos.clear();
      equipos.forEach((equipo) => {
        this.equipos.push(
          this.fb.group({
            id: [equipo.id],
            descripcion: [equipo.descripcion, Validators.required],
            unidad: [equipo.unidad, Validators.required],
            cantidad: [equipo.cantidad, [Validators.required, Validators.min(1)]],
            precio_unitario: [equipo.precio_unitario, [Validators.required, Validators.min(1)]],
            total: [{ value: equipo.total, disabled: true }],
            esNuevo: [false],
            editarUnidad: [false],
          })
        );
      });
    });
  }

  registrarItem(index: number): void {
    const trabajo = this.equipos.at(index);
    if (trabajo.invalid) {
      trabajo.markAllAsTouched();
      return;
    }
    const nuevoTrabajo: EquipoHerramienta = {
      id: 0,
      id_gasto_operacion: this.id_gasto_operaciones,
      descripcion: trabajo.get('descripcion')?.value,
      unidad: trabajo.get('unidad')?.value,
      cantidad: trabajo.get('cantidad')?.value,
      precio_unitario: trabajo.get('precio_unitario')?.value,
      total: trabajo.get('total')?.value,
    };
    this.servicio.createEquipoHerramienta(nuevoTrabajo).subscribe((res) => {
      trabajo.patchValue({ id: res.id, esNuevo: false });
    });
  }

  actualizarItem(index: number): void {
    const trabajo = this.equipos.at(index);
    if (trabajo.invalid || !trabajo.get('id')?.value) return;
    const trabajoActualizado: EquipoHerramienta = {
      id: trabajo.get('id')?.value,
      id_gasto_operacion: this.id_gasto_operaciones,
      descripcion: trabajo.get('descripcion')?.value,
      unidad: trabajo.get('unidad')?.value,
      cantidad: trabajo.get('cantidad')?.value,
      precio_unitario: trabajo.get('precio_unitario')?.value,
      total: trabajo.get('total')?.value,
    };
    this.servicio.updateEquipoHerramienta(trabajoActualizado).subscribe();
  }

  eliminarItem(index: number): void {
    const trabajo = this.equipos.at(index);
    if (trabajo.get('esNuevo')?.value) {
      this.equipos.removeAt(index);
    } else {
      this.servicio.deleteEquipoHerramienta(trabajo.get('id')?.value).subscribe(() => {
        this.equipos.removeAt(index);
      });
    }
  }

  actualizarPrecioParcial(control: AbstractControl): void {
    const cantidad = control.get('cantidad')?.value || 0;
    const precio_unitario = control.get('precio_unitario')?.value || 0;
    control.get('total')?.setValue(cantidad * precio_unitario, { emitEvent: false });
  }

  onUnidadChange(control: AbstractControl): void {
    control.get('unidad')?.markAsTouched();
  }
  onCantidadChange(control: AbstractControl): void {
    control.get('cantidad')?.markAsTouched();
    this.actualizarPrecioParcial(control);
  }
  onPrecioUniChange(control: AbstractControl): void {
    control.get('precio_unitario')?.markAsTouched();
    this.actualizarPrecioParcial(control);
  }
  blockE(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  }

  get subtotalEquipos(): number {
    return this.equipos.controls.reduce((acc, control) => {
      const cantidad = control.get('cantidad')?.value || 0;
      const precio = control.get('precio_unitario')?.value || 0;
      return acc + cantidad * precio;
    }, 0);
  }
  get herramientasPorcentaje(): number {
    return this.totalManoObra * (this.herramientas / this.porcentaje_global_100);
  }
  get totalEquipos(): number {
    const total = this.subtotalEquipos + this.herramientasPorcentaje;
    const decimal = total % 1;
    const finalTotal = decimal >= 0.5 ? Math.round(total) : total;
    this.servicio.setTotalEquipos(finalTotal);
    return finalTotal;
  }
}