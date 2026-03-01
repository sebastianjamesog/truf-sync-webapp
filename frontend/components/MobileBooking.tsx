import React, { useState, useEffect } from 'react';
import { PLAYER_HISTORY } from '../constants';
import { Turf, TimeSlot } from '../types';
import { fetchTurfs, fetchSlots, bookSlot, fetchUserBookings, cancelBooking } from '../services/api';
import wsService from '../services/websocket';
import {
   ArrowLeft, Calendar, Info, MapPin, CheckCircle,
   Smartphone, Lock, ChevronRight, Home, History, User,
   CreditCard, Search, Bell, Trophy, Star, Filter, Heart,
   Mail, Edit3, Eye, EyeOff
} from 'lucide-react';

interface MobileBookingProps {
   user: { email: string; name: string };
   onLogout: () => void;
   onUpdateUser: (user: any) => void;
}

// --- Sub-Components (TurfList, BookingView, TabHistory, TabProfile) ---

const TurfList: React.FC<{ onSelectTurf: (turf: Turf) => void }> = ({ onSelectTurf }) => {
   const [searchTerm, setSearchTerm] = useState('');
   const [turfs, setTurfs] = useState<Turf[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      loadTurfs();
   }, []);

   const loadTurfs = async () => {
      try {
         const data = await fetchTurfs();
         setTurfs(data);
      } catch (error) {
         console.error('Failed to load turfs:', error);
      } finally {
         setLoading(false);
      }
   };

   const filteredTurfs = turfs.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

   return (
      <div className="flex flex-col h-full">
         {/* Home Header */}
         <div className="px-6 py-6 pb-2 bg-gradient-to-b from-surface/90 to-surface/0 sticky top-0 z-20 backdrop-blur-lg border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
               <div className="flex flex-col">
                  <div className="flex items-center gap-1 text-primary">
                     <MapPin className="w-4 h-4 fill-primary" />
                     <span className="text-xs font-bold uppercase tracking-wider">Current Location</span>
                  </div>
                  <div className="flex items-center gap-1 text-white font-bold text-lg">
                     Downtown, Sector 4 <ChevronRight className="w-4 h-4 text-textMuted" />
                  </div>
               </div>
               <div className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center overflow-hidden">
                  <User className="w-6 h-6 text-textMuted" />
               </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
               <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" />
               <input
                  type="text"
                  placeholder="Search 'Football' or 'Arena'"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-textMuted focus:outline-none focus:border-primary/50 transition-colors shadow-lg"
               />
               <div className="absolute right-3 top-1/2 -translate-y-1/2 border-l border-white/10 pl-3">
                  <Filter className="w-4 h-4 text-textMuted" />
               </div>
            </div>

            {/* Categories */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
               {['All', 'Football', 'Cricket'].map((cat, i) => (
                  <button
                     key={cat}
                     className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${i === 0 ? 'bg-white text-black' : 'bg-surface border border-white/10 text-textMuted hover:bg-white/10'}`}
                  >
                     {cat}
                  </button>
               ))}
            </div>
         </div>

         {/* Turf Listings */}
         <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-6 pt-4">
            {loading ? (
               <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                     <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                     <p className="text-textMuted">Loading turfs...</p>
                  </div>
               </div>
            ) : filteredTurfs.length === 0 ? (
               <div className="text-center py-20">
                  <p className="text-textMuted">No turfs found</p>
               </div>
            ) : (
               filteredTurfs.map((turf) => (
                  <button
                     key={turf.id}
                     onClick={() => onSelectTurf(turf)}
                     className="w-full text-left group relative bg-surface border border-white/10 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:border-primary/30 transition-all duration-300"
                  >
                     {/* Image Section */}
                     <div className="h-48 relative overflow-hidden">
                        <img src={turf.image} alt={turf.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-90" />

                        {/* Rating Badge */}
                        <div className="absolute top-4 right-4 bg-surface/80 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 border border-white/10">
                           <span className="text-xs font-bold text-white">{turf.rating}</span>
                           <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        </div>

                        {/* Distance Badge */}
                        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                           <span className="text-[10px] font-medium text-white">{turf.distance} away</span>
                        </div>

                        {/* Favorite Heart */}
                        <div className="absolute top-4 left-4 p-2 rounded-full bg-black/20 backdrop-blur-md text-white/70 hover:bg-red-500/20 hover:text-red-500 transition-colors">
                           <Heart className="w-4 h-4" />
                        </div>
                     </div>

                     {/* Info Section */}
                     <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                           <div>
                              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">{turf.name}</h3>
                              <p className="text-sm text-textMuted flex items-center gap-1">
                                 <MapPin className="w-3 h-3" /> {turf.location}
                              </p>
                           </div>
                        </div>

                        <div className="w-full h-px bg-white/5 my-3" />

                        <div className="flex justify-between items-center">
                           <div className="flex gap-2">
                              {turf.sports.map(s => (
                                 <span key={s} className="text-[10px] bg-white/5 px-2 py-1 rounded-md text-textMuted border border-white/5">{s}</span>
                              ))}
                           </div>
                           <div className="text-right">
                              <span className="text-[10px] text-textMuted block">Starts at</span>
                              <span className="text-sm font-bold text-primary">₹{turf.priceStart}<span className="text-[10px] font-normal text-textMuted">/hr</span></span>
                           </div>
                        </div>
                     </div>
                  </button>
               ))
            )}

            {!loading && filteredTurfs.length > 0 && (
               <div className="text-center py-6 text-textMuted text-xs">
                  Showing {filteredTurfs.length} venues around you
               </div>
            )}
         </div>
      </div>
   );
};

const BookingView: React.FC<{ turf: Turf; onBack: () => void; onSuccess: () => void; customerEmail: string; customerName: string }> = ({ turf, onBack, onSuccess, customerEmail, customerName }) => {
   const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
   const [selectedDate, setSelectedDate] = useState(0);
   const [showConfirmation, setShowConfirmation] = useState(false);
   const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
   const [loading, setLoading] = useState(false);
   const [bookingId, setBookingId] = useState('');

   useEffect(() => {
      loadSlots();
   }, [selectedDate]);

   useEffect(() => {
      // Listen for real-time slot updates
      const unsubscribe = wsService.onMessage((data) => {
         if (data.type === 'SLOT_BOOKED') {
            // Reload slots when someone books
            loadSlots();
         }
      });

      return unsubscribe;
   }, [selectedDate]);

   const loadSlots = async () => {
      const date = new Date();
      date.setDate(date.getDate() + selectedDate);
      const dateStr = date.toISOString().split('T')[0];

      try {
         const data = await fetchSlots(turf.id, dateStr);
         setTimeSlots(data);
      } catch (error) {
         console.error('Failed to load slots:', error);
      }
   };

   const toggleSlot = (id: string) => {
      setSelectedSlots(prev =>
         prev.includes(id) ? prev.filter(slotId => slotId !== id) : [...prev, id]
      );
   };

   const totalPrice = selectedSlots.reduce((sum, id) => {
      const slot = timeSlots.find(s => s.id === id);
      return sum + (slot ? slot.price : 0);
   }, 0);

   const handlePayment = async () => {
      setLoading(true);

      const date = new Date();
      date.setDate(date.getDate() + selectedDate);
      const dateStr = date.toISOString();

      try {
         // Book all selected slots
         for (const slotId of selectedSlots) {
            const slot = timeSlots.find(s => s.id === slotId);
            if (slot) {
               await bookSlot({
                  turf_id: turf.id,
                  turf_name: turf.name,
                  slot_time: slot.time,
                  booking_date: dateStr,
                  customer_name: customerName,
                  customer_email: customerEmail,  // Changed from customer_mobile
                  court_type: '5v5',
                  price: slot.price
               });
            }
         }

         setBookingId(`#${turf.id.toUpperCase()}-${Date.now().toString().slice(-4)}`);
         setShowConfirmation(true);

         setTimeout(() => {
            setShowConfirmation(false);
            setSelectedSlots([]);
            onBack();
         }, 2500);
      } catch (error: any) {
         alert(error.response?.data?.detail || 'Booking failed. Slot may have been taken.');
         loadSlots(); // Reload to get updated availability
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="flex flex-col h-full relative bg-background z-30">
         {/* Header */}
         <div className="px-6 py-4 bg-surface/50 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
            <div className="flex items-center gap-4 mb-4">
               <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
                  <ArrowLeft className="w-6 h-6 text-white" />
               </button>
               <div className="flex-1">
                  <h3 className="text-lg font-bold text-white leading-tight">{turf.name}</h3>
                  <p className="text-xs text-textMuted">{turf.location}</p>
               </div>
               <div className="bg-surface/80 px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                  <span className="text-xs font-bold text-white">{turf.rating}</span>
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
               </div>
            </div>

            {/* Sport Pill - Better Spacing */}
            <div className="flex items-center gap-2">
               <div className="flex-1 overflow-x-auto no-scrollbar flex gap-2 pb-1">
                  {turf.sports.map((sport, i) => (
                     <button key={sport} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${i === 0 ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-textMuted border-white/10 hover:border-white/20'}`}>
                        {sport}
                     </button>
                  ))}
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto pb-32">
            {/* Date Selector - No Scrollbar & Better Capsules */}
            <div className="pl-6 py-6">
               <h3 className="text-sm font-bold text-white mb-3">Select Date</h3>
               <div className="flex gap-3 overflow-x-auto pr-6 no-scrollbar pb-2">
                  {[0, 1, 2, 3, 4, 5].map((offset) => {
                     const date = new Date();
                     date.setDate(date.getDate() + offset);
                     const isSelected = selectedDate === offset;
                     return (
                        <button
                           key={offset}
                           onClick={() => setSelectedDate(offset)}
                           className={`
                     flex-shrink-0 w-[4.5rem] h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-300 border
                     ${isSelected
                                 ? 'bg-gradient-to-br from-primary to-emerald-600 text-white border-transparent shadow-[0_4px_12px_rgba(16,185,129,0.3)] scale-105'
                                 : 'bg-surface border-white/10 text-textMuted hover:bg-white/5 hover:border-white/20'
                              }
                   `}
                        >
                           <span className="text-[10px] font-bold uppercase tracking-wide">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                           <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                        </button>
                     );
                  })}
               </div>
            </div>

            {/* Time Slots */}
            <div className="px-6">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Available Slots</h3>
                  <div className="flex gap-3 text-[10px] text-textMuted">
                     <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-surface border border-white/10"></div> Avail</div>
                     <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-booked opacity-50"></div> Booked</div>
                     <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary"></div> Selected</div>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-3">
                  {timeSlots.map((slot) => {
                     const isSelected = selectedSlots.includes(slot.id);
                     return (
                        <button
                           key={slot.id}
                           disabled={slot.isBooked}
                           onClick={() => toggleSlot(slot.id)}
                           className={`
                     relative py-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 border
                     ${slot.isBooked
                                 ? 'bg-booked/5 border-booked/20 text-booked/50 cursor-not-allowed'
                                 : isSelected
                                    ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                    : 'bg-surface border-white/5 text-white hover:bg-white/5 hover:border-white/10'
                              }
                   `}
                        >
                           <span className="text-sm font-bold">{slot.time}</span>
                           <span className={`text-[10px] ${isSelected ? 'text-primary' : 'text-textMuted'}`}>₹{slot.price}</span>
                        </button>
                     );
                  })}
               </div>
            </div>
         </div>

         {/* Floating Checkout Bar - Better Gradient & Spacing */}
         <div className={`absolute bottom-0 left-0 right-0 z-30 transition-transform duration-300 ${selectedSlots.length > 0 ? 'translate-y-0' : 'translate-y-[120%]'}`}>
            {/* Gradient Fade to make content readable behind it */}
            <div className="h-24 w-full bg-gradient-to-t from-background via-background/80 to-transparent absolute bottom-0 left-0 pointer-events-none" />

            <div className="p-4 relative">
               <div className="bg-surface/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-[0_-5px_30px_rgba(0,0,0,0.5)] flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                     <div className="flex flex-col">
                        <span className="text-xs text-textMuted">Total Amount</span>
                        <span className="text-2xl font-bold text-white tracking-tight">₹{totalPrice}</span>
                     </div>
                     <div className="text-right">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                           {selectedSlots.length} Slots Selected
                        </span>
                     </div>
                  </div>
                  <button
                     onClick={handlePayment}
                     disabled={loading}
                     className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {loading ? 'Processing...' : 'Pay via UPI'}
                     <CreditCard className="w-4 h-4" />
                  </button>
               </div>
            </div>
         </div>

         {/* Success Overlay */}
         {showConfirmation && (
            <div className="absolute inset-0 bg-background/95 z-50 flex flex-col items-center justify-center animate-in fade-in duration-300 p-6 text-center">
               <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
                  <CheckCircle className="w-12 h-12 text-primary" />
               </div>
               <h2 className="text-3xl font-bold text-white mb-2">Booked!</h2>
               <p className="text-textMuted">Your slot at {turf.name} is confirmed.</p>
               <div className="mt-8 p-4 bg-surface rounded-2xl border border-white/5 w-full max-w-xs">
                  <p className="text-xs text-textMuted mb-1">Booking ID</p>
                  <p className="font-mono text-lg tracking-widest">{bookingId}</p>
               </div>
            </div>
         )}
      </div>
   );
};

const TabHistory: React.FC<{ user: { email: string; name: string } }> = ({ user }) => {
   const [bookings, setBookings] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

   useEffect(() => {
      if (user && user.email) {
         loadBookings();
      }
   }, [user]);

   const loadBookings = async () => {
      try {
         console.log("Fetching bookings for:", user.email);
         const data = await fetchUserBookings(user.email);
         setBookings(data);
      } catch (e: any) {
         console.error("Error fetching bookings:", e);
      } finally {
         setLoading(false);
      }
   };

   const handleCancel = async (bookingId: string) => {
      if (!window.confirm("Are you sure you want to cancel this booking?")) return;

      try {
         await cancelBooking(bookingId);
         setSelectedTicket(null);
         loadBookings();
         alert("Booking cancelled.");
      } catch (e: any) {
         alert(e.response?.data?.detail || "Failed to cancel");
      }
   };

   return (
      <div className="p-6 h-full flex flex-col relative">
         <h1 className="text-2xl font-bold text-white mb-6">My Games</h1>

         {loading ? (
            <div className="text-center text-textMuted mt-10">Loading history...</div>
         ) : bookings.length === 0 ? (
            <div className="text-center text-textMuted mt-10">No bookings found.</div>
         ) : (
            <div className="space-y-4 overflow-y-auto pb-24 -mx-2 px-2">
               {bookings.map((booking) => (
                  <div key={booking.id} className="bg-surface border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:border-white/10 transition-colors">
                     <div>
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-sm font-bold text-white">{booking.turfName}</span>
                           <span className={`text-[10px] px-2 py-0.5 rounded-full border ${booking.status === 'Confirmed' ? 'border-primary/20 text-primary bg-primary/5' :
                              booking.status === 'Cancelled' ? 'border-red-500/20 text-red-500 bg-red-500/5' : 'border-yellow-500/20 text-yellow-500 bg-yellow-500/5'
                              }`}>
                              {booking.status}
                           </span>
                        </div>
                        <div className="flex items-center gap-2 text-textMuted text-xs">
                           <Calendar className="w-3 h-3" />
                           <span>{booking.date}</span>
                           <span className="w-1 h-1 rounded-full bg-white/20"></span>
                           <span>{booking.time}</span>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="font-bold text-white">₹{booking.price}</p>
                        {booking.status === 'Confirmed' && (
                           <button
                              onClick={() => setSelectedTicket(booking)}
                              className="text-[10px] text-primary mt-1 hover:underline"
                           >
                              View Ticket
                           </button>
                        )}
                     </div>
                  </div>
               ))}

               <div className="p-6 text-center mt-4">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                     <History className="w-6 h-6 text-textMuted" />
                  </div>
                  <p className="text-sm text-textMuted">That's all your history.</p>
               </div>
            </div>
         )}

         {/* Ticket Modal */}
         {selectedTicket && (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
               <div className="bg-surface border border-white/10 rounded-3xl p-6 w-full max-w-sm relative shadow-2xl">
                  <button
                     onClick={() => setSelectedTicket(null)}
                     className="absolute top-4 right-4 text-textMuted hover:text-white"
                  >
                     ✕
                  </button>

                  <div className="text-center mb-6">
                     <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-primary" />
                     </div>
                     <h2 className="text-2xl font-bold text-white">Booking Confirmed</h2>
                     <p className="text-textMuted text-sm">Show this at the venue</p>
                  </div>

                  <div className="space-y-4 bg-background/50 p-4 rounded-2xl border border-white/5">
                     <div className="flex justify-between">
                        <span className="text-textMuted text-sm">Booking ID</span>
                        <span className="text-white font-mono">{selectedTicket.id}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-textMuted text-sm">Turf</span>
                        <span className="text-white font-bold">{selectedTicket.turfName}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-textMuted text-sm">Date</span>
                        <span className="text-white">{selectedTicket.date}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-textMuted text-sm">Time</span>
                        <span className="text-white">{selectedTicket.time}</span>
                     </div>
                     <div className="border-t border-white/10 pt-2 flex justify-between">
                        <span className="text-textMuted text-sm">Amount Paid</span>
                        <span className="text-primary font-bold">₹{selectedTicket.price}</span>
                     </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                     <button
                        onClick={() => handleCancel(selectedTicket.id)}
                        className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 font-bold py-3 rounded-xl hover:bg-red-500/20 transition-colors"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={() => setSelectedTicket(null)}
                        className="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                     >
                        Close
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

const TabProfile: React.FC<{ onLogout: () => void; user: { name: string; email: string }; onUpdateUser: (user: any) => void }> = ({ onLogout, user, onUpdateUser }) => {
   const [isEditing, setIsEditing] = useState(false);
   const [name, setName] = useState(user.name);
   const [password, setPassword] = useState('');
   const [loading, setLoading] = useState(false);

   const handleSave = async () => {
      setLoading(true);
      try {
         // Import updateProfile here or use from props if passed
         // Using direct import since we can't change imports easily in this chunk
         const { updateProfile } = await import('../services/api');

         const updated = await updateProfile({
            email: user.email,
            name: name,
            password: password || undefined
         });

         onUpdateUser(updated.user);
         setIsEditing(false);
         setPassword('');
         alert("Profile updated!");
      } catch (e: any) {
         alert(e.response?.data?.detail || "Failed to update profile");
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="p-6">
         <div className="flex flex-col items-center mb-8 relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-blue-500 p-1 mb-4">
               <div className="w-full h-full rounded-full bg-surface border-4 border-background overflow-hidden relative">
                  <User className="w-12 h-12 text-textMuted absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
               </div>
            </div>
            <button
               onClick={() => setIsEditing(true)}
               className="absolute top-0 right-0 p-2 bg-surface border border-white/10 rounded-full hover:bg-white/10"
            >
               <Edit3 className="w-4 h-4 text-white" />
            </button>
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="text-textMuted text-sm">{user.email}</p>
         </div>

         <div className="space-y-2">
            {[
               { icon: CreditCard, label: 'Payment Methods' },
               { icon: Bell, label: 'Notifications' },
               { icon: Info, label: 'Help & Support' },
               { icon: Lock, label: 'Privacy Policy' },
            ].map((item, i) => (
               <button key={i} className="w-full bg-surface border border-white/5 p-4 rounded-xl flex items-center justify-between hover:bg-white/5 transition-colors group">
                  <div className="flex items-center gap-3">
                     <item.icon className="w-5 h-5 text-textMuted group-hover:text-white transition-colors" />
                     <span className="text-sm font-medium text-textMuted group-hover:text-white transition-colors">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-textMuted/50" />
               </button>
            ))}

            <button
               onClick={onLogout}
               className="w-full mt-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-center text-red-500 font-bold hover:bg-red-500/20 transition-colors"
            >
               Log Out
            </button>
         </div>

         {/* Edit Modal */}
         {isEditing && (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
               <div className="bg-surface border border-white/10 rounded-3xl p-6 w-full max-w-sm">
                  <h3 className="text-xl font-bold text-white mb-6">Edit Profile</h3>

                  <div className="space-y-4">
                     <div>
                        <label className="text-xs text-textMuted uppercase font-bold">Full Name</label>
                        <input
                           type="text"
                           value={name}
                           onChange={e => setName(e.target.value)}
                           className="w-full bg-background border border-white/10 rounded-xl p-3 text-white mt-1 focus:border-primary outline-none"
                        />
                     </div>
                     <div>
                        <label className="text-xs text-textMuted uppercase font-bold">New Password <span className="text-[10px] font-normal normal-case opacity-50">(Optional)</span></label>
                        <input
                           type="password"
                           value={password}
                           onChange={e => setPassword(e.target.value)}
                           placeholder="Leave empty to keep current"
                           className="w-full bg-background border border-white/10 rounded-xl p-3 text-white mt-1 focus:border-primary outline-none"
                        />
                     </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                     <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
                     >
                        {loading ? 'Saving...' : 'Save Changes'}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

// --- Main Component ---

const MobileBooking: React.FC<MobileBookingProps> = ({ user, onLogout, onUpdateUser }) => {
   const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile'>('home');
   const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);

   useEffect(() => {
      // Connect WebSocket when authenticated
      wsService.connect();

      return () => {
         wsService.disconnect();
      };
   }, []);

   // Hide Navbar when in Booking View
   const showNavBar = !selectedTurf;

   return (
      <div className="min-h-screen bg-background text-text flex flex-col relative overflow-hidden">

         {/* Tab Content */}
         <div className="flex-1 overflow-hidden relative">
            {activeTab === 'home' && (
               selectedTurf ? (
                  <BookingView
                     turf={selectedTurf}
                     onBack={() => setSelectedTurf(null)}
                     onSuccess={() => { setSelectedTurf(null); setActiveTab('history'); }}
                     customerEmail={user.email}
                     customerName={user.name}
                  />
               ) : (
                  <TurfList onSelectTurf={setSelectedTurf} />
               )
            )}
            {activeTab === 'history' && <TabHistory user={user} />}
            {activeTab === 'profile' && <TabProfile onLogout={onLogout} user={user} onUpdateUser={onUpdateUser} />}
         </div>

         {/* Bottom Navigation */}
         {showNavBar && (
            <div className="bg-surface/80 backdrop-blur-md border-t border-white/5 pb-6 pt-2 px-6 fixed bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom duration-300">
               <div className="flex items-center justify-between max-w-md mx-auto">
                  <button
                     onClick={() => setActiveTab('home')}
                     className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'home' ? 'text-primary' : 'text-textMuted hover:text-white'}`}
                  >
                     <Home className={`w-6 h-6 ${activeTab === 'home' ? 'fill-primary/20' : ''}`} />
                     <span className="text-[10px] font-medium">Play</span>
                  </button>
                  <button
                     onClick={() => setActiveTab('history')}
                     className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'history' ? 'text-primary' : 'text-textMuted hover:text-white'}`}
                  >
                     <History className={`w-6 h-6 ${activeTab === 'history' ? 'fill-primary/20' : ''}`} />
                     <span className="text-[10px] font-medium">My Games</span>
                  </button>
                  <button
                     onClick={() => setActiveTab('profile')}
                     className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'profile' ? 'text-primary' : 'text-textMuted hover:text-white'}`}
                  >
                     <User className={`w-6 h-6 ${activeTab === 'profile' ? 'fill-primary/20' : ''}`} />
                     <span className="text-[10px] font-medium">Profile</span>
                  </button>
               </div>
            </div>
         )}
      </div>
   );
};

export default MobileBooking;
