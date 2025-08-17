import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UsuarioRol } from '../../../../models/models';
import { ServiciosService } from '../../../../services/servicios.service';

@Component({
  selector: 'app-listar-usuario-rol',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './listar-usuario-rol.component.html',
  styleUrl: './listar-usuario-rol.component.css'
})
export class ListarUsuarioRolComponent implements OnInit {
  usuarioRolSucursales: UsuarioRol[] = [];
  filtrados: UsuarioRol[] = [];
  mostrados: UsuarioRol[] = [];

  busqueda = '';
  limite = 20;

  rolesDisponibles: string[] = [];


  rolSeleccionado = '';
  sucursalSeleccionada = '';

  constructor(
    private servicio: ServiciosService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.servicio.getUsuarioRoles().subscribe((data) => {
      this.usuarioRolSucursales = data;
      this.rolesDisponibles = [...new Set(data.map((urs) => urs.rol.nombre))];
     
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
    this.filtrados = this.usuarioRolSucursales.filter((urs) =>
      urs.usuario.nombre.toLowerCase().includes(texto),
    );
    this.limite = 10;
    this.actualizarMostrados();

    this.filtrados = this.usuarioRolSucursales.filter(
      (urs) =>
        urs.usuario.nombre.toLowerCase().includes(texto) &&
        (this.rolSeleccionado === '' ||
          urs.rol.nombre === this.rolSeleccionado)
    );
    this.limite = 10;
    this.actualizarMostrados();
  }

  irAEditar(id: number): void {
    this.router.navigate(['panel-control/editar-usuario-rol', id]);
  }

  irARegistrar(): void {
    this.router.navigate(['panel-control/registrar-usuario-rol']);
  }
}
