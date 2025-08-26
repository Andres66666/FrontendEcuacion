import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrecioFacturaComponent } from './precio-factura.component';

describe('PrecioFacturaComponent', () => {
  let component: PrecioFacturaComponent;
  let fixture: ComponentFixture<PrecioFacturaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrecioFacturaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrecioFacturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
