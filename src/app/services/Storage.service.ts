import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {

  // Método para verificar si estamos en un entorno de navegador
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  // Método para obtener un elemento de localStorage
  getItem(key: string): string | null {
    if (this.isBrowser()) {
      return localStorage.getItem(key);
    }
    return null;
  }

  // Método para establecer un elemento en localStorage
  setItem(key: string, value: string): void {
    if (this.isBrowser()) {
      localStorage.setItem(key, value);
    }
  }

  // Método para eliminar un elemento de localStorage
  removeItem(key: string): void {
    if (this.isBrowser()) {
      localStorage.removeItem(key);
    }
  }

  // Método para limpiar todo el localStorage
  clear(): void {
    if (this.isBrowser()) {
      localStorage.clear();
    }
  }
}
