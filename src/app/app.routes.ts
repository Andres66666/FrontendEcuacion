import { Routes } from '@angular/router';
import { IndexComponent } from './components/index/index.component';
import { LoginComponent } from './components/login/login.component';
import { PanelControlComponent } from './components/panel-control/panel-control.component';
import { ListarPermisoComponent } from './components/gestion_de_usuarios/permiso/listar-permiso/listar-permiso.component';
import { EditarPermisoComponent } from './components/gestion_de_usuarios/permiso/editar-permiso/editar-permiso.component';
import { ListarRolComponent } from './components/gestion_de_usuarios/rol/listar-rol/listar-rol.component';
import { EditarRolComponent } from './components/gestion_de_usuarios/rol/editar-rol/editar-rol.component';
import { ListarUsuarioComponent } from './components/gestion_de_usuarios/usuario/listar-usuario/listar-usuario.component';
import { EditarUsuarioComponent } from './components/gestion_de_usuarios/usuario/editar-usuario/editar-usuario.component';
import { ListarRolPermisoComponent } from './components/gestion_de_usuarios/rol-permiso/listar-rol-permiso/listar-rol-permiso.component';
import { EditarRolPermisoComponent } from './components/gestion_de_usuarios/rol-permiso/editar-rol-permiso/editar-rol-permiso.component';
import { ListarUsuarioRolComponent } from './components/gestion_de_usuarios/usuario-rol/listar-usuario-rol/listar-usuario-rol.component';
import { EditarUsuarioRolComponent } from './components/gestion_de_usuarios/usuario-rol/editar-usuario-rol/editar-usuario-rol.component';
import { authGuard } from './guards/auth.guard';
import { CrearRolComponent } from './components/gestion_de_usuarios/rol/crear-rol/crear-rol.component';
import { CrearPermisoComponent } from './components/gestion_de_usuarios/permiso/crear-permiso/crear-permiso.component';
import { CrearUsuarioComponent } from './components/gestion_de_usuarios/usuario/crear-usuario/crear-usuario.component';
import { CrearUsuarioRolComponent } from './components/gestion_de_usuarios/usuario-rol/crear-usuario-rol/crear-usuario-rol.component';
import { CrearRolPermisoComponent } from './components/gestion_de_usuarios/rol-permiso/crear-rol-permiso/crear-rol-permiso.component';
import { PerfilComponent } from './components/perfil/perfil.component';

import { GastosOperacionesComponent } from './components/gastos-operaciones/gastos-operaciones.component';

import { CrearMaterialesComponent } from './components/analisis-precios-unitario/materiales/crear-materiales.component';
import { CrearManoDeObraComponent } from './components/analisis-precios-unitario/mano-de-obra/crear-mano-de-obra.component';
import { CrearEquipoHerramientaComponent } from './components/analisis-precios-unitario/equipo-herramienta/crear-equipo-herramienta.component';
import { CrearEcuacionComponent } from './components/analisis-precios-unitario/1-2-3-4/crear-ecuacion.component';
import { CrearGastosGeneralesComponent } from './components/analisis-precios-unitario/gastos-generales/crear-gastos-generales.component';
import { PrecioFacturaComponent } from './components/analisis-precios-unitario/precio-factura/precio-factura.component';
import { AuditoriaComponent } from './components/seguridad/auditoria/auditoria.component';

export const routes: Routes = [
  { path: '', component: IndexComponent }, // Ruta principal
  { path: 'login', component: LoginComponent },
  { path: 'index', component: IndexComponent },

  {
    path: 'panel-control',
    component: PanelControlComponent,
    canActivate: [authGuard], // ⬅️ Protección con el guard
    children: [
      {
        path: 'perfil',
        component: PerfilComponent,
      },
      //  =====================================================
      //  ================  seccion 1    ======================
      //  =====================================================
      // Rol
      { path: 'listar-rol', component: ListarRolComponent },
      { path: 'registrar-rol', component: CrearRolComponent },
      { path: 'editar-rol/:id', component: EditarRolComponent },

      // Permiso
      { path: 'listar-permiso', component: ListarPermisoComponent },
      { path: 'registrar-permiso', component: CrearPermisoComponent },
      { path: 'editar-permiso/:id', component: EditarPermisoComponent },

      // Usuario
      { path: 'listar-usuario', component: ListarUsuarioComponent },
      { path: 'registrar-usuario', component: CrearUsuarioComponent },
      { path: 'editar-usuario/:id', component: EditarUsuarioComponent },

      // Rol-Permiso
      { path: 'listar-rol-permiso', component: ListarRolPermisoComponent },
      {
        path: 'registrar-rol-permiso',
        component: CrearRolPermisoComponent,
      },
      { path: 'editar-rol-permiso/:id', component: EditarRolPermisoComponent },

      // Usuario-Rol-
      {
        path: 'listar-usuario-rol',
        component: ListarUsuarioRolComponent,
      },
      {
        path: 'registrar-usuario-rol',
        component: CrearUsuarioRolComponent,
      },
      {
        path: 'editar-usuario-rol/:id',
        component: EditarUsuarioRolComponent,
      },
      //  =====================================================
      //  ================  seccion 2    ======================
      //  =====================================================
      {
        path: 'gastos-operaciones',
        component: GastosOperacionesComponent,
      },
      //  =====================================================
      //  ================  seccion 3    ======================
      //  =====================================================
      /* crear ecuaciuon */
      { path: 'CrearEcuacion', component: CrearEcuacionComponent },

      /*materiales   */
      { path: 'CrearMateriales', component: CrearMaterialesComponent },
      /* mano de obra */
      { path: 'CrearManoDeObra', component: CrearManoDeObraComponent },
      /* equipo herramienta */
      {
        path: 'CrearEquipoHerramienta',
        component: CrearEquipoHerramientaComponent,
      },
      /* gastos generales administrativos */
      {
        path: 'CrearGastosGenerales',
        component: CrearGastosGeneralesComponent,
      },

      //  =====================================================
      //  ================  seccion 4    ======================
      //  =====================================================

      {
        path: 'PrecioFactura',
        component: PrecioFacturaComponent,
      },
      //  =====================================================
      //  ================  seccion 5    ======================
      //  =====================================================

      // auditoria
      { path: 'auditoria', component: AuditoriaComponent },

      // Ruta por defecto
      { path: '', redirectTo: 'servicios', pathMatch: 'full' },
    ],
  },
];
