import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemsGastoOperacion } from './items-gasto-operacion';

describe('ItemsGastoOperacion', () => {
  let component: ItemsGastoOperacion;
  let fixture: ComponentFixture<ItemsGastoOperacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemsGastoOperacion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemsGastoOperacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
