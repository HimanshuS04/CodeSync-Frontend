import { Routes } from '@angular/router';

export const editorRoutes: Routes = [
  {
    path: ':projectId',
    loadComponent: () =>
      import('./editor.component')
        .then(m => m.EditorComponent)
  }
];