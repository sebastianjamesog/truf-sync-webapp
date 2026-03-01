import { TimeSlot, Booking, ChartData, Turf } from './types';

export const TIME_SLOTS: TimeSlot[] = [
  { id: '1', time: '5:00 PM', isBooked: true, price: 600 },
  { id: '2', time: '6:00 PM', isBooked: true, price: 800 },
  { id: '3', time: '7:00 PM', isBooked: false, price: 1000 },
  { id: '4', time: '8:00 PM', isBooked: false, price: 1200 },
  { id: '5', time: '9:00 PM', isBooked: false, price: 1200 },
  { id: '6', time: '10:00 PM', isBooked: false, price: 1000 },
  { id: '7', time: '11:00 PM', isBooked: true, price: 800 },
  { id: '8', time: '12:00 AM', isBooked: false, price: 600 },
];

export const RECENT_BOOKINGS: Booking[] = [
  { id: 'B001', customerName: 'Rahul Sharma', time: '5:00 PM', court: 'Turf A', status: 'Confirmed', price: 600, date: '2023-10-27' },
  { id: 'B002', customerName: 'Amit Verma', time: '6:00 PM', court: 'Turf B', status: 'Confirmed', price: 800, date: '2023-10-27' },
  { id: 'B003', customerName: 'Sneha Gupta', time: '11:00 PM', court: 'Turf A', status: 'Pending', price: 800, date: '2023-10-27' },
  { id: 'B004', customerName: 'John Doe', time: '4:00 PM', court: 'Turf C', status: 'Cancelled', price: 500, date: '2023-10-27' },
  { id: 'B005', customerName: 'Vikram Singh', time: '9:00 PM', court: 'Turf B', status: 'Confirmed', price: 1200, date: '2023-10-26' },
];

export const PLAYER_HISTORY: Booking[] = [
  { id: 'H001', customerName: 'You', time: '7:00 PM', court: 'Turf A', status: 'Confirmed', price: 1000, date: 'Today' },
  { id: 'H002', customerName: 'You', time: '8:00 PM', court: 'Turf B', status: 'Confirmed', price: 1200, date: 'Yesterday' },
  { id: 'H003', customerName: 'You', time: '6:00 PM', court: 'Turf A', status: 'Cancelled', price: 800, date: '20 Oct' },
];

export const EARNINGS_DATA: ChartData[] = [
  { name: 'Mon', value: 4000 },
  { name: 'Tue', value: 3000 },
  { name: 'Wed', value: 5000 },
  { name: 'Thu', value: 2780 },
  { name: 'Fri', value: 6890 },
  { name: 'Sat', value: 9390 },
  { name: 'Sun', value: 8490 },
];

export const TURFS: Turf[] = [];

export const COLORS = {
  background: '#0F172A',
  primary: '#10B981',
  error: '#EF4444',
  text: '#F8FAFC',
};