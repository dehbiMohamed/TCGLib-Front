import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../Core/config/api-base-url.token';
import { Deck } from '../Models/Deck';
import { DeckService } from './deck-service';

describe('DeckService', () => {
  let service: DeckService;
  let httpTestingController: HttpTestingController;

  const standardDeck: Deck = {
    id: 'izzet-spells-1',
    name: 'Izzet Spells',
    format: 'Modern',
    createdAt: '2026-03-11T00:00:00.000Z',
    cards: [],
  };

  const commanderDeck: Deck = {
    id: 'atraxa-value-1',
    name: 'Atraxa Value',
    format: 'Commander',
    createdAt: '2026-03-12T00:00:00.000Z',
    cards: [],
  };

  function createService(initialDecks: Deck[] = []): void {
    service = TestBed.inject(DeckService);
    httpTestingController = TestBed.inject(HttpTestingController);

    const request = httpTestingController.expectOne('/api/decks');
    expect(request.request.method).toBe('GET');
    request.flush(initialDecks);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DeckService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: PLATFORM_ID,
          useValue: 'browser',
        },
        {
          provide: API_BASE_URL,
          useValue: '/api',
        },
      ],
    });
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should load decks from the api on startup', () => {
    createService([standardDeck]);

    expect(service.decks()).toEqual([standardDeck]);
    expect(service.loading()).toBe(false);
    expect(service.initialized()).toBe(true);
    expect(service.loadError()).toBe('');
  });

  it('should create a deck with trimmed name and format', async () => {
    createService();

    const createdDeck: Deck = {
      id: 'esper-control-1',
      name: 'Esper Control',
      format: 'Standard',
      createdAt: '2026-03-19T00:00:00.000Z',
      cards: [],
    };

    const resultPromise = firstValueFrom(service.createDeck('  Esper Control  ', ' Standard '));
    const request = httpTestingController.expectOne('/api/decks');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Esper Control',
      format: 'Standard',
    });

    request.flush(createdDeck);

    await expect(resultPromise).resolves.toEqual(createdDeck);
    expect(service.decks()).toEqual([createdDeck]);
  });

  it('should increase quantity when the same card is added twice in a non-commander deck', async () => {
    createService([standardDeck]);

    const firstDeckVersion: Deck = {
      ...standardDeck,
      cards: [
        {
          cardId: 'lightning-bolt',
          name: 'Lightning Bolt',
          imageUrl: 'https://example.test/lightning-bolt.jpg',
          quantity: 1,
        },
      ],
    };
    const secondDeckVersion: Deck = {
      ...standardDeck,
      cards: [
        {
          cardId: 'lightning-bolt',
          name: 'Lightning Bolt',
          imageUrl: 'https://example.test/lightning-bolt.jpg',
          quantity: 2,
        },
      ],
    };

    const firstAddPromise = firstValueFrom(
      service.addCardToDeck(standardDeck.id, {
        id: 'lightning-bolt',
        name: 'Lightning Bolt',
        imageUrl: 'https://example.test/lightning-bolt.jpg',
      })
    );
    const firstRequest = httpTestingController.expectOne(`/api/decks/${encodeURIComponent(standardDeck.id)}/cards`);

    expect(firstRequest.request.method).toBe('POST');
    firstRequest.flush({
      added: true,
      reason: 'added',
      deck: firstDeckVersion,
    });

    await expect(firstAddPromise).resolves.toEqual({ added: true, reason: 'added' });

    const secondAddPromise = firstValueFrom(
      service.addCardToDeck(standardDeck.id, {
        id: 'lightning-bolt',
        name: 'Lightning Bolt',
        imageUrl: 'https://example.test/lightning-bolt.jpg',
      })
    );
    const secondRequest = httpTestingController.expectOne(`/api/decks/${encodeURIComponent(standardDeck.id)}/cards`);
    secondRequest.flush({
      added: true,
      reason: 'added',
      deck: secondDeckVersion,
    });

    await expect(secondAddPromise).resolves.toEqual({ added: true, reason: 'added' });
    expect(service.findDeckById(standardDeck.id)?.cards).toEqual([
      {
        cardId: 'lightning-bolt',
        name: 'Lightning Bolt',
        imageUrl: 'https://example.test/lightning-bolt.jpg',
        quantity: 2,
      },
    ]);
  });

  it('should block duplicate cards in a commander deck', async () => {
    createService([commanderDeck]);

    const deckWithCard: Deck = {
      ...commanderDeck,
      cards: [
        {
          cardId: 'sol-ring',
          name: 'Sol Ring',
          imageUrl: 'https://example.test/sol-ring.jpg',
          quantity: 1,
        },
      ],
    };

    const firstAddPromise = firstValueFrom(
      service.addCardToDeck(commanderDeck.id, {
        id: 'sol-ring',
        name: 'Sol Ring',
        imageUrl: 'https://example.test/sol-ring.jpg',
      })
    );
    httpTestingController.expectOne(`/api/decks/${encodeURIComponent(commanderDeck.id)}/cards`).flush({
      added: true,
      reason: 'added',
      deck: deckWithCard,
    });

    await expect(firstAddPromise).resolves.toEqual({ added: true, reason: 'added' });

    const secondAddPromise = firstValueFrom(
      service.addCardToDeck(commanderDeck.id, {
        id: 'sol-ring',
        name: 'Sol Ring',
        imageUrl: 'https://example.test/sol-ring.jpg',
      })
    );
    httpTestingController.expectOne(`/api/decks/${encodeURIComponent(commanderDeck.id)}/cards`).flush({
      added: false,
      reason: 'commander_singleton',
      deck: deckWithCard,
    });

    await expect(secondAddPromise).resolves.toEqual({
      added: false,
      reason: 'commander_singleton',
    });
    expect(service.findDeckById(commanderDeck.id)?.cards).toHaveLength(1);
    expect(service.findDeckById(commanderDeck.id)?.cards[0].quantity).toBe(1);
  });

  it('should report duplicate cards as invalid after switching a deck to commander', async () => {
    const duplicateDeck: Deck = {
      ...standardDeck,
      cards: [
        {
          cardId: 'fatal-push',
          name: 'Fatal Push',
          imageUrl: 'https://example.test/fatal-push.jpg',
          quantity: 2,
        },
      ],
    };

    createService([duplicateDeck]);

    const updatedCommanderDeck: Deck = {
      ...duplicateDeck,
      format: 'Commander',
    };

    const resultPromise = firstValueFrom(
      service.updateDeck(duplicateDeck.id, { name: duplicateDeck.name, format: 'Commander' })
    );
    const request = httpTestingController.expectOne(`/api/decks/${encodeURIComponent(duplicateDeck.id)}`);

    expect(request.request.method).toBe('PUT');
    request.flush(updatedCommanderDeck);

    await expect(resultPromise).resolves.toEqual(updatedCommanderDeck);

    const summary = service.getDeckValidationSummary(service.findDeckById(duplicateDeck.id)!);

    expect(summary.isValid).toBe(false);
    expect(summary.statusTone).toBe('danger');
    expect(summary.statusLabel).toBe('Doublons interdits');
  });
});
