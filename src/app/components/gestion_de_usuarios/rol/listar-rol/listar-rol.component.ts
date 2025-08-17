import { Component } from '@angular/core';
import { Rol } from '../../../../models/models';
import { ServiciosService } from '../../../../services/servicios.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-listar-rol',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './listar-rol.component.html',
  styleUrl: './listar-rol.component.css'
})
export class ListarRolComponent {
  roles: Rol[] = [];
  rolesFiltrados: Rol[] = [];
  rolesMostrados: Rol[] = [];

  busqueda = '';
  filtroEstado: string = 'activos'; // por defecto solo activos

  limite = 10;

  constructor(
    private rolService: ServiciosService,
    private router: Router,
  ) { }
  ngOnInit(): void {
    this.rolService.getRoles().subscribe((data) => {
      this.roles = data;
      this.filtrar();
    });
  }
  actualizarRolesMostrados(): void {
    this.rolesMostrados = this.rolesFiltrados.slice(0, this.limite);
  }
  onScroll(event: Event): void {
    const div = event.target as HTMLElement;
    const alFinal = div.scrollTop + div.clientHeight >= div.scrollHeight - 5;
    if (alFinal) {
      this.limite += 10;
      this.actualizarRolesMostrados();
    }
  }
  filtrar(): void {
    const texto = this.busqueda.trim();
    const esMayus = texto === texto.toUpperCase();

    this.rolesFiltrados = this.roles
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
    this.actualizarRolesMostrados();
  }
  cambiarEstado(rol: Rol): void {
    const actualizado = { ...rol, estado: !rol.estado };
    this.rolService.updateRol(actualizado).subscribe({
      next: () => {
        rol.estado = actualizado.estado;
        this.filtrar();
      },
      error: (err) => console.error('Error al cambiar el estado:', err),
    });
  }

  irAEditar(id: number): void {
    this.router.navigate(['panel-control/editar-rol', id]);
  }

  irARegistrar(): void {
    this.router.navigate(['panel-control/registrar-rol']);
  }
}
