import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListarGastosGeneralesComponent } from './listar-gastos-generales.component';

describe('ListarGastosGeneralesComponent', () => {
  let component: ListarGastosGeneralesComponent;
  let fixture: ComponentFixture<ListarGastosGeneralesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListarGastosGeneralesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListarGastosGeneralesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
