import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { CardListItem } from '../../../../Models/Card-List-Item';
import { deckOperationReasons, Deck, DeckCardEntry } from '../../../../Models/Deck';
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
  private readonly router = inject(Router);
  private readonly deckService = inject(DeckService);
  private readonly cardSearchService = inject(CardSearchService);
  private lastSyncedDeckSettingsKey = '';

  readonly deckId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')), {
    initialValue: '',
  });
  readonly deck = computed(() => this.deckService.findDeckById(this.deckId()) ?? null);
  readonly decksLoading = this.deckService.loading;
  readonly decksLoadError = this.deckService.loadError;
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
  readonly deckSettingsMessage = signal('');
  readonly deckSettingsMessageTone = signal<'success' | 'warning'>('success');
  readonly showDeckSettings = signal(false);
  readonly draftDeckName = signal('');
  readonly draftDeckFormat = signal('');
  readonly searchStarted = computed(() => this.searchQuery().length > 0);
  readonly formatOptions = ['Standard', 'Modern', 'Pioneer', 'Commander'];
  readonly previewDeck = computed<Deck | null>(() => {
    const currentDeck = this.deck();
    if (!currentDeck) {
      return null;
    }

    return {
      ...currentDeck,
      name: this.draftDeckName().trim() || currentDeck.name,
      format: this.draftDeckFormat().trim() || currentDeck.format,
    };
  });
  readonly previewFormatRule = computed(() => {
    const currentDeck = this.previewDeck();
    return currentDeck ? this.deckService.getDeckFormatRule(currentDeck.format) : null;
  });
  readonly previewValidationSummary = computed(() => {
    const currentDeck = this.previewDeck();
    return currentDeck ? this.deckService.getDeckValidationSummary(currentDeck) : null;
  });
  readonly hasPendingDeckChanges = computed(() => {
    const currentDeck = this.deck();
    if (!currentDeck) {
      return false;
    }

    return (
      this.draftDeckName().trim() !== currentDeck.name ||
      this.draftDeckFormat().trim() !== currentDeck.format
    );
  });
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
    effect(() => {
      const currentDeck = this.deck();
      if (!currentDeck) {
        this.lastSyncedDeckSettingsKey = '';
        return;
      }

      const deckSettingsKey = `${currentDeck.id}|${currentDeck.name}|${currentDeck.format}`;

      if (deckSettingsKey === this.lastSyncedDeckSettingsKey) {
        return;
      }

      this.lastSyncedDeckSettingsKey = deckSettingsKey;
      this.draftDeckName.set(currentDeck.name);
      this.draftDeckFormat.set(currentDeck.format);
    });

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

  onDeckNameChange(name: string): void {
    this.draftDeckName.set(name);
    this.deckSettingsMessage.set('');
  }

  onDeckFormatChange(format: string): void {
    this.draftDeckFormat.set(format);
    this.deckSettingsMessage.set('');
  }

  toggleDeckSettings(): void {
    this.showDeckSettings.update((currentValue) => !currentValue);
    this.deckSettingsMessage.set('');
  }

  increaseCardQuantity(card: DeckCardEntry): void {
    const currentDeck = this.deck();
    if (!currentDeck) {
      return;
    }

    this.deckService.addCardToDeck(currentDeck.id, {
      id: card.cardId,
      name: card.name,
      imageUrl: card.imageUrl,
    }).subscribe({
      next: (addResult) => {
        if (!addResult.added && addResult.reason === deckOperationReasons.commanderSingleton) {
          this.addCardMessageTone.set('warning');
          this.addCardMessage.set('En Commander, une carte ne peut etre presente qu une seule fois.');
        }
      },
      error: () => {
        this.addCardMessageTone.set('warning');
        this.addCardMessage.set('Impossible de modifier cette carte pour le moment.');
      },
    });
  }

  decreaseCardQuantity(cardId: string): void {
    const currentDeck = this.deck();
    if (!currentDeck) {
      return;
    }

    this.deckService.removeCardFromDeck(currentDeck.id, cardId).subscribe({
      error: () => {
        this.addCardMessageTone.set('warning');
        this.addCardMessage.set('Impossible de modifier cette carte pour le moment.');
      },
    });
  }

  onSearchQueryChange(query: string): void {
    this.searchQuery.set(query.trim());
  }

  addCard(card: CardListItem): void {
    const currentDeck = this.deck();
    if (!currentDeck) {
      return;
    }

    this.deckService.addCardToDeck(currentDeck.id, {
      id: card.id,
      name: card.name,
      imageUrl: card.imageUrl,
    }).subscribe({
      next: (addResult) => {
        if (addResult.added) {
          this.addCardMessageTone.set('success');
          this.addCardMessage.set(`${card.name} ajoutee au deck ${currentDeck.name}.`);
          return;
        }

        if (addResult.reason === deckOperationReasons.commanderSingleton) {
          this.addCardMessageTone.set('warning');
          this.addCardMessage.set(
            `${card.name} est deja dans ce deck Commander. Une seule copie est autorisee dans cette version simple du projet.`
          );
        }
      },
      error: () => {
        this.addCardMessageTone.set('warning');
        this.addCardMessage.set('Impossible d ajouter cette carte pour le moment.');
      },
    });
  }

  canAddCard(cardId: string): boolean {
    const currentDeck = this.deck();
    return currentDeck ? this.deckService.canAddCardToDeck(currentDeck.id, cardId) : false;
  }

  updateDeckInfo(name: string, format: string): void {
    const currentDeck = this.deck();
    if (!currentDeck) {
      return;
    }

    this.deckService.updateDeck(currentDeck.id, { name, format }).subscribe({
      next: (updatedDeck) => {
        if (!updatedDeck) {
          this.deckSettingsMessageTone.set('warning');
          this.deckSettingsMessage.set('Entre un nom de deck et un format valides.');
          return;
        }

        this.deckSettingsMessageTone.set('success');
        this.deckSettingsMessage.set(
          `Parametres du deck ${updatedDeck.name} mis a jour. Nouvelle regle: ${this.deckService.getDeckFormatRule(updatedDeck.format).ruleLabel}.`
        );
        this.showDeckSettings.set(false);
      },
      error: () => {
        this.deckSettingsMessageTone.set('warning');
        this.deckSettingsMessage.set('Impossible de mettre a jour ce deck pour le moment.');
      },
    });
  }

  deleteCurrentDeck(): void {
    const currentDeck = this.deck();
    if (!currentDeck) {
      return;
    }

    const shouldDelete =
      typeof globalThis.confirm !== 'function' ||
      globalThis.confirm(`Supprimer le deck "${currentDeck.name}" ?`);

    if (!shouldDelete) {
      return;
    }

    this.deckService.removeDeck(currentDeck.id).subscribe({
      next: (removed) => {
        if (removed) {
          void this.router.navigate(['/decks']);
        }
      },
      error: () => {
        this.deckSettingsMessageTone.set('warning');
        this.deckSettingsMessage.set('Impossible de supprimer ce deck pour le moment.');
      },
    });
  }
}
