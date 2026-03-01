import axios from 'axios';
import { Turf, Booking } from '../types';

// Get API base URL from environment or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- TURF ENDPOINTS ---

export const fetchTurfs = async (): Promise<Turf[]> => {
  const response = await api.get('/api/turfs');
  return response.data;
};

export const fetchSlots = async (turfId: string, bookingDate: string) => {
  const response = await api.get(`/api/slots/${turfId}`, {
    params: { booking_date: bookingDate }
  });
  return response.data;
};

// --- BOOKING ENDPOINTS ---

export interface BookSlotData {
  turf_id: string;
  turf_name: string;
  slot_time: string;
  booking_date: string;
  customer_name: string;
  customer_email: string;  // Changed from customer_mobile
  court_type: string;
  price: number;
}

export const bookSlot = async (data: BookSlotData) => {
  const response = await api.post('/api/book', data);
  return response.data;
};

// --- AUTH ENDPOINTS ---

export const registerUser = async (email: string, password: string, name: string) => {
  const response = await api.post('/api/auth/register', { email, password, name });
  return response.data;
};

export const updateProfile = async (data: { email: string; name: string; password?: string }) => {
  const response = await api.put('/api/users/me', data);
  return response.data;
};

export const verifyEmail = async (email: string, otp: string) => {
  const response = await api.post('/api/auth/verify-email', { email, otp });
  return response.data;
};

export const loginUser = async (email: string, password: string) => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
};

// --- ADMIN ENDPOINTS ---

export const getAdminStats = async () => {
  const response = await api.get('/api/admin/stats');
  return response.data;
};

export const getRecentBookings = async (limit: number = 10): Promise<Booking[]> => {
  const response = await api.get('/api/admin/bookings', {
    params: { limit }
  });
  return response.data;
};

// --- MANAGE ENDPOINTS ---

export const createTurf = async (data: any) => {
  const response = await api.post('/api/turfs', data);
  return response.data;
};

export const deleteTurf = async (turfId: string) => {
  const response = await api.delete(`/api/turfs/${turfId}`);
  return response.data;
};

export const fetchUsers = async (role?: string) => {
  const params = role ? { role } : {};
  const response = await api.get('/api/users', { params });
  return response.data;
};

export const createStaff = async (data: any) => {
  const response = await api.post('/api/admin/staff', data);
  return response.data;
};

export const deleteStaff = async (staffId: number) => {
  const response = await api.delete(`/api/admin/staff/${staffId}`);
  return response.data;
};

export const getTurfDetails = async (turfId: string) => {
  const response = await api.get(`/api/turfs/${turfId}`);
  return response.data;
};

export const getTurfBookings = async (turfId: string) => {
  const response = await api.get(`/api/turfs/${turfId}/bookings`);
  return response.data;
};

export const fetchUserBookings = async (email: string) => {
  if (!email) {
    console.error("fetchUserBookings called with empty email");
    return [];
  }
  const response = await api.get(`/api/bookings`, { params: { email } });
  return response.data;
};

export const cancelBooking = async (bookingId: string) => {
  const response = await api.post(`/api/bookings/${bookingId}/cancel`);
  return response.data;
};

export const resetDatabase = async () => {
  const response = await api.post('/api/reset');
  return response.data;
};

export default api;
