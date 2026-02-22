import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarUsuarioRolComponent } from './editar-usuario-rol.component';

describe('EditarUsuarioRolComponent', () => {
  let component: EditarUsuarioRolComponent;
  let fixture: ComponentFixture<EditarUsuarioRolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarUsuarioRolComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarUsuarioRolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
