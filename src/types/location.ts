/** 0 = Sunday … 6 = Saturday (same as Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface OpeningInterval {
  /** "HH:mm", local restaurant time (Europe/Riga). */
  opens: string;
  closes: string;
}

export type OpeningHours = Record<Weekday, OpeningInterval[]>;

export interface Location {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    postalCode?: string;
    country: string;
  };
  openingHours: OpeningHours;
  phone?: string;
  email?: string;
  active: boolean;
  timeZone: string;
  /** Data that still needs confirmation by the restaurant. */
  todo?: string[];
}

export interface PickupSelection {
  locationId: string;
  /** ISO date-time, or "asap". */
  requestedTime: string | 'asap';
  /** Minutes — the standard estimate shown to the customer; staff set the final time. */
  estimatedPreparationTime: number;
}
