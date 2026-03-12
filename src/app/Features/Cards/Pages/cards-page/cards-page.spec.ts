import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CardListItem } from '../../../../Models/Card-List-Item';
import { CardSearchService } from '../../../../Services/card-search-service';
import { CardsPage } from './cards-page';

describe('CardsPage', () => {
  let component: CardsPage;
  let fixture: ComponentFixture<CardsPage>;
  let cardSearchServiceStub: {
    searchCards: ReturnType<typeof vi.fn>;
  };

  const cards: CardListItem[] = [
    {
      id: 'counterspell',
      name: 'Counterspell',
      imageUrl: 'https://example.com/counterspell.jpg',
      setName: 'Ice Age',
    },
    {
      id: 'black-lotus',
      name: 'Black Lotus',
      imageUrl: 'https://example.com/black-lotus.jpg',
      setName: 'Alpha',
    },
    {
      id: 'lightning-bolt',
      name: 'Lightning Bolt',
      imageUrl: 'https://example.com/lightning-bolt.jpg',
      setName: 'Magic 2010',
    },
  ];

  beforeEach(async () => {
    cardSearchServiceStub = {
      searchCards: vi.fn().mockReturnValue(of([] as CardListItem[])),
    };

    await TestBed.configureTestingModule({
      imports: [CardsPage],
      providers: [
        provideRouter([]),
        {
          provide: CardSearchService,
          useValue: cardSearchServiceStub,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CardsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sort cards by name ascending by default', () => {
    component.cards.set(cards);

    expect(component.sortedCards().map((card) => card.name)).toEqual([
      'Black Lotus',
      'Counterspell',
      'Lightning Bolt',
    ]);
  });

  it('should sort cards by name descending', () => {
    component.cards.set(cards);
    component.onSortChange('name_desc');

    expect(component.sortedCards().map((card) => card.name)).toEqual([
      'Lightning Bolt',
      'Counterspell',
      'Black Lotus',
    ]);
  });

  it('should sort cards by set name', () => {
    component.cards.set(cards);
    component.onSortChange('set');

    expect(component.sortedCards().map((card) => `${card.setName} - ${card.name}`)).toEqual([
      'Alpha - Black Lotus',
      'Ice Age - Counterspell',
      'Magic 2010 - Lightning Bolt',
    ]);
  });
});
