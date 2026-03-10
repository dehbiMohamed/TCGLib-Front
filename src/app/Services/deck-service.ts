import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Deck, DeckCardEntry } from '../Models/Deck';

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

  addCardToDeck(deckId: string, card: { id: string; name: string; imageUrl: string }): void {
    this.updateDecks((decks) =>
      decks.map((deck) => {
        if (deck.id !== deckId) {
          return deck;
        }

        const existingCard = deck.cards.find((entry) => entry.cardId === card.id);

        if (existingCard) {
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

        return {
          ...deck,
          cards: [...deck.cards, newCard],
        };
      })
    );
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

  private updateDecks(updater: (decks: Deck[]) => Deck[]): void {
    const nextDecks = updater(this.decksState());
    this.decksState.set(nextDecks);
    this.persistDecks(nextDecks);
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
