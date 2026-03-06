import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DecksDetailPage } from './decks-detail-page';

describe('DecksDetailPage', () => {
  let component: DecksDetailPage;
  let fixture: ComponentFixture<DecksDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecksDetailPage],
    }).compileComponents();

    fixture = TestBed.createComponent(DecksDetailPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
