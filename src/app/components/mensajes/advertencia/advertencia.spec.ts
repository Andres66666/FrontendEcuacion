import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Advertencia } from './advertencia';

describe('Advertencia', () => {
  let component: Advertencia;
  let fixture: ComponentFixture<Advertencia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Advertencia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Advertencia);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
