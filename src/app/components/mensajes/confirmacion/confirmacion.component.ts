import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmacion.component.html',
})
export class ConfirmacionComponent {
  @Input() mensaje: string = '¿Desea continuar?';
  @Output() aceptar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  manejarAceptar() {
    this.aceptar.emit();
  }

  manejarCancelar() {
    this.cancelar.emit();
  }
}
