import { Routes } from '@angular/router';

export const UNIDADES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./unidades-list/unidades-list').then((m) => m.UnidadesList),
  },
  {
    path: ':unidadeId',
    loadComponent: () =>
      import('./unidade-detail/unidade-detail').then((m) => m.UnidadeDetail),
  },
  {
    path: ':unidadeId/modelo/:modeloId',
    loadComponent: () =>
      import('../modelo/modelo-detail/modelo-detail').then(
        (m) => m.ModeloDetail,
      ),
  },
];
