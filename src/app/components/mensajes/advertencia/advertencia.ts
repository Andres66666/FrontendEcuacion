import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
@Component({
  selector: 'app-advertencia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './advertencia.html',
  styleUrl: './advertencia.css',
})
export class Advertencia {
  @Input() mensaje: string = 'Advertencia: revise la información.';
  @Output() close = new EventEmitter<void>();
  manejarCerrar() {
    this.close.emit();
  }
}
