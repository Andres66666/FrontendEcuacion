import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarRolPermisoComponent } from './editar-rol-permiso.component';

describe('EditarRolPermisoComponent', () => {
  let component: EditarRolPermisoComponent;
  let fixture: ComponentFixture<EditarRolPermisoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarRolPermisoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarRolPermisoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
