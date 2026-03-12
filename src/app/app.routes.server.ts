import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'cards',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'decks',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'cards/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'decks/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
