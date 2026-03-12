import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { AddCardToDeckResult, Deck, DeckCardEntry, DeckFormatRule, DeckValidationSummary } from '../Models/Deck';

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

  getDeckFormatRule(format: string): DeckFormatRule {
    const normalizedFormat = format.trim().toLowerCase();

    if (normalizedFormat === 'commander') {
      return {
        targetCardCount: 100,
        cardCountMode: 'exact',
        allowDuplicates: false,
        ruleLabel: '100 cartes exactes, sans doublons',
        helperText: 'En Commander, tu dois viser exactement 100 cartes et eviter les doublons.',
      };
    }

    return {
      targetCardCount: 60,
      cardCountMode: 'minimum',
      allowDuplicates: true,
      ruleLabel: '60 cartes minimum',
      helperText: 'Pour cette version simple du projet, les formats construits demandent 60 cartes minimum.',
    };
  }

  updateDeck(deckId: string, updates: { name: string; format: string }): Deck | null {
    const trimmedName = updates.name.trim();
    const trimmedFormat = updates.format.trim();

    if (!trimmedName || !trimmedFormat) {
      return null;
    }

    let updatedDeck: Deck | null = null;

    this.updateDecks((decks) =>
      decks.map((deck) => {
        if (deck.id !== deckId) {
          return deck;
        }

        updatedDeck = {
          ...deck,
          name: trimmedName,
          format: trimmedFormat,
        };

        return updatedDeck;
      })
    );

    return updatedDeck;
  }

  removeDeck(deckId: string): boolean {
    const currentDecks = this.decksState();
    const nextDecks = currentDecks.filter((deck) => deck.id !== deckId);

    if (nextDecks.length === currentDecks.length) {
      return false;
    }

    this.decksState.set(nextDecks);
    this.persistDecks(nextDecks);
    return true;
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
    const rule = this.getDeckFormatRule(deck.format);
    const totalCards = this.getTotalCardCount(deck);
    const duplicatedCards = deck.cards.filter((entry) => entry.quantity > 1);

    if (!rule.allowDuplicates && duplicatedCards.length > 0) {
      return {
        totalCards,
        targetCardCount: rule.targetCardCount,
        ruleLabel: rule.ruleLabel,
        statusLabel: 'Doublons interdits',
        statusTone: 'danger',
        detailMessage: `${duplicatedCards.length} carte(s) sont presentes en plusieurs exemplaires.`,
        isValid: false,
      };
    }

    if (rule.cardCountMode === 'exact') {
      if (totalCards === rule.targetCardCount) {
        return {
          totalCards,
          targetCardCount: rule.targetCardCount,
          ruleLabel: rule.ruleLabel,
          statusLabel: 'Valide',
          statusTone: 'success',
          detailMessage: 'Ton deck est a la bonne taille pour ce format.',
          isValid: true,
        };
      }

      if (totalCards < rule.targetCardCount) {
        return {
          totalCards,
          targetCardCount: rule.targetCardCount,
          ruleLabel: rule.ruleLabel,
          statusLabel: 'Incomplet',
          statusTone: 'warning',
          detailMessage: `${rule.targetCardCount - totalCards} cartes manquantes pour atteindre ${rule.targetCardCount}.`,
          isValid: false,
        };
      }

      if (duplicatedCards.length > 0) {
        return {
          totalCards,
          targetCardCount: rule.targetCardCount,
          ruleLabel: rule.ruleLabel,
          statusLabel: 'Trop de cartes',
          statusTone: 'danger',
          detailMessage: `${totalCards - rule.targetCardCount} cartes en trop pour rester a ${rule.targetCardCount}.`,
          isValid: false,
        };
      }

      return {
        totalCards,
        targetCardCount: rule.targetCardCount,
        ruleLabel: rule.ruleLabel,
        statusLabel: 'Trop de cartes',
        statusTone: 'danger',
        detailMessage: `${totalCards - rule.targetCardCount} cartes en trop pour rester a ${rule.targetCardCount}.`,
        isValid: false,
      };
    }

    if (totalCards >= rule.targetCardCount) {
      return {
        totalCards,
        targetCardCount: rule.targetCardCount,
        ruleLabel: rule.ruleLabel,
        statusLabel: 'Valide',
        statusTone: 'success',
        detailMessage: 'Le minimum de cartes pour ce format est atteint.',
        isValid: true,
      };
    }

    return {
      totalCards,
      targetCardCount: rule.targetCardCount,
      ruleLabel: rule.ruleLabel,
      statusLabel: 'Incomplet',
      statusTone: 'warning',
      detailMessage: `${rule.targetCardCount - totalCards} cartes manquantes pour atteindre le minimum.`,
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
    if (!this.canUseStorage()) {
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
    if (!this.canUseStorage()) {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(decks));
  }

  private canUseStorage(): boolean {
    return (
      isPlatformBrowser(this.platformId) &&
      typeof localStorage !== 'undefined' &&
      typeof localStorage.getItem === 'function' &&
      typeof localStorage.setItem === 'function'
    );
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
