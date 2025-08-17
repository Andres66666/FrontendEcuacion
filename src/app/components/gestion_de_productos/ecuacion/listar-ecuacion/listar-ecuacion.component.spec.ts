import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListarEcuacionComponent } from './listar-ecuacion.component';

describe('ListarEcuacionComponent', () => {
  let component: ListarEcuacionComponent;
  let fixture: ComponentFixture<ListarEcuacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListarEcuacionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListarEcuacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
