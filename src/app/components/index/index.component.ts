import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Registrocliente } from '../gestion_de_usuarios/registrocliente/registrocliente';

@Component({
  selector: 'app-index',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    Registrocliente,
  ],
  templateUrl: './index.component.html',
  styleUrl: './index.component.css',
})
export class IndexComponent {
  mostrarRegistro = false; // controla si se muestra el formulario

  constructor(private router: Router) {}

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  mostrarFormularioRegistro() {
    this.mostrarRegistro = true;
    window.scrollTo(0, 0); // opcional: desplazar al formulario
  }

  // Se conecta con el EventEmitter del hijo
  cerrarFormularioRegistro() {
    this.mostrarRegistro = false;
  }
}
