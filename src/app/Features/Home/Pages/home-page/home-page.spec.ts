import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CardListItem } from '../../../../Models/Card-List-Item';
import { CardSearchService } from '../../../../Services/card-search-service';
import { HomePage } from './home-page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let cardSearchServiceStub: {
    searchCards: ReturnType<typeof vi.fn>;
  };

  const featuredCards: CardListItem[] = [
    {
      id: 'black-lotus',
      name: 'Black Lotus',
      imageUrl: 'https://example.com/black-lotus.jpg',
      setName: 'Limited Edition Alpha',
    },
    {
      id: 'lightning-bolt',
      name: 'Lightning Bolt',
      imageUrl: 'https://example.com/lightning-bolt.jpg',
      setName: 'Magic 2010',
    },
  ];

  beforeEach(async () => {
    cardSearchServiceStub = {
      searchCards: vi.fn().mockReturnValue(of(featuredCards)),
    };

    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        {
          provide: CardSearchService,
          useValue: cardSearchServiceStub,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the compact home title and highlighted points', () => {
    const pageContent = fixture.nativeElement.textContent;

    expect(pageContent).toContain('TCGLib');
    expect(pageContent).toContain('Decks');
    expect(pageContent).toContain('Cartes');
    expect(cardSearchServiceStub.searchCards).toHaveBeenCalledWith(
      '(!"Black Lotus" or !"Lightning Bolt" or !"Counterspell" or !"Sol Ring" or !"Birds of Paradise" or !"Dark Ritual" or !"Wrath of God" or !"Shivan Dragon")',
    );
  });

  it('should expose quick access links to cards and decks', () => {
    const linkElements = Array.from(
      fixture.nativeElement.querySelectorAll('a'),
    ) as HTMLAnchorElement[];
    const hrefs = linkElements
      .map((linkElement) => linkElement.getAttribute('href'))
      .filter((href): href is string => href !== null);

    expect(hrefs).toContain('/cards');
    expect(hrefs).toContain('/decks');
    expect(linkElements).toHaveLength(6);
  });

  it('should render the scrolling featured card links', () => {
    const cardLinks = Array.from(
      fixture.nativeElement.querySelectorAll('a[href^="/cards/"]'),
    ) as HTMLAnchorElement[];

    expect(cardLinks).toHaveLength(4);
    expect(cardLinks.map((link) => link.getAttribute('href'))).toContain('/cards/black-lotus?fromHome=1');
    expect(cardLinks.map((link) => link.getAttribute('href'))).toContain('/cards/lightning-bolt?fromHome=1');
  });
});
