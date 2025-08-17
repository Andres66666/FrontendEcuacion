import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListarUsuarioRolComponent } from './listar-usuario-rol.component';

describe('ListarUsuarioRolComponent', () => {
  let component: ListarUsuarioRolComponent;
  let fixture: ComponentFixture<ListarUsuarioRolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListarUsuarioRolComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListarUsuarioRolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
