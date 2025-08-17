import { Component } from '@angular/core';
import { Ecuacion } from '../../../../models/models';
import { ServiciosService } from '../../../../services/servicios.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-listar-ecuacion',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './listar-ecuacion.component.html',
  styleUrl: './listar-ecuacion.component.css',
})
export class ListarEcuacionComponent {
  ecuaciones: Ecuacion[] = [];
  ecuacionesFiltradas: Ecuacion[] = [];
  ecuacionesMostradas: Ecuacion[] = [];

  busqueda = '';
  filtroEstado: string = 'activos'; // por defecto solo activos

  limite = 10;

  constructor(
    private ecuacionService: ServiciosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.ecuacionService.getEcuaciones().subscribe((data) => {
      this.ecuaciones = data;
      /* this.filtrar(); */
    });
  }

  actualizarEcuacionesMostradas(): void {
    this.ecuacionesMostradas = this.ecuacionesFiltradas.slice(0, this.limite);
  }

  onScroll(event: Event): void {
    const div = event.target as HTMLElement;
    const alFinal = div.scrollTop + div.clientHeight >= div.scrollHeight - 5;
    if (alFinal) {
      this.limite += 10;
      this.actualizarEcuacionesMostradas();
    }
  }

  /*   filtrar(): void {
    const texto = this.busqueda.trim();
    const esMayus = texto === texto.toUpperCase();

    this.ecuacionesFiltradas = this.ecuaciones
      .filter(({ nombre, estado }) => {
        const coincideTexto = esMayus
          ? nombre.includes(texto)
          : nombre.toLowerCase().includes(texto.toLowerCase());

        const coincideEstado =
          (this.filtroEstado === 'activos' && estado) ||
          (this.filtroEstado === 'inactivos' && !estado) ||
          this.filtroEstado === 'todos';

        return coincideTexto && coincideEstado;
      })
      .sort((a, b) => Number(b.estado) - Number(a.estado));

    this.limite = 10;
    this.actualizarEcuacionesMostradas();
  }

  cambiarEstado(ecuacion: Ecuacion): void {
    const actualizado = { ...ecuacion, estado: !ecuacion.estado };
    this.ecuacionService.updateEcuacion(actualizado).subscribe({
      next: () => {
        ecuacion.estado = actualizado.estado;
        this.filtrar();
      },
      error: (err) => console.error('Error al cambiar el estado:', err),
    });
  } */

  irAEditar(id: number): void {
    this.router.navigate(['panel-control/EditarEcuacion', id]);
  }

  irARegistrar(): void {
    this.router.navigate(['panel-control/CrearEcuacion']);
  }
}
