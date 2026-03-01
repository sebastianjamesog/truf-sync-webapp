import React, { useState, useEffect } from 'react';
import {
    Calendar, MapPin, LogOut, LayoutDashboard, Settings,
    CheckCircle, XCircle, Search, Filter
} from 'lucide-react';
import { getTurfDetails, getTurfBookings, fetchSlots, bookSlot } from '../services/api';
import { Turf, Booking } from '../types';
import wsService from '../services/websocket';

interface StaffDashboardProps {
    onLogout: () => void;
    turfId: string;
}

const getLocalDateString = () => {
    const now = new Date();
    const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localTime.toISOString().split('T')[0];
};

const StaffDashboard: React.FC<StaffDashboardProps> = ({ onLogout, turfId }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'bookings'>('overview');
    const [turf, setTurf] = useState<Turf | null>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showOfflineBookingModal, setShowOfflineBookingModal] = useState(false);
    const [offlineSlots, setOfflineSlots] = useState<any[]>([]);
    const [offlineSlotsLoading, setOfflineSlotsLoading] = useState(false);
    const [creatingOfflineBooking, setCreatingOfflineBooking] = useState(false);
    const [offlineBookingForm, setOfflineBookingForm] = useState({
        customerName: '',
        customerContact: '',
        bookingDate: getLocalDateString(),
        slotId: ''
    });
    const todayIso = new Date().toISOString().split('T')[0];
    const confirmedBookings = bookings.filter((b: any) => b.status === 'Confirmed');
    const todaysRevenue = confirmedBookings.reduce((acc: number, b: any) => {
        return b.date === todayIso ? acc + (Number(b.price) || 0) : acc;
    }, 0);
    const totalRevenue = confirmedBookings.reduce((acc: number, b: any) => acc + (Number(b.price) || 0), 0);

    useEffect(() => {
        if (turfId) {
            loadData(true);
        }
    }, [turfId]);

    useEffect(() => {
        if (!turfId) return;

        wsService.connect();
        const unsubscribe = wsService.onMessage((data) => {
            if (data.type === 'SLOT_BOOKED' || data.type === 'RESET') {
                if (!data.turf_id || data.turf_id === turfId) {
                    loadData(false);
                }
            }
        });

        const intervalId = setInterval(() => {
            loadData(false);
        }, 15000);

        return () => {
            unsubscribe();
            clearInterval(intervalId);
            wsService.disconnect();
        };
    }, [turfId]);

    const loadData = async (showLoader: boolean = false) => {
        if (showLoader) {
            setLoading(true);
        }
        try {
            const turfData = await getTurfDetails(turfId);
            setTurf(turfData);

            const bookingsData = await getTurfBookings(turfId);
            setBookings(bookingsData);
        } catch (e) {
            console.error(e);
        } finally {
            if (showLoader) {
                setLoading(false);
            }
        }
    };

    const loadOfflineSlots = async (bookingDate: string) => {
        if (!turfId) return;
        setOfflineSlotsLoading(true);
        try {
            const slotsData = await fetchSlots(turfId, bookingDate);
            setOfflineSlots(slotsData);
            setOfflineBookingForm(prev => {
                const selectedStillAvailable = slotsData.some((slot: any) => slot.id === prev.slotId && !slot.isBooked);
                return selectedStillAvailable ? prev : { ...prev, slotId: '' };
            });
        } catch (e) {
            console.error('Failed to load slots for offline booking', e);
            setOfflineSlots([]);
        } finally {
            setOfflineSlotsLoading(false);
        }
    };

    const openOfflineBookingModal = () => {
        const date = getLocalDateString();
        setOfflineBookingForm({
            customerName: '',
            customerContact: '',
            bookingDate: date,
            slotId: ''
        });
        setShowOfflineBookingModal(true);
        loadOfflineSlots(date);
    };

    const handleCreateOfflineBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!turf) return;

        const selectedSlot = offlineSlots.find((slot: any) => slot.id === offlineBookingForm.slotId && !slot.isBooked);
        if (!selectedSlot) {
            alert('Please select an available slot.');
            return;
        }
        if (!offlineBookingForm.customerName.trim()) {
            alert('Customer name is required.');
            return;
        }

        setCreatingOfflineBooking(true);
        try {
            const fallbackContact = `walkin-${Date.now()}@offline.local`;
            await bookSlot({
                turf_id: turf.id,
                turf_name: turf.name,
                slot_time: selectedSlot.time,
                booking_date: offlineBookingForm.bookingDate,
                customer_name: offlineBookingForm.customerName.trim(),
                customer_email: offlineBookingForm.customerContact.trim() || fallbackContact,
                court_type: '5v5',
                price: selectedSlot.price
            });

            alert('Offline booking created successfully.');
            setShowOfflineBookingModal(false);
            setOfflineSlots([]);
            loadData(false);
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to create offline booking');
            loadOfflineSlots(offlineBookingForm.bookingDate);
        } finally {
            setCreatingOfflineBooking(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center text-white">
            Loading Dashboard...
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-text flex">
            {/* Sidebar */}
            <div className="w-64 bg-surface border-r border-white/5 p-6 flex flex-col">
                <div className="mb-10">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-primary bg-clip-text text-transparent">
                        Turf Staff
                    </h1>
                    {turf && <p className="text-xs text-textMuted mt-1">{turf.name}</p>}
                </div>

                <nav className="space-y-2 flex-1">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'overview' ? 'bg-primary/20 text-primary' : 'text-textMuted hover:bg-white/5 hover:text-white'}`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="font-medium">Overview</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'bookings' ? 'bg-primary/20 text-primary' : 'text-textMuted hover:bg-white/5 hover:text-white'}`}
                    >
                        <Calendar className="w-5 h-5" />
                        <span className="font-medium">Bookings</span>
                    </button>
                </nav>

                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors mt-auto"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">

                {/* VIEW: OVERVIEW */}
                {activeTab === 'overview' && turf && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <h2 className="text-3xl font-bold text-white">Turf Overview</h2>

                        <div className="bg-surface border border-white/10 rounded-3xl overflow-hidden relative h-64">
                            <img src={turf.image} alt={turf.name} className="w-full h-full object-cover opacity-50" />
                            <div className="absolute bottom-0 left-0 p-8 bg-gradient-to-t from-black/80 to-transparent w-full">
                                <h1 className="text-4xl font-bold text-white mb-2">{turf.name}</h1>
                                <p className="text-lg text-textMuted flex items-center gap-2">
                                    <MapPin className="w-5 h-5" /> {turf.location}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            <div className="bg-surface border border-white/10 p-6 rounded-2xl">
                                <span className="text-textMuted block mb-2">Total Bookings</span>
                                <h3 className="text-3xl font-bold text-white">{bookings.length}</h3>
                            </div>
                            <div className="bg-surface border border-white/10 p-6 rounded-2xl">
                                <span className="text-textMuted block mb-2">Today's Revenue</span>
                                <h3 className="text-3xl font-bold text-white">
                                    ₹{todaysRevenue}
                                </h3>
                            </div>
                            <div className="bg-surface border border-white/10 p-6 rounded-2xl">
                                <span className="text-textMuted block mb-2">Total Revenue</span>
                                <h3 className="text-3xl font-bold text-white">
                                    ₹{totalRevenue}
                                </h3>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: BOOKINGS */}
                {activeTab === 'bookings' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-bold text-white">Manage Bookings</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={openOfflineBookingModal}
                                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                                >
                                    Add Offline Booking
                                </button>
                                <input className="bg-surface border border-white/10 px-4 py-2 rounded-xl text-sm text-white" placeholder="Search customer..." />
                            </div>
                        </div>

                        <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-textMuted text-xs uppercase">
                                    <tr>
                                        <th className="p-4">ID</th>
                                        <th className="p-4">Customer</th>
                                        <th className="p-4">Date/Time</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {bookings.map((booking: any) => (
                                        <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-mono text-xs">{booking.id}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-white">{booking.customerName}</div>
                                                <div className="text-xs text-textMuted">{booking.customerEmail}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-white">{booking.date}</div>
                                                <div className="text-xs text-textMuted">{booking.time}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${booking.status === 'Confirmed' ? 'bg-green-500/10 text-green-500' :
                                                        booking.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                                            'bg-red-500/10 text-red-500'
                                                    }`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="p-4 font-bold text-white">₹{booking.price}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {bookings.length === 0 && <div className="p-8 text-center text-textMuted">No bookings found.</div>}
                        </div>
                    </div>
                )}

                {showOfflineBookingModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-surface border border-white/10 p-8 rounded-3xl w-full max-w-lg relative">
                            <button
                                onClick={() => setShowOfflineBookingModal(false)}
                                className="absolute top-4 right-4 text-textMuted hover:text-white"
                            >
                                X
                            </button>
                            <h2 className="text-2xl font-bold text-white mb-2">Offline Booking</h2>
                            <p className="text-sm text-textMuted mb-6">Create a walk-in booking for this turf.</p>

                            <form onSubmit={handleCreateOfflineBooking} className="space-y-4">
                                <input
                                    required
                                    className="w-full bg-background border border-white/10 p-3 rounded-xl text-white outline-none focus:border-primary"
                                    placeholder="Customer Name"
                                    value={offlineBookingForm.customerName}
                                    onChange={e => setOfflineBookingForm(prev => ({ ...prev, customerName: e.target.value }))}
                                />

                                <input
                                    className="w-full bg-background border border-white/10 p-3 rounded-xl text-white outline-none focus:border-primary"
                                    placeholder="Email / Phone (optional)"
                                    value={offlineBookingForm.customerContact}
                                    onChange={e => setOfflineBookingForm(prev => ({ ...prev, customerContact: e.target.value }))}
                                />

                                <input
                                    type="date"
                                    className="w-full bg-background border border-white/10 p-3 rounded-xl text-white outline-none focus:border-primary"
                                    value={offlineBookingForm.bookingDate}
                                    onChange={e => {
                                        const nextDate = e.target.value;
                                        setOfflineBookingForm(prev => ({ ...prev, bookingDate: nextDate, slotId: '' }));
                                        loadOfflineSlots(nextDate);
                                    }}
                                />

                                <select
                                    required
                                    className="w-full bg-background border border-white/10 p-3 rounded-xl text-white outline-none focus:border-primary"
                                    value={offlineBookingForm.slotId}
                                    onChange={e => setOfflineBookingForm(prev => ({ ...prev, slotId: e.target.value }))}
                                    disabled={offlineSlotsLoading}
                                >
                                    <option value="">
                                        {offlineSlotsLoading ? 'Loading available slots...' : 'Select Available Slot'}
                                    </option>
                                    {offlineSlots
                                        .filter((slot: any) => !slot.isBooked)
                                        .map((slot: any) => (
                                            <option key={slot.id} value={slot.id}>
                                                {slot.time} - Rs {slot.price}
                                            </option>
                                        ))}
                                </select>

                                {!offlineSlotsLoading && offlineSlots.filter((slot: any) => !slot.isBooked).length === 0 && (
                                    <p className="text-xs text-red-400">No available slots for selected date.</p>
                                )}

                                <button
                                    type="submit"
                                    disabled={creatingOfflineBooking || offlineSlotsLoading}
                                    className="w-full bg-primary text-white font-bold py-3 rounded-xl mt-4 disabled:opacity-50"
                                >
                                    {creatingOfflineBooking ? 'Creating Booking...' : 'Confirm Offline Booking'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default StaffDashboard;


