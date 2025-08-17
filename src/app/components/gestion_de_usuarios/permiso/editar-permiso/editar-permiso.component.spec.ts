import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarPermisoComponent } from './editar-permiso.component';

describe('EditarPermisoComponent', () => {
  let component: EditarPermisoComponent;
  let fixture: ComponentFixture<EditarPermisoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarPermisoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarPermisoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
