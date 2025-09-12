import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CsrfComponent } from './csrf.component';

describe('CsrfComponent', () => {
  let component: CsrfComponent;
  let fixture: ComponentFixture<CsrfComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CsrfComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CsrfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
