import { Routes } from '@angular/router';

import { IndexComponent } from './components/index/index.component';
import { LoginComponent } from './components/login/login.component';
import { RegistroComponent } from './components/registro/registro.component';

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
import { ServiciosComponent } from './components/servicios/servicios.component';
import { authGuard } from './guards/auth.guard';
import { CrearRolComponent } from './components/gestion_de_usuarios/rol/crear-rol/crear-rol.component';
import { CrearPermisoComponent } from './components/gestion_de_usuarios/permiso/crear-permiso/crear-permiso.component';
import { CrearUsuarioComponent } from './components/gestion_de_usuarios/usuario/crear-usuario/crear-usuario.component';
import { CrearUsuarioRolComponent } from './components/gestion_de_usuarios/usuario-rol/crear-usuario-rol/crear-usuario-rol.component';
import { CrearRolPermisoComponent } from './components/gestion_de_usuarios/rol-permiso/crear-rol-permiso/crear-rol-permiso.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { RegistrosUsuariosComponent } from './components/registros-usuarios/registros-usuarios.component';
import { PrecioFacturaComponent } from './components/gestion_de_productos/precio-factura/precio-factura.component';
import { GastosOperacionesComponent } from './components/gestion_de_productos/gastos-operaciones/gastos-operaciones.component';
import { CrearMaterialesComponent } from './components/gestion_de_productos/materiales/crear-materiales/crear-materiales.component';
import { EditarMaterialesComponent } from './components/gestion_de_productos/materiales/editar-materiales/editar-materiales.component';
import { ListarMaterialesComponent } from './components/gestion_de_productos/materiales/listar-materiales/listar-materiales.component';
import { CrearManoDeObraComponent } from './components/gestion_de_productos/mano-de-obra/crear-mano-de-obra/crear-mano-de-obra.component';
import { EditarManoDeObraComponent } from './components/gestion_de_productos/mano-de-obra/editar-mano-de-obra/editar-mano-de-obra.component';
import { ListarManoDeObraComponent } from './components/gestion_de_productos/mano-de-obra/listar-mano-de-obra/listar-mano-de-obra.component';
import { CrearEquipoHerramientaComponent } from './components/gestion_de_productos/equipo-herramienta/crear-equipo-herramienta/crear-equipo-herramienta.component';
import { EditarEquipoHerramientaComponent } from './components/gestion_de_productos/equipo-herramienta/editar-equipo-herramienta/editar-equipo-herramienta.component';
import { ListarEquipoHerramientaComponent } from './components/gestion_de_productos/equipo-herramienta/listar-equipo-herramienta/listar-equipo-herramienta.component';
import { CrearGastosGeneralesComponent } from './components/gestion_de_productos/gastos-generales/crear-gastos-generales/crear-gastos-generales.component';
import { EditarGastosGeneralesComponent } from './components/gestion_de_productos/gastos-generales/editar-gastos-generales/editar-gastos-generales.component';
import { ListarGastosGeneralesComponent } from './components/gestion_de_productos/gastos-generales/listar-gastos-generales/listar-gastos-generales.component';
import { CrearEcuacionComponent } from './components/gestion_de_productos/ecuacion/crear-ecuacion/crear-ecuacion.component';
import { EditarEcuacionComponent } from './components/gestion_de_productos/ecuacion/editar-ecuacion/editar-ecuacion.component';
import { ListarEcuacionComponent } from './components/gestion_de_productos/ecuacion/listar-ecuacion/listar-ecuacion.component';

export const routes: Routes = [
    { path: '', component: IndexComponent }, // Ruta principal
    { path: 'login', component: LoginComponent },
    { path: 'registro', component: RegistroComponent },
    { path: 'index', component: IndexComponent },
    { path: 'registrousuarios', component: RegistrosUsuariosComponent },

    {
    path: 'panel-control',
    component: PanelControlComponent,
    canActivate: [authGuard], // ⬅️ Protección con el guard
    children: [
      //ruta para servicios
      { path: 'servicios', component: ServiciosComponent },

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
      /* ************************************ */
      /* Rutas hijas productos de la ecuacion */
      /* ************************************ */
      /*  */
      { path: 'CrearEcuacion', component: CrearEcuacionComponent },
      { path: 'EditarEcuacion', component: EditarEcuacionComponent },
      { path: 'ListarEcuacion', component: ListarEcuacionComponent },

      /*  */
      { path: 'CrearMateriales', component: CrearMaterialesComponent },
      { path: 'EditarMateriales', component: EditarMaterialesComponent },
      { path: 'ListarMateriales', component: ListarMaterialesComponent },
      /*  */
      { path: 'CrearManoDeObra', component: CrearManoDeObraComponent },
      { path: 'EditarManoDeObra', component: EditarManoDeObraComponent },
      { path: 'ListarManoDeObra', component: ListarManoDeObraComponent },

      /*  */
      {
        path: 'CrearEquipoHerramienta',
        component: CrearEquipoHerramientaComponent,
      },
      {
        path: 'EditarEquipoHerramienta',
        component: EditarEquipoHerramientaComponent,
      },
      {
        path: 'ListarEquipoHerramienta',
        component: ListarEquipoHerramientaComponent,
      },
      /*  */
      {
        path: 'CrearGastosGenerales',
        component: CrearGastosGeneralesComponent,
      },
      {
        path: 'EditarGastosGenerales',
        component: EditarGastosGeneralesComponent,
      },
      {
        path: 'ListarGastosGenerales',
        component: ListarGastosGeneralesComponent,
      },
      /* ************************************ */
      /* **********fin de ecuacion*********** */
      /* ************************************ */

      {
        path: 'precio-factura',
        component: PrecioFacturaComponent,
      },
      {
        path: 'gastos-operaciones',
        component: GastosOperacionesComponent,
      },

      {
        path: 'perfil',
        component: PerfilComponent,
      },

      // Ruta por defecto
      { path: '', redirectTo: 'servicios', pathMatch: 'full' },
    ],
  },
];

