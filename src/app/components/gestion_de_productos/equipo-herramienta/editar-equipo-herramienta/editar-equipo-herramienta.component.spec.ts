import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarEquipoHerramientaComponent } from './editar-equipo-herramienta.component';

describe('EditarEquipoHerramientaComponent', () => {
  let component: EditarEquipoHerramientaComponent;
  let fixture: ComponentFixture<EditarEquipoHerramientaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarEquipoHerramientaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarEquipoHerramientaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
