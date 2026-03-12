import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CardDetails } from '../../../../Models/Card-Details';
import { Deck } from '../../../../Models/Deck';
import { CardSearchService } from '../../../../Services/card-search-service';
import { DeckService } from '../../../../Services/deck-service';
import { CardDetailPage } from './card-detail-page';

describe('CardDetailPage', () => {
  let fixture: ComponentFixture<CardDetailPage>;
  let component: CardDetailPage;
  let routeParamMap$: BehaviorSubject<ParamMap>;
  let cardSearchServiceStub: {
    getCardById: ReturnType<typeof vi.fn>;
  };
  let deckServiceStub: {
    decks: ReturnType<typeof signal<Deck[]>>;
    addCardToDeck: ReturnType<typeof vi.fn>;
    findDeckById: ReturnType<typeof vi.fn>;
    canAddCardToDeck: ReturnType<typeof vi.fn>;
  };

  const mockCard: CardDetails = {
    id: 'black-lotus',
    name: 'Black Lotus',
    imageUrl: 'https://example.com/black-lotus.jpg',
    manaCost: '{0}',
    typeLine: 'Artifact',
    oracleText: 'Add three mana of any one color.',
    flavorText: 'Power without equal.',
    setName: 'Limited Edition Alpha',
    setCode: 'LEA',
    collectorNumber: '233',
    rarity: 'rare',
    artist: 'Christopher Rush',
    releasedAt: '1993-08-05',
    power: '',
    toughness: '',
    loyalty: '',
    colors: [],
    scryfallUri: 'https://scryfall.com/card/lea/233/black-lotus',
  };

  async function createComponent(): Promise<void> {
    fixture = TestBed.createComponent(CardDetailPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    routeParamMap$ = new BehaviorSubject(convertToParamMap({ id: mockCard.id }));
    cardSearchServiceStub = {
      getCardById: vi.fn(),
    };
    deckServiceStub = {
      decks: signal<Deck[]>([]),
      addCardToDeck: vi.fn().mockReturnValue({ added: true, reason: 'added' }),
      findDeckById: vi.fn().mockReturnValue(undefined),
      canAddCardToDeck: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [CardDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: routeParamMap$.asObservable(),
          },
        },
        {
          provide: CardSearchService,
          useValue: cardSearchServiceStub,
        },
        {
          provide: DeckService,
          useValue: deckServiceStub,
        },
      ],
    }).compileComponents();
  });

  it('should load the card details from the route id', async () => {
    cardSearchServiceStub.getCardById.mockReturnValue(of(mockCard));

    await createComponent();

    expect(cardSearchServiceStub.getCardById).toHaveBeenCalledWith(mockCard.id);
    expect(component.card()).toEqual(mockCard);
    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Black Lotus');
  });

  it('should show an error message when the card cannot be loaded', async () => {
    cardSearchServiceStub.getCardById.mockReturnValue(throwError(() => new Error('Scryfall error')));

    await createComponent();

    expect(component.card()).toBeNull();
    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBe('Carte introuvable ou erreur lors du chargement.');
    expect(fixture.nativeElement.textContent).toContain('Carte introuvable ou erreur lors du chargement.');
  });
});
