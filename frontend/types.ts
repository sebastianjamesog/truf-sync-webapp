export interface TimeSlot {
  id: string;
  time: string;
  isBooked: boolean;
  price: number;
}

export interface Booking {
  id: string;
  customerName: string;
  time: string;
  court: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  price: number;
  date: string;
}

export interface ChartData {
  name: string;
  value: number;
}

export enum AppView {
  LANDING = 'LANDING',
  MOBILE_BOOKING = 'MOBILE_BOOKING',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD'
}

export interface GeminiResponse {
  analysis: string;
  actionItems?: string[];
}

export interface Turf {
  id: string;
  name: string;
  location: string;
  image: string;
  rating: number;
  priceStart: number;
  slotPrices?: Record<string, number>;
  sports: string[];
  distance: string;
}
