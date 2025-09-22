import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-advertencia',
  imports: [CommonModule],
  templateUrl: './advertencia.html',
  styleUrl: './advertencia.css'
})
export class Advertencia {
 @Input() mensaje: string = 'Advertencia: revise la información.';
  @Output() close = new EventEmitter<void>();  // Evento para cerrar (similar a OkComponent)
  manejarCerrar() {
    this.close.emit();
  }
}
