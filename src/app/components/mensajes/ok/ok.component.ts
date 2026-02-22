import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-ok',
  standalone: true,
  imports: [],
  templateUrl: './ok.component.html',
  styleUrl: './ok.component.css',
})
export class OkComponent {
  @Input() mensaje: string = ''; // Propiedad para recibir el mensaje
  @Output() close = new EventEmitter<void>();

  manejarCerrar() {
    this.close.emit(); // Emitir evento para cerrar el modal
  }
}
