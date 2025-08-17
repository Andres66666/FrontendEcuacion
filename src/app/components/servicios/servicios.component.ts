import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './servicios.component.html',
  styleUrl: './servicios.component.css'
})
export class ServiciosComponent {
  selectedServicio: string = '';
  selectedPrecio: string = '';
  selectedQR: string = '';
  
  abrirModal(servicio: string, precio: string): void {
    this.selectedServicio = servicio;
    this.selectedPrecio = precio;
  

    // QR fijo para todos los servicios
    this.selectedQR = 'https://res.cloudinary.com/dexggkhkd/image/upload/v1751202172/QR_pj3gvz.jpg';
    // Mostrar modal
    const modalElement = document.getElementById('qrModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }
  obtenerMonto(servicio: string, precio: string): number {
    const precios: { [key: string]: number } = {
      'Calculadora Ecuacion_por servicio': 50,
      'Calculadora Ecuacion_por semana': 100,
      'Calculadora Ecuacion_por mes': 350,
      'Calculadora Ecuacion_por año': 4000,
  
      'Libro Sobre la Ecuacion_por servicio': 50,
      'Libro Sobre la Ecuacion_por semana': 100,
      'Libro Sobre la Ecuacion_por mes': 350,
      'Libro Sobre la Ecuacion_por año': 4000,
  
      'Asesoramiento Financiero_por servicio': 50,
      'Asesoramiento Financiero_por semana': 100,
      'Asesoramiento Financiero_por mes': 350,
      'Asesoramiento Financiero_por año': 4000,
  
      'Diseños de Arquitectura_por servicio': 50,
      'Diseños de Arquitectura_por semana': 100,
      'Diseños de Arquitectura_por mes': 350,
      'Diseños de Arquitectura_por año': 4000,
  
      'Construccion Civil_por servicio': 50,
      'Construccion Civil_por semana': 100,
      'Construccion Civil_por mes': 350,
      'Construccion Civil_por año': 4000
    };
  
    const key = `${servicio}_${precio}`;
    return precios[key] || 0;
  }
  
  comprobanteSeleccionado: File | null = null;

onComprobanteSeleccionado(event: any): void {
  const file: File = event.target.files[0];
  if (file) {
    this.comprobanteSeleccionado = file;
    console.log('Comprobante seleccionado:', file);
    // Aquí puedes subirlo al servidor con FormData + HTTP si ya tienes backend
  }
}

}
