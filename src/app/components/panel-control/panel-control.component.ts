import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, HostListener, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { StorageService } from '../../services/Storage.service';

@Component({
  selector: 'app-panel-control',
  imports: [CommonModule, RouterModule],
  templateUrl: './panel-control.component.html',
  styleUrl: './panel-control.component.css'
})
export class PanelControlComponent implements OnInit {
  activeSection: string | null = null;
  isMobileView = false;
  isSidebarVisibleOnSmallScreens = true;

  timeoutInactivity: any;
  inactiveTime = 60 * 60 * 1000; // 1 hora
  isSidebarOpen = false;
  windowWidth: number = 0;

  userRole: string = '';
  userName: string = '';
  userPermissions: string[] = [];

  nombre_usuario: string = '';
  apellido: string | null = '';
  imagenUrl: string | null = '';
  usuario_id: number = 0;

  idParaEditar: number = 0;

  permisos: string[] = [];
  roles: string[] = [];

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    const usuarioStr = this.storageService.getItem('usuarioLogueado');
    const datosUsuario = usuarioStr ? JSON.parse(usuarioStr) : {};

    this.userRole = datosUsuario.roles || '';
    this.userName = `${datosUsuario.nombre || ''} ${datosUsuario.apellido || ''}`.trim();
    this.userPermissions = datosUsuario.permisos || [];
    this.imagenUrl = datosUsuario.imagen_url;

    this.checkScreenSize();
    this.resetInactivityTimer();
  }

  puedeVer(permiso: string): boolean {
    return this.userPermissions.includes(permiso);
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    if (isPlatformBrowser(this.platformId)) {
      this.windowWidth = window.innerWidth;
      this.isSidebarOpen = this.windowWidth >= 768;
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: MouseEvent) {
    if (this.windowWidth >= 768) return;

    const target = event.target as HTMLElement;
    const clickedInsideSidebar = target.closest('.sidebar');
    const clickedInsideToggleButton = target.closest('.toggle-button');

    if (!clickedInsideSidebar && !clickedInsideToggleButton && this.isSidebarOpen) {
      this.isSidebarOpen = false;
    }
  }

  toggleSection(section: string) {
    this.activeSection = this.activeSection === section ? null : section;
  }

  isActive(section: string) {
    return this.activeSection === section;
  }

  closeSidebarOnMobile() {
    if (this.isMobileView) {
      this.isSidebarVisibleOnSmallScreens = false;
    }
  }

  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  @HostListener('document:click')
  handleUserActivity() {
    this.resetInactivityTimer();
  }

  resetInactivityTimer() {
    if (this.timeoutInactivity) {
      clearTimeout(this.timeoutInactivity);
    }

    this.timeoutInactivity = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.inactiveTime);
  }

  handleSessionTimeout() {
    alert('Sesión cerrada por inactividad');
    this.storageService.clear();
    this.router.navigate(['/index']);
  }

  verPerfil(): void {
    this.router.navigate(['panel-control/perfil']);
  }

  private getUsuarioLocalStorage() {
    const usuarioStr = this.storageService.getItem('usuario');
    return usuarioStr ? JSON.parse(usuarioStr) : null;
  }

  onSelectChange(action: string) {
    if (action === 'cerrarSesion') {
      this.confirmarCerrarSesion();
    }
  }

  confirmarCerrarSesion() {
    console.log('Intentando cerrar sesión...');
    const confirmar = window.confirm('¿Está seguro de que desea cerrar sesión?');
    if (confirmar) {
      this.logout();
    } else {
      console.log('Cierre de sesión cancelado.');
    }
  }

  logout() {
    this.storageService.clear();
    this.router.navigate(['/index']);
  }
}
