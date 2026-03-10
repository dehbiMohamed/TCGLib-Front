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
