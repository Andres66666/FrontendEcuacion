import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Permiso } from '../../../../models/models';
import { ServiciosService } from '../../../../services/servicios.service';

@Component({
  selector: 'app-listar-permiso',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './listar-permiso.component.html',
  styleUrl: './listar-permiso.component.css'
})
export class ListarPermisoComponent {
  permisos: Permiso[] = [];
  permisosFiltrados: Permiso[] = [];
  permisosMostrados: Permiso[] = [];

  busqueda = '';
  filtroEstado: string = 'activos';
  limite = 10;
  constructor(
    private permisoService: ServiciosService,
    private router: Router,
  ) { }
  ngOnInit(): void {
    this.permisoService.getPermisos().subscribe((data) => {
      this.permisos = data;
      this.filtrar();
    });
  }

  actualizarPermisosMostrados(): void {
    this.permisosMostrados = this.permisosFiltrados.slice(0, this.limite);
  }

  onScroll(event: Event): void {
    const div = event.target as HTMLElement;
    const alFinal = div.scrollTop + div.clientHeight >= div.scrollHeight - 5;
    if (alFinal) {
      this.limite += 10;
      this.actualizarPermisosMostrados();
    }
  }

  filtrar(): void {
    const texto = this.busqueda.trim();
    const esMayus = texto === texto.toUpperCase();

    this.permisosFiltrados = this.permisos
      .filter(({ nombre = '', estado }) => {
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
    this.actualizarPermisosMostrados();
  }

  cambiarEstado(permiso: Permiso): void {
    const actualizado = { ...permiso, estado: !permiso.estado };
    this.permisoService.updatePermiso(actualizado).subscribe({
      next: () => {
        permiso.estado = actualizado.estado;
        this.filtrar();
      },
      error: (err) => console.error('Error al cambiar el estado:', err),
    });
  }

  irAEditar(id: number): void {
    this.router.navigate(['panel-control/editar-permiso', id]);
  }

  irARegistrar(): void {
    this.router.navigate(['panel-control/registrar-permiso']);
  }
}
