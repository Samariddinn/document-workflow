import { inject, Injector } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { from, map, of, switchMap } from 'rxjs';
import type { ConfirmDialogData } from './confirm-dialog/confirm-dialog';

/** Implemented by pages that hold work the user would lose by navigating away. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Asks before leaving a page with unsaved changes (in-app navigation; see also `beforeunload` on the page).
 * The dialog code is loaded only when it has to be shown, so it stays out of the initial bundle.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (page) => {
  if (!page.hasUnsavedChanges()) return true;

  const injector = inject(Injector);
  const data: ConfirmDialogData = {
    title: 'Discard changes?',
    message: 'You have unsaved changes on this page. If you leave now, they will be lost.',
    confirmLabel: 'Discard',
    destructive: true,
    action: () => of(true),
  };

  return from(
    Promise.all([import('@angular/material/dialog'), import('./confirm-dialog/confirm-dialog')]),
  ).pipe(
    switchMap(([{ MatDialog }, { ConfirmDialog }]) =>
      injector
        .get(MatDialog)
        .open(ConfirmDialog, { data, width: '420px', maxWidth: 'calc(100vw - 32px)' })
        .afterClosed(),
    ),
    map((discard) => discard === true),
  );
};
