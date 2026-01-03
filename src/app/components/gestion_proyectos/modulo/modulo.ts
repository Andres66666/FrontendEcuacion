import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modulo } from '../models/modelosProyectos';
import { ServiciosProyectos } from '../service/servicios-proyectos';

@Component({
  selector: 'app-modulo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modulo.html',
  styleUrl: './modulo.css',
})
export class ModuloComponent implements OnInit, OnChanges {
  @Input() idProyecto!: number;

  modulos: Modulo[] = [];

  moduloForm: Partial<Modulo> = {
    codigo: '',
    nombre: '',
  };
  // modal
  mostrarModal = false;
  modoEdicion = false;
  moduloEditando!: Modulo;
  modulosAbierto = false;
  constructor(private service: ServiciosProyectos) {}

  ngOnInit() {
    if (this.idProyecto) {
      this.cargarModulos();
    }
  }
  toggleModulos() {
    this.modulosAbierto = !this.modulosAbierto;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['idProyecto'] && changes['idProyecto'].currentValue) {
      this.cargarModulos();
    }
  }

  cargarModulos() {
    this.service
      .getModulosPorProyecto(this.idProyecto)
      .subscribe((res) => (this.modulos = res));
  }

  // ================== CREAR ==================
  guardarModulo() {
    if (!this.moduloForm.nombre?.trim()) return;

    const existe = this.modulos.some(
      (m) => m.nombre.toLowerCase() === this.moduloForm.nombre!.toLowerCase()
    );

    if (existe) {
      alert('Este módulo ya existe en el proyecto');
      return;
    }

    const payload: Partial<Modulo> = {
      ...this.moduloForm,
      proyecto: this.idProyecto,
    };

    this.service.createModulo(payload).subscribe(() => {
      this.moduloForm = { codigo: '', nombre: '' };
      this.cargarModulos();
    });
  }
  abrirNuevo() {
    this.modoEdicion = false;
    this.moduloForm = { codigo: '', nombre: '' };
    this.mostrarModal = true;
  }

  // ================== EDITAR ==================
  abrirEditar(m: Modulo) {
    this.modoEdicion = true;
    this.moduloEditando = m;
    this.moduloForm = { ...m };
    this.mostrarModal = true;
  }

  actualizarModulo() {
    if (!this.moduloForm.nombre?.trim()) return;

    const existe = this.modulos.some(
      (m) =>
        m.id !== this.moduloEditando.id &&
        m.nombre.toLowerCase() === this.moduloForm.nombre!.toLowerCase()
    );

    if (existe) {
      alert('Ya existe un módulo con ese nombre');
      return;
    }

    this.service
      .updateModulo(this.moduloEditando.id, this.moduloForm)
      .subscribe(() => {
        this.mostrarModal = false;
        this.cargarModulos();
      });
  }
  guardarDesdeModal() {
    if (this.modoEdicion) {
      this.actualizarModulo();
    } else {
      this.guardarModulo();
      this.mostrarModal = false;
    }
  }

  eliminarModulo(id: number) {
    if (!confirm('¿Eliminar módulo?')) return;

    this.service.deleteModulo(id).subscribe(() => {
      this.cargarModulos();
    });
  }
  toUpper(field: 'codigo' | 'nombre') {
    if (this.moduloForm[field]) {
      this.moduloForm[field] = this.moduloForm[field]!.toUpperCase();
    }
  }
}
