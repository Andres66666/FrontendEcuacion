import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListarEquipoHerramientaComponent } from './listar-equipo-herramienta.component';

describe('ListarEquipoHerramientaComponent', () => {
  let component: ListarEquipoHerramientaComponent;
  let fixture: ComponentFixture<ListarEquipoHerramientaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListarEquipoHerramientaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListarEquipoHerramientaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
