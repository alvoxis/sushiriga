export interface GuestContact {
  name: string;
  phone: string;
  email?: string;
}

export type Customer =
  ({ type: 'guest' } & GuestContact) | ({ type: 'registered'; customerId: string } & GuestContact);
