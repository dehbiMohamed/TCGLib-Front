import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../Core/config/api-base-url.token';
import { CardDetails } from '../Models/Card-Details';
import { CardListItem } from '../Models/Card-List-Item';
import { CardSearchService } from './card-search-service';

describe('CardSearchService', () => {
  let service: CardSearchService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CardSearchService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_BASE_URL,
          useValue: '/api',
        },
      ],
    });

    service = TestBed.inject(CardSearchService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should return an empty array without calling the api when the query is blank', async () => {
    await expect(firstValueFrom(service.searchCards('   '))).resolves.toEqual([]);

    httpTestingController.expectNone('/api/cards/search?query=');
  });

  it('should search cards through the backend api', async () => {
    const cards: CardListItem[] = [
      {
        id: 'black-lotus',
        name: 'Black Lotus',
        imageUrl: 'https://example.com/black-lotus.jpg',
        setName: 'Limited Edition Alpha',
      },
    ];

    const resultPromise = firstValueFrom(service.searchCards('Black Lotus'));

    const request = httpTestingController.expectOne(
      (req) => req.method === 'GET' && req.url === '/api/cards/search' && req.params.get('query') === 'Black Lotus'
    );

    request.flush(cards);
    await expect(resultPromise).resolves.toEqual(cards);
  });

  it('should load card details through the backend api', async () => {
    const card: CardDetails = {
      id: 'black-lotus',
      name: 'Black Lotus',
      imageUrl: 'https://example.com/black-lotus.jpg',
      manaCost: '{0}',
      typeLine: 'Artifact',
      oracleText: 'Add three mana of any one color.',
      flavorText: 'Power without equal.',
      setName: 'Limited Edition Alpha',
      setCode: 'LEA',
      collectorNumber: '233',
      rarity: 'rare',
      artist: 'Christopher Rush',
      releasedAt: '1993-08-05',
      power: '',
      toughness: '',
      loyalty: '',
      colors: [],
      scryfallUri: 'https://scryfall.com/card/lea/233/black-lotus',
    };

    const resultPromise = firstValueFrom(service.getCardById(card.id));

    const request = httpTestingController.expectOne(`/api/cards/${encodeURIComponent(card.id)}`);

    expect(request.request.method).toBe('GET');
    request.flush(card);
    await expect(resultPromise).resolves.toEqual(card);
  });
});
