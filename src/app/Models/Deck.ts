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

export interface DeckValidationSummary {
  totalCards: number;
  targetCardCount: number;
  ruleLabel: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger';
  detailMessage: string;
  isValid: boolean;
}

export interface AddCardToDeckResult {
  added: boolean;
  reason: 'added' | 'commander_singleton' | 'deck_not_found';
}
