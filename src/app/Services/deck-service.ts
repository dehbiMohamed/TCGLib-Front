import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { catchError, finalize, forkJoin, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../Core/config/api-base-url.token';
import {
  AddCardToDeckResult,
  deckOperationReasons,
  Deck,
  DeckCardEntry,
  DeckFormatRule,
  DeckValidationSummary,
} from '../Models/Deck';

interface AddCardToDeckApiResponse {
  added: boolean;
  reason: AddCardToDeckResult['reason'];
  deck: Deck | null;
}

@Injectable({
  providedIn: 'root',
})
export class DeckService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly decksApiUrl = `${this.apiBaseUrl}/decks`;
  private readonly legacyStorageKey = 'tcg-libe.decks';
  private readonly decksState = signal<Deck[]>([]);
  private readonly loadingState = signal(false);
  private readonly initializedState = signal(false);
  private readonly loadErrorState = signal('');

  readonly decks = this.decksState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly initialized = this.initializedState.asReadonly();
  readonly loadError = this.loadErrorState.asReadonly();

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      this.initializedState.set(true);
      return;
    }

    this.loadDecks();
  }

  createDeck(name: string, format: string): Observable<Deck | null> {
    const trimmedName = name.trim();
    const trimmedFormat = format.trim();

    if (!trimmedName || !trimmedFormat) {
      return of(null);
    }

    return this.http.post<Deck>(this.decksApiUrl, {
      name: trimmedName,
      format: trimmedFormat,
    }).pipe(
      tap((deck) => this.applyDeckUpdate(deck))
    );
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

  updateDeck(deckId: string, updates: { name: string; format: string }): Observable<Deck | null> {
    const trimmedName = updates.name.trim();
    const trimmedFormat = updates.format.trim();

    if (!trimmedName || !trimmedFormat) {
      return of(null);
    }

    return this.http.put<Deck>(this.getDeckUrl(deckId), {
      name: trimmedName,
      format: trimmedFormat,
    }).pipe(
      tap((deck) => this.applyDeckUpdate(deck))
    );
  }

  removeDeck(deckId: string): Observable<boolean> {
    return this.http.delete<void>(this.getDeckUrl(deckId)).pipe(
      map(() => true),
      tap(() => {
        this.decksState.update((decks) => decks.filter((deck) => deck.id !== deckId));
        this.clearLoadError();
      }),
      catchError(this.fallbackOnNotFound(false))
    );
  }

  addCardToDeck(deckId: string, card: { id: string; name: string; imageUrl: string }): Observable<AddCardToDeckResult> {
    return this.http.post<AddCardToDeckApiResponse>(
      this.getDeckCardsUrl(deckId),
      {
        cardId: card.id,
        name: card.name,
        imageUrl: card.imageUrl,
      }
    ).pipe(
      tap((response) => {
        if (response.deck) {
          this.applyDeckUpdate(response.deck);
        }
      }),
      map((response) => ({
        added: response.added,
        reason: response.reason,
      })),
      catchError(this.fallbackOnNotFound({
        added: false,
        reason: deckOperationReasons.deckNotFound,
      }))
    );
  }

  removeCardFromDeck(deckId: string, cardId: string): Observable<boolean> {
    return this.http.delete<Deck>(this.getDeckCardsUrl(deckId, cardId)).pipe(
      tap((deck) => this.applyDeckUpdate(deck)),
      map(() => true),
      catchError(this.fallbackOnNotFound(false))
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

  private loadDecks(): void {
    this.loadingState.set(true);
    this.loadErrorState.set('');

    this.fetchDecksWithLegacyMigration().pipe(
      finalize(() => {
        this.loadingState.set(false);
        this.initializedState.set(true);
      })
    ).subscribe({
      next: (decks) => {
        this.decksState.set(decks);
        this.clearLoadError();
      },
      error: () => {
        this.loadErrorState.set('Impossible de charger les decks pour le moment.');
      },
    });
  }

  private fetchDecksWithLegacyMigration(): Observable<Deck[]> {
    return this.http.get<Deck[]>(this.decksApiUrl).pipe(
      switchMap((decks) => {
        if (decks.length > 0) {
          return of(decks);
        }

        const legacyDecks = this.loadLegacyDecks();
        if (legacyDecks.length === 0) {
          return of([]);
        }

        return forkJoin(
          legacyDecks.map((deck) =>
            this.http.post<Deck>(this.decksApiUrl, {
              id: deck.id,
              name: deck.name,
              format: deck.format,
              createdAt: deck.createdAt,
              cards: deck.cards.map((card) => ({
                cardId: card.cardId,
                name: card.name,
                imageUrl: card.imageUrl,
                quantity: card.quantity,
              })),
            })
          )
        ).pipe(
          switchMap(() => this.http.get<Deck[]>(this.decksApiUrl)),
          tap(() => this.clearLegacyDecks())
        );
      })
    );
  }

  private loadLegacyDecks(): Deck[] {
    if (!this.canUseStorage()) {
      return [];
    }

    const rawDecks = localStorage.getItem(this.legacyStorageKey);
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

  private clearLegacyDecks(): void {
    if (!this.canUseStorage()) {
      return;
    }

    localStorage.removeItem(this.legacyStorageKey);
  }

  private canUseStorage(): boolean {
    return (
      isPlatformBrowser(this.platformId) &&
      typeof localStorage !== 'undefined' &&
      typeof localStorage.getItem === 'function' &&
      typeof localStorage.removeItem === 'function'
    );
  }

  private isCommanderDeck(deck: Deck): boolean {
    return deck.format.trim().toLowerCase() === 'commander';
  }

  private getDeckUrl(deckId: string): string {
    return `${this.decksApiUrl}/${encodeURIComponent(deckId)}`;
  }

  private getDeckCardsUrl(deckId: string, cardId?: string): string {
    const deckCardsUrl = `${this.getDeckUrl(deckId)}/cards`;
    return cardId ? `${deckCardsUrl}/${encodeURIComponent(cardId)}` : deckCardsUrl;
  }

  private fallbackOnNotFound<T>(fallbackValue: T): (error: HttpErrorResponse) => Observable<T> {
    return (error: HttpErrorResponse) => {
      if (error.status === 404) {
        return of(fallbackValue);
      }

      return throwError(() => error);
    };
  }

  private clearLoadError(): void {
    this.loadErrorState.set('');
  }

  private applyDeckUpdate(deck: Deck): void {
    this.clearLoadError();
    this.upsertDeck(deck);
  }

  private upsertDeck(deck: Deck): void {
    this.decksState.update((decks) => {
      const deckIndex = decks.findIndex((currentDeck) => currentDeck.id === deck.id);
      if (deckIndex === -1) {
        return [...decks, deck];
      }

      const nextDecks = [...decks];
      nextDecks[deckIndex] = deck;
      return nextDecks;
    });
  }
}
