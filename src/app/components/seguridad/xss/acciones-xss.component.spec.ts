import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccionesXssComponent } from './acciones-xss.component';

describe('AccionesXssComponent', () => {
  let component: AccionesXssComponent;
  let fixture: ComponentFixture<AccionesXssComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccionesXssComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccionesXssComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
