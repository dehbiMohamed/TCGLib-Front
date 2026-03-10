import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { AddCardToDeckResult, Deck, DeckCardEntry, DeckValidationSummary } from '../Models/Deck';

@Injectable({
  providedIn: 'root',
})
export class DeckService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'tcg-libe.decks';
  private readonly decksState = signal<Deck[]>(this.loadDecks());

  readonly decks = this.decksState.asReadonly();

  createDeck(name: string, format: string): Deck | null {
    const trimmedName = name.trim();
    const trimmedFormat = format.trim();

    if (!trimmedName || !trimmedFormat) {
      return null;
    }

    const newDeck: Deck = {
      id: this.buildDeckId(trimmedName),
      name: trimmedName,
      format: trimmedFormat,
      createdAt: new Date().toISOString(),
      cards: [],
    };

    this.updateDecks((decks) => [...decks, newDeck]);
    return newDeck;
  }

  findDeckById(deckId: string): Deck | undefined {
    return this.decksState().find((deck) => deck.id === deckId);
  }

  addCardToDeck(deckId: string, card: { id: string; name: string; imageUrl: string }): AddCardToDeckResult {
    let addResult: AddCardToDeckResult = {
      added: false,
      reason: 'deck_not_found',
    };

    this.updateDecks((decks) =>
      decks.map((deck) => {
        if (deck.id !== deckId) {
          return deck;
        }

        const existingCard = deck.cards.find((entry) => entry.cardId === card.id);
        const commanderDuplicateBlocked = this.isCommanderDeck(deck) && existingCard;

        if (commanderDuplicateBlocked) {
          addResult = {
            added: false,
            reason: 'commander_singleton',
          };

          return deck;
        }

        if (existingCard) {
          addResult = {
            added: true,
            reason: 'added',
          };

          return {
            ...deck,
            cards: deck.cards.map((entry) =>
              entry.cardId === card.id ? { ...entry, quantity: entry.quantity + 1 } : entry
            ),
          };
        }

        const newCard: DeckCardEntry = {
          cardId: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          quantity: 1,
        };

        addResult = {
          added: true,
          reason: 'added',
        };

        return {
          ...deck,
          cards: [...deck.cards, newCard],
        };
      })
    );

    return addResult;
  }

  removeCardFromDeck(deckId: string, cardId: string): void {
    this.updateDecks((decks) =>
      decks.map((deck) => {
        if (deck.id !== deckId) {
          return deck;
        }

        return {
          ...deck,
          cards: deck.cards
            .map((entry) =>
              entry.cardId === cardId ? { ...entry, quantity: entry.quantity - 1 } : entry
            )
            .filter((entry) => entry.quantity > 0),
        };
      })
    );
  }

  getTotalCardCount(deck: Deck): number {
    return deck.cards.reduce((total, card) => total + card.quantity, 0);
  }

  canAddCardToDeck(deckId: string, cardId: string): boolean {
    const deck = this.findDeckById(deckId);

    if (!deck) {
      return false;
    }

    if (!this.isCommanderDeck(deck)) {
      return true;
    }

    return !deck.cards.some((entry) => entry.cardId === cardId);
  }

  getDeckValidationSummary(deck: Deck): DeckValidationSummary {
    const totalCards = this.getTotalCardCount(deck);
    const duplicatedCards = deck.cards.filter((entry) => entry.quantity > 1);

    if (this.isCommanderDeck(deck)) {
      if (duplicatedCards.length > 0) {
        return {
          totalCards,
          targetCardCount: 100,
          ruleLabel: '100 cartes exactes, sans doublons',
          statusLabel: 'Doublons interdits',
          statusTone: 'danger',
          detailMessage: `${duplicatedCards.length} carte(s) sont presentes en plusieurs exemplaires.`,
          isValid: false,
        };
      }

      if (totalCards === 100) {
        return {
          totalCards,
          targetCardCount: 100,
          ruleLabel: '100 cartes exactes, sans doublons',
          statusLabel: 'Valide',
          statusTone: 'success',
          detailMessage: 'Ton deck Commander est a la bonne taille.',
          isValid: true,
        };
      }

      if (totalCards < 100) {
        return {
          totalCards,
          targetCardCount: 100,
          ruleLabel: '100 cartes exactes, sans doublons',
          statusLabel: 'Incomplet',
          statusTone: 'warning',
          detailMessage: `${100 - totalCards} cartes manquantes pour atteindre 100.`,
          isValid: false,
        };
      }

      return {
        totalCards,
        targetCardCount: 100,
        ruleLabel: '100 cartes exactes, sans doublons',
        statusLabel: 'Trop de cartes',
        statusTone: 'danger',
        detailMessage: `${totalCards - 100} cartes en trop pour rester a 100.`,
        isValid: false,
      };
    }

    if (totalCards >= 60) {
      return {
        totalCards,
        targetCardCount: 60,
        ruleLabel: '60 cartes minimum',
        statusLabel: 'Valide',
        statusTone: 'success',
        detailMessage: 'Le minimum de cartes pour ce format est atteint.',
        isValid: true,
      };
    }

    return {
      totalCards,
      targetCardCount: 60,
      ruleLabel: '60 cartes minimum',
      statusLabel: 'Incomplet',
      statusTone: 'warning',
      detailMessage: `${60 - totalCards} cartes manquantes pour atteindre le minimum.`,
      isValid: false,
    };
  }

  private updateDecks(updater: (decks: Deck[]) => Deck[]): void {
    const nextDecks = updater(this.decksState());
    this.decksState.set(nextDecks);
    this.persistDecks(nextDecks);
  }

  private isCommanderDeck(deck: Deck): boolean {
    return deck.format.trim().toLowerCase() === 'commander';
  }

  private loadDecks(): Deck[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    const rawDecks = localStorage.getItem(this.storageKey);
    if (!rawDecks) {
      return [];
    }

    try {
      const parsedDecks = JSON.parse(rawDecks);
      return Array.isArray(parsedDecks) ? parsedDecks : [];
    } catch {
      return [];
    }
  }

  private persistDecks(decks: Deck[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(decks));
  }

  private buildDeckId(name: string): string {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `${slug || 'deck'}-${Date.now()}`;
  }
}
