import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RolPermiso } from '../../../../models/models';
import { ServiciosService } from '../../../../services/servicios.service';

@Component({
  selector: 'app-listar-rol-permiso',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './listar-rol-permiso.component.html',
  styleUrl: './listar-rol-permiso.component.css'
})
export class ListarRolPermisoComponent implements OnInit {
  usuarioRolSucursales: RolPermiso[] = [];
  filtrados: RolPermiso[] = [];
  mostrados: RolPermiso[] = [];
  busqueda = '';
  limite = 10;

  roles: { nombre: string }[] = [];
  permisos: { nombre: string }[] = [];

  filtroRol = '';
  filtroPermiso = '';

  constructor(
    private servicio: ServiciosService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.servicio.getRolPermiso().subscribe((data) => {
      this.usuarioRolSucursales = data;
      this.roles = this.extraerUnicos(data.map((x) => x.rol));
      this.permisos = this.extraerUnicos(data.map((x) => x.permiso));
      this.filtrar();
    });
  }
  actualizarMostrados(): void {
    this.mostrados = this.filtrados.slice(0, this.limite);
  }
  onScroll(event: Event): void {
    const div = event.target as HTMLElement;
    const alFinal = div.scrollTop + div.clientHeight >= div.scrollHeight - 5;
    if (alFinal) {
      this.limite += 10;
      this.actualizarMostrados();
    }
  }
  filtrar(): void {
    const texto = this.busqueda.trim().toLowerCase();
    this.filtrados = this.usuarioRolSucursales.filter(
      (rp) =>
        rp.rol.nombre.toLowerCase().includes(texto) &&
        (this.filtroRol === '' || rp.rol.nombre === this.filtroRol) &&
        (this.filtroPermiso === '' || rp.permiso.nombre === this.filtroPermiso),
    );
    this.limite = 10;
    this.actualizarMostrados();
  }

  extraerUnicos(arr: { nombre: string }[]): { nombre: string }[] {
    const nombresUnicos = [...new Set(arr.map((x) => x.nombre))];
    return nombresUnicos.map((nombre) => ({ nombre }));
  }
  irAEditar(id: number): void {
    this.router.navigate(['panel-control/editar-rol-permiso', id]);
  }
  irARegistrar(): void {
    this.router.navigate(['panel-control/registrar-rol-permiso']);
  }
}
