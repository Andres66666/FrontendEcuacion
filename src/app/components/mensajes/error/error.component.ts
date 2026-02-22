import { Component, EventEmitter, Input, Output } from '@angular/core';
@Component({
  selector: 'app-error',
  standalone: true,
  imports: [],
  templateUrl: './error.component.html',
  styleUrl: './error.component.css',
})
export class ErrorComponent {
  @Input() mensaje: string = ''; // Propiedad para recibir el mensaje
  @Output() close = new EventEmitter<void>();

  manejarCerrar() {
    this.close.emit(); // Emitir evento para cerrar el modal
  }
}
