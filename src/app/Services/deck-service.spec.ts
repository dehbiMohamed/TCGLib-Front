import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { vi } from 'vitest';

import { DeckService } from './deck-service';

describe('DeckService', () => {
  let service: DeckService;
  let storageMock: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  const createStorageMock = () => {
    const storage = new Map<string, string>();

    return {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => {
        storage.clear();
      }),
    };
  };

  beforeEach(() => {
    storageMock = createStorageMock();
    vi.stubGlobal('localStorage', storageMock);

    TestBed.configureTestingModule({
      providers: [
        DeckService,
        {
          provide: PLATFORM_ID,
          useValue: 'browser',
        },
      ],
    });

    service = TestBed.inject(DeckService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create a deck with trimmed name and format', () => {
    const createdDeck = service.createDeck('  Esper Control  ', ' Standard ');

    expect(createdDeck).not.toBeNull();
    expect(createdDeck?.name).toBe('Esper Control');
    expect(createdDeck?.format).toBe('Standard');
    expect(service.decks()).toHaveLength(1);
    expect(storageMock.setItem).toHaveBeenCalled();
  });

  it('should increase quantity when the same card is added twice in a non-commander deck', () => {
    const deck = service.createDeck('Izzet Spells', 'Modern');

    expect(deck).not.toBeNull();

    const firstAdd = service.addCardToDeck(deck!.id, {
      id: 'lightning-bolt',
      name: 'Lightning Bolt',
      imageUrl: 'https://example.test/lightning-bolt.jpg',
    });
    const secondAdd = service.addCardToDeck(deck!.id, {
      id: 'lightning-bolt',
      name: 'Lightning Bolt',
      imageUrl: 'https://example.test/lightning-bolt.jpg',
    });

    const updatedDeck = service.findDeckById(deck!.id);

    expect(firstAdd).toEqual({ added: true, reason: 'added' });
    expect(secondAdd).toEqual({ added: true, reason: 'added' });
    expect(updatedDeck?.cards).toEqual([
      {
        cardId: 'lightning-bolt',
        name: 'Lightning Bolt',
        imageUrl: 'https://example.test/lightning-bolt.jpg',
        quantity: 2,
      },
    ]);
  });

  it('should block duplicate cards in a commander deck', () => {
    const deck = service.createDeck('Atraxa Value', 'Commander');

    expect(deck).not.toBeNull();

    const firstAdd = service.addCardToDeck(deck!.id, {
      id: 'sol-ring',
      name: 'Sol Ring',
      imageUrl: 'https://example.test/sol-ring.jpg',
    });
    const secondAdd = service.addCardToDeck(deck!.id, {
      id: 'sol-ring',
      name: 'Sol Ring',
      imageUrl: 'https://example.test/sol-ring.jpg',
    });

    const updatedDeck = service.findDeckById(deck!.id);

    expect(firstAdd).toEqual({ added: true, reason: 'added' });
    expect(secondAdd).toEqual({ added: false, reason: 'commander_singleton' });
    expect(updatedDeck?.cards).toHaveLength(1);
    expect(updatedDeck?.cards[0].quantity).toBe(1);
  });

  it('should report duplicate cards as invalid after switching a deck to commander', () => {
    const deck = service.createDeck('Rakdos Sacrifice', 'Standard');

    expect(deck).not.toBeNull();

    service.addCardToDeck(deck!.id, {
      id: 'fatal-push',
      name: 'Fatal Push',
      imageUrl: 'https://example.test/fatal-push.jpg',
    });
    service.addCardToDeck(deck!.id, {
      id: 'fatal-push',
      name: 'Fatal Push',
      imageUrl: 'https://example.test/fatal-push.jpg',
    });
    service.updateDeck(deck!.id, { name: 'Rakdos Sacrifice', format: 'Commander' });

    const updatedDeck = service.findDeckById(deck!.id);
    const summary = service.getDeckValidationSummary(updatedDeck!);

    expect(summary.isValid).toBe(false);
    expect(summary.statusTone).toBe('danger');
    expect(summary.statusLabel).toBe('Doublons interdits');
  });
});
