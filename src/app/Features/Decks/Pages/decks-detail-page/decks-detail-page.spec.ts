import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DecksDetailPage } from './decks-detail-page';

describe('DecksDetailPage', () => {
  let component: DecksDetailPage;
  let fixture: ComponentFixture<DecksDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecksDetailPage],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'test-deck' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DecksDetailPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
