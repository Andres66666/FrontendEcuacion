import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListarRolPermisoComponent } from './listar-rol-permiso.component';

describe('ListarRolPermisoComponent', () => {
  let component: ListarRolPermisoComponent;
  let fixture: ComponentFixture<ListarRolPermisoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListarRolPermisoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListarRolPermisoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
