import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { CardListItem } from '../../../../Models/Card-List-Item';
import { DeckCardEntry } from '../../../../Models/Deck';
import { CardSearchService } from '../../../../Services/card-search-service';
import { DeckService } from '../../../../Services/deck-service';

@Component({
  selector: 'app-decks-detail-page',
  imports: [RouterLink],
  templateUrl: './decks-detail-page.html',
  styleUrl: './decks-detail-page.css',
})
export class DecksDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly deckService = inject(DeckService);
  private readonly cardSearchService = inject(CardSearchService);

  readonly deckId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')), {
    initialValue: '',
  });
  readonly deck = computed(() => this.deckService.findDeckById(this.deckId()) ?? null);
  readonly totalCards = computed(() => {
    const currentDeck = this.deck();
    return currentDeck ? this.deckService.getTotalCardCount(currentDeck) : 0;
  });
  readonly validationSummary = computed(() => {
    const currentDeck = this.deck();
    return currentDeck ? this.deckService.getDeckValidationSummary(currentDeck) : null;
  });
  readonly searchQuery = signal('');
  readonly searchResults = signal<CardListItem[]>([]);
  readonly searchLoading = signal(false);
  readonly searchErrorMessage = signal('');
  readonly addCardMessage = signal('');
  readonly addCardMessageTone = signal<'success' | 'warning'>('success');
  readonly searchStarted = computed(() => this.searchQuery().length > 0);
  readonly isCommanderDeck = computed(() => {
    const currentDeck = this.deck();
    return currentDeck ? currentDeck.format.trim().toLowerCase() === 'commander' : false;
  });
  readonly showEmptySearchState = computed(
    () =>
      this.searchStarted() &&
      !this.searchLoading() &&
      !this.searchErrorMessage() &&
      this.searchResults().length === 0
  );

  constructor() {
    toObservable(this.searchQuery)
      .pipe(
        debounceTime(150),
        distinctUntilChanged(),
        tap((query) => {
          this.searchErrorMessage.set('');
          this.addCardMessage.set('');
          this.addCardMessageTone.set('success');
          this.searchLoading.set(query.length > 0);

          if (!query) {
            this.searchResults.set([]);
            this.searchLoading.set(false);
          }
        }),
        switchMap((query) => {
          if (!query) {
            return of([]);
          }

          return this.cardSearchService.searchCards(query).pipe(
            catchError(() => {
              this.searchErrorMessage.set('Erreur pendant la recherche de cartes.');
              return of([]);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((cards) => {
        this.searchResults.set(cards);
        this.searchLoading.set(false);
      });
  }

  increaseCardQuantity(card: DeckCardEntry): void {
    const currentDeck = this.deck();
    if (!currentDeck) {
      return;
    }

    const addResult = this.deckService.addCardToDeck(currentDeck.id, {
      id: card.cardId,
      name: card.name,
      imageUrl: card.imageUrl,
    });

    if (!addResult.added && addResult.reason === 'commander_singleton') {
      this.addCardMessageTone.set('warning');
      this.addCardMessage.set('En Commander, une carte ne peut etre presente qu une seule fois.');
    }
  }

  decreaseCardQuantity(cardId: string): void {
    const currentDeck = this.deck();
    if (!currentDeck) {
      return;
    }

    this.deckService.removeCardFromDeck(currentDeck.id, cardId);
  }

  onSearchQueryChange(query: string): void {
    this.searchQuery.set(query.trim());
  }

  addCard(card: CardListItem): void {
    const currentDeck = this.deck();
    if (!currentDeck) {
      return;
    }

    const addResult = this.deckService.addCardToDeck(currentDeck.id, {
      id: card.id,
      name: card.name,
      imageUrl: card.imageUrl,
    });

    if (addResult.added) {
      this.addCardMessageTone.set('success');
      this.addCardMessage.set(`${card.name} ajoutee au deck ${currentDeck.name}.`);
      return;
    }

    if (addResult.reason === 'commander_singleton') {
      this.addCardMessageTone.set('warning');
      this.addCardMessage.set(
        `${card.name} est deja dans ce deck Commander. Une seule copie est autorisee dans cette version simple du projet.`
      );
    }
  }

  canAddCard(cardId: string): boolean {
    const currentDeck = this.deck();
    return currentDeck ? this.deckService.canAddCardToDeck(currentDeck.id, cardId) : false;
  }
}
