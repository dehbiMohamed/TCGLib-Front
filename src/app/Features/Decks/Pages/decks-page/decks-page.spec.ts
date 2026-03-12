import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Deck, DeckValidationSummary } from '../../../../Models/Deck';
import { DeckService } from '../../../../Services/deck-service';
import { DecksPage } from './decks-page';

describe('DecksPage', () => {
  let component: DecksPage;
  let fixture: ComponentFixture<DecksPage>;
  let deckServiceStub: {
    decks: ReturnType<typeof signal<Deck[]>>;
    createDeck: ReturnType<typeof vi.fn>;
    removeDeck: ReturnType<typeof vi.fn>;
    getTotalCardCount: ReturnType<typeof vi.fn>;
    getDeckValidationSummary: ReturnType<typeof vi.fn>;
  };

  const mockDeck: Deck = {
    id: 'azorius-control-1',
    name: 'Azorius Control',
    format: 'Modern',
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

  beforeEach(async () => {
    deckServiceStub = {
      decks: signal<Deck[]>([mockDeck]),
      createDeck: vi.fn().mockReturnValue(mockDeck),
      removeDeck: vi.fn().mockReturnValue(true),
      getTotalCardCount: vi.fn().mockReturnValue(0),
      getDeckValidationSummary: vi.fn().mockReturnValue(mockSummary),
    };

    await TestBed.configureTestingModule({
      imports: [DecksPage],
      providers: [
        provideRouter([]),
        {
          provide: DeckService,
          useValue: deckServiceStub,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DecksPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should delete a deck after confirmation', () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

    component.deleteDeck(mockDeck);

    expect(deckServiceStub.removeDeck).toHaveBeenCalledWith(mockDeck.id);
    expect(component.successMessage()).toBe('Le deck Azorius Control a ete supprime.');
  });
});
