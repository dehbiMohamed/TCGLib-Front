import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CardListItem } from '../../../../Models/Card-List-Item';
import { Deck, DeckValidationSummary } from '../../../../Models/Deck';
import { CardSearchService } from '../../../../Services/card-search-service';
import { DeckService } from '../../../../Services/deck-service';
import { DecksDetailPage } from './decks-detail-page';

describe('DecksDetailPage', () => {
  let component: DecksDetailPage;
  let fixture: ComponentFixture<DecksDetailPage>;
  let router: Router;
  let deckServiceStub: {
    decks: ReturnType<typeof signal<Deck[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    loadError: ReturnType<typeof signal<string>>;
    findDeckById: ReturnType<typeof vi.fn>;
    getDeckFormatRule: ReturnType<typeof vi.fn>;
    updateDeck: ReturnType<typeof vi.fn>;
    getTotalCardCount: ReturnType<typeof vi.fn>;
    getDeckValidationSummary: ReturnType<typeof vi.fn>;
    addCardToDeck: ReturnType<typeof vi.fn>;
    removeCardFromDeck: ReturnType<typeof vi.fn>;
    canAddCardToDeck: ReturnType<typeof vi.fn>;
    removeDeck: ReturnType<typeof vi.fn>;
  };
  let cardSearchServiceStub: {
    searchCards: ReturnType<typeof vi.fn>;
  };

  const mockDeck: Deck = {
    id: 'test-deck',
    name: 'Mono Red',
    format: 'Standard',
    createdAt: '2026-03-11T00:00:00.000Z',
    cards: [],
  };

  const mockSummary: DeckValidationSummary = {
    totalCards: 0,
    targetCardCount: 60,
    ruleLabel: '60 cartes minimum',
    statusLabel: 'Incomplet',
    statusTone: 'warning',
    detailMessage: '60 cartes manquantes pour atteindre le minimum.',
    isValid: false,
  };

  const commanderRule = {
    targetCardCount: 100,
    cardCountMode: 'exact' as const,
    allowDuplicates: false,
    ruleLabel: '100 cartes exactes, sans doublons',
    helperText: 'En Commander, tu dois viser exactement 100 cartes et eviter les doublons.',
  };

  beforeEach(async () => {
    const decksState = signal<Deck[]>([mockDeck]);

    deckServiceStub = {
      decks: decksState,
      loading: signal(false),
      loadError: signal(''),
      findDeckById: vi.fn().mockImplementation((deckId: string) => decksState().find((deck) => deck.id === deckId)),
      getDeckFormatRule: vi.fn().mockImplementation((format: string) =>
        format === 'Commander'
          ? commanderRule
          : {
              targetCardCount: 60,
              cardCountMode: 'minimum',
              allowDuplicates: true,
              ruleLabel: '60 cartes minimum',
              helperText: 'Pour cette version simple du projet, les formats construits demandent 60 cartes minimum.',
            }
      ),
      updateDeck: vi.fn().mockImplementation((deckId: string, updates: { name: string; format: string }) => {
        const currentDeck = decksState().find((deck) => deck.id === deckId);
        if (!currentDeck) {
          return null;
        }

        const updatedDeck = {
          ...currentDeck,
          name: updates.name,
          format: updates.format,
        };

        decksState.set(decksState().map((deck) => (deck.id === deckId ? updatedDeck : deck)));
        return of(updatedDeck);
      }),
      getTotalCardCount: vi.fn().mockImplementation((deck: Deck) =>
        deck.cards.reduce((total, card) => total + card.quantity, 0)
      ),
      getDeckValidationSummary: vi.fn().mockImplementation(() => mockSummary),
      addCardToDeck: vi.fn().mockReturnValue(of({ added: true, reason: 'added' })),
      removeCardFromDeck: vi.fn().mockReturnValue(of(true)),
      canAddCardToDeck: vi.fn().mockReturnValue(true),
      removeDeck: vi.fn().mockImplementation((deckId: string) => {
        const hasDeck = decksState().some((deck) => deck.id === deckId);
        if (!hasDeck) {
          return of(false);
        }

        decksState.set(decksState().filter((deck) => deck.id !== deckId));
        return of(true);
      }),
    };
    cardSearchServiceStub = {
      searchCards: vi.fn().mockReturnValue(of([] as CardListItem[])),
    };

    await TestBed.configureTestingModule({
      imports: [DecksDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'test-deck' })),
          },
        },
        {
          provide: DeckService,
          useValue: deckServiceStub,
        },
        {
          provide: CardSearchService,
          useValue: cardSearchServiceStub,
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(DecksDetailPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hide deck settings by default and show them after clicking modify', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('Parametres du deck');

    component.toggleDeckSettings();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Parametres du deck');
  });

  it('should delete the current deck and navigate back to the list', () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.deleteCurrentDeck();

    expect(deckServiceStub.removeDeck).toHaveBeenCalledWith(mockDeck.id);
    expect(navigateSpy).toHaveBeenCalledWith(['/decks']);
  });

  it('should update the deck name and format and keep the confirmation visible', async () => {
    component.toggleDeckSettings();
    component.onDeckNameChange('Boros Burn');
    component.onDeckFormatChange('Commander');
    expect(component.previewFormatRule()?.ruleLabel).toBe('100 cartes exactes, sans doublons');

    component.updateDeckInfo(component.draftDeckName(), component.draftDeckFormat());
    fixture.detectChanges();
    await fixture.whenStable();

    expect(deckServiceStub.updateDeck).toHaveBeenCalledWith(mockDeck.id, {
      name: 'Boros Burn',
      format: 'Commander',
    });
    expect(component.deckSettingsMessage()).toBe(
      'Parametres du deck Boros Burn mis a jour. Nouvelle regle: 100 cartes exactes, sans doublons.'
    );
    expect(component.showDeckSettings()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(
      'Parametres du deck Boros Burn mis a jour. Nouvelle regle: 100 cartes exactes, sans doublons.'
    );
  });

  it('should keep unsaved deck settings when cards change', async () => {
    component.onDeckNameChange('Boros Burn');
    component.onDeckFormatChange('Commander');

    deckServiceStub.decks.set([
      {
        ...mockDeck,
        cards: [
          {
            cardId: 'shock',
            name: 'Shock',
            imageUrl: 'https://example.com/shock.jpg',
            quantity: 1,
          },
        ],
      },
    ]);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.draftDeckName()).toBe('Boros Burn');
    expect(component.draftDeckFormat()).toBe('Commander');
  });

  it('should show card detail links for search results and deck cards with deck return context', async () => {
    component.searchResults.set([
      {
        id: 'lightning-bolt',
        name: 'Lightning Bolt',
        imageUrl: 'https://example.com/lightning-bolt.jpg',
        setName: 'Magic 2010',
      },
    ]);

    deckServiceStub.decks.set([
      {
        ...mockDeck,
        cards: [
          {
            cardId: 'shock',
            name: 'Shock',
            imageUrl: 'https://example.com/shock.jpg',
            quantity: 2,
          },
        ],
      },
    ]);

    fixture.detectChanges();
    await fixture.whenStable();

    const cardLinks = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>
    )
      .map((link: HTMLAnchorElement) => link.getAttribute('href') ?? '')
      .filter((href) => href.includes('/cards/'));

    expect(cardLinks).toContain('/cards/lightning-bolt?fromDeckId=test-deck');
    expect(cardLinks).toContain('/cards/shock?fromDeckId=test-deck');
  });

  it('should open the settings form with the current deck format selected', async () => {
    deckServiceStub.decks.set([
      {
        ...mockDeck,
        format: 'Commander',
      },
    ]);

    fixture.detectChanges();
    await fixture.whenStable();

    component.toggleDeckSettings();
    fixture.detectChanges();
    await fixture.whenStable();

    const formatSelect = fixture.nativeElement.querySelector('select') as HTMLSelectElement | null;

    expect(formatSelect?.value).toBe('Commander');
  });
});
