import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListarPermisoComponent } from './listar-permiso.component';

describe('ListarPermisoComponent', () => {
  let component: ListarPermisoComponent;
  let fixture: ComponentFixture<ListarPermisoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListarPermisoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListarPermisoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
