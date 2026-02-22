import { TestBed } from '@angular/core/testing';

import { ReportesPdf } from './reportes-pdf';

describe('ReportesPdf', () => {
  let service: ReportesPdf;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReportesPdf);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
