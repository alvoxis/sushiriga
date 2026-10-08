import { createContext, useContext } from 'react';

/** Lets content inside pages (e.g. a table of contents) turn the book. */
export interface BookControls {
  goToFace: (face: number) => void;
  next: () => void;
  previous: () => void;
}

export const BookContext = createContext<BookControls | null>(null);

export function useBookControls(): BookControls | null {
  return useContext(BookContext);
}
