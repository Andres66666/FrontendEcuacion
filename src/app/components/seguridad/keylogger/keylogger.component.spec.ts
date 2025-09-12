import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyloggerComponent } from './keylogger.component';

describe('KeyloggerComponent', () => {
  let component: KeyloggerComponent;
  let fixture: ComponentFixture<KeyloggerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyloggerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KeyloggerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
