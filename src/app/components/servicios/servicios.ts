import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServiciosService } from '../../services/servicios.service';
import { UsuarioRol } from '../../models/models';

@Component({
  selector: 'app-servicios',
  imports: [CommonModule, FormsModule],
  templateUrl: './servicios.html',
  styleUrls: ['./servicios.css'],
})
export class Servicios {
  planSeleccionado: any = null;
  usuarioLogeado: any = null;

  planes = [
    { nombre: 'Mensual', precio: 0, nombreDescripcion: 'Gratis' },
    {
      nombre: 'Semestral',
      precio: 84,
      nombreDescripcion: 'Paga cada 6 meses',
    },
    { nombre: 'Anual', precio: 150, nombreDescripcion: 'Paga cada 12 meses' },
    {
      nombre: 'Suscriptor',
      precio: 120,
      nombreDescripcion: 'Cuota especial solo para clientes especiales',
    },
  ];

  constructor(private serviciosService: ServiciosService) {
    // Obtenemos el usuario logueado desde localStorage
    const usuario = localStorage.getItem('usuarioLogueado');
    this.usuarioLogeado = usuario ? JSON.parse(usuario) : null;
  }

  seleccionarPlan(plan: any) {
    this.planSeleccionado = plan;
  }

  // 👇 Simula la compra y asigna rol "Colaborador"
  realizarCompra() {
    if (!this.planSeleccionado) return;
    if (!this.usuarioLogeado) {
      alert('Debe iniciar sesión para comprar un plan.');
      return;
    }

    alert(
      `¡Compra exitosa! Plan: ${this.planSeleccionado.nombre} - Bs. ${this.planSeleccionado.precio}`
    );

    // Asignar rol "Colaborador"
    this.asignarRolColaborador(this.usuarioLogeado);
  }

  asignarRolColaborador(usuario: any) {
    this.serviciosService.getRoles().subscribe((roles) => {
      const rolColaborador = roles.find((r) => r.nombre === 'Colaborador');

      if (!rolColaborador) {
        alert('No se encontró el rol "Colaborador" en el sistema.');
        return;
      }

      // ⚠️ Enviar objetos completos, pero usamos Partial<UsuarioRol> para omitir el id
      this.serviciosService
        .createUsuarioRol({
          usuario: usuario,
          rol: rolColaborador,
        } as any)
        .subscribe({
          next: () => {
            alert('Rol "Colaborador" asignado correctamente');

            if (!usuario.roles) usuario.roles = [];
            usuario.roles.push('Colaborador');
            localStorage.setItem('usuarioLogueado', JSON.stringify(usuario));
          },
          error: (err) => {
            console.error(err);
            alert(err.error.error || 'Error asignando rol');
          },
        });
    });
  }
}
