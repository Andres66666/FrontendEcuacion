import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportesPDf } from './reportes-pdf';

describe('ReportesPDf', () => {
  let component: ReportesPDf;
  let fixture: ComponentFixture<ReportesPDf>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportesPDf]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportesPDf);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
