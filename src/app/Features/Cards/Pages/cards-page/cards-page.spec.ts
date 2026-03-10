import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardsPage } from './cards-page';

describe('CardsPage', () => {
  let component: CardsPage;
  let fixture: ComponentFixture<CardsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardsPage],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CardsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
