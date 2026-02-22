import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearRolPermisoComponent } from './crear-rol-permiso.component';

describe('CrearRolPermisoComponent', () => {
  let component: CrearRolPermisoComponent;
  let fixture: ComponentFixture<CrearRolPermisoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearRolPermisoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearRolPermisoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
