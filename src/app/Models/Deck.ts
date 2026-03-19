export interface DeckCardEntry {
  cardId: string;
  name: string;
  imageUrl: string;
  quantity: number;
}

export interface Deck {
  id: string;
  name: string;
  format: string;
  createdAt: string;
  cards: DeckCardEntry[];
}

export interface DeckFormatRule {
  targetCardCount: number;
  cardCountMode: 'minimum' | 'exact';
  allowDuplicates: boolean;
  ruleLabel: string;
  helperText: string;
}

export interface DeckValidationSummary {
  totalCards: number;
  targetCardCount: number;
  ruleLabel: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger';
  detailMessage: string;
  isValid: boolean;
}

export const deckOperationReasons = {
  added: 'added',
  commanderSingleton: 'commander_singleton',
  deckNotFound: 'deck_not_found',
} as const;

export type DeckOperationReason = (typeof deckOperationReasons)[keyof typeof deckOperationReasons];

export interface AddCardToDeckResult {
  added: boolean;
  reason: DeckOperationReason;
}
