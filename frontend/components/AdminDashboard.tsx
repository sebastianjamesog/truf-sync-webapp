import React, { useState, useEffect } from 'react';
import {
   Users, MapPin, Plus, TrendingUp, Calendar, LogOut,
   LayoutDashboard, Settings, ShoppingBag, Trash2
} from 'lucide-react';
import {
   getAdminStats, getRecentBookings, fetchTurfs, fetchUsers,
   createTurf, createStaff, deleteTurf, deleteStaff
} from '../services/api';
import { Turf } from '../types';

interface AdminDashboardProps {
   onLogout: () => void;
}

const SLOT_TIMES = [
   '10:00 AM',
   '11:00 AM',
   '12:00 PM',
   '1:00 PM',
   '2:00 PM',
   '3:00 PM',
   '4:00 PM',
   '5:00 PM',
   '6:00 PM',
   '7:00 PM',
   '8:00 PM',
   '9:00 PM',
   '10:00 PM',
   '11:00 PM',
   '12:00 AM'
];

const DEFAULT_SLOT_PRICES: Record<string, number> = {
   '10:00 AM': 600,
   '11:00 AM': 600,
   '12:00 PM': 600,
   '1:00 PM': 600,
   '2:00 PM': 600,
   '3:00 PM': 600,
   '4:00 PM': 600,
   '5:00 PM': 600,
   '6:00 PM': 800,
   '7:00 PM': 1000,
   '8:00 PM': 1200,
   '9:00 PM': 1200,
   '10:00 PM': 1000,
   '11:00 PM': 800,
   '12:00 AM': 600
};

const buildDefaultSlotPrices = (): Record<string, number> => ({ ...DEFAULT_SLOT_PRICES });

interface NewTurfForm {
   name: string;
   location: string;
   price_start: number;
   image: string;
   sports: string[];
   slot_prices: Record<string, number>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
   const [activeTab, setActiveTab] = useState<'overview' | 'turfs' | 'staff'>('overview');
   const [stats, setStats] = useState({ total_revenue: 0, total_bookings: 0, active_users: 0 });
   const [turfs, setTurfs] = useState<Turf[]>([]);
   const [staff, setStaff] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);

   // Forms State
   const [showTurfForm, setShowTurfForm] = useState(false);
   const [showStaffForm, setShowStaffForm] = useState(false);

   // New Turf Data
   const [newTurf, setNewTurf] = useState<NewTurfForm>({
      name: '',
      location: '',
      price_start: 0,
      image: '',
      sports: [],
      slot_prices: buildDefaultSlotPrices()
   });
   const [sportsInput, setSportsInput] = useState('');

   // New Staff Data
   const [newStaff, setNewStaff] = useState({
      name: '', email: '', password: '', managed_turf_id: ''
   });

   useEffect(() => {
      loadStats();
      loadTurfs();
      loadStaff();
   }, []);

   const loadStats = async () => {
      try {
         const data = await getAdminStats();
         setStats(data);
      } catch (e) { console.error(e); }
   };

   const loadTurfs = async () => {
      try {
         const data = await fetchTurfs();
         setTurfs(data);
      } catch (e) { console.error(e); }
   };

   const loadStaff = async () => {
      try {
         const data = await fetchUsers('staff');
         setStaff(data);
      } catch (e) { console.error(e); }
   };

   const handleCreateTurf = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
         const slotPrices = Object.fromEntries(
            SLOT_TIMES.map(time => [time, Math.max(0, Number(newTurf.slot_prices[time] ?? 0))])
         );
         const allPrices = Object.values(slotPrices);
         const minSlotPrice = allPrices.length ? Math.min(...allPrices) : 0;
         const computedStartPrice = newTurf.price_start > 0 ? newTurf.price_start : minSlotPrice;

         await createTurf({
            ...newTurf,
            price_start: computedStartPrice,
            slot_prices: slotPrices,
            sports: sportsInput.split(',').map(s => s.trim()).filter(Boolean)
         });
         alert('Turf Created!');
         setShowTurfForm(false);
         setNewTurf({
            name: '',
            location: '',
            price_start: 0,
            image: '',
            sports: [],
            slot_prices: buildDefaultSlotPrices()
         });
         setSportsInput('');
         loadTurfs();
      } catch (err: any) {
         alert(err.response?.data?.detail || 'Failed to create turf');
      } finally {
         setLoading(false);
      }
   };

   const handleCreateStaff = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
         await createStaff(newStaff);
         alert('Staff Created!');
         setShowStaffForm(false);
         loadStaff();
         loadStats();
      } catch (err: any) {
         alert(err.response?.data?.detail || 'Failed to create staff');
      } finally {
         setLoading(false);
      }
   };

   const handleDeleteTurf = async (turfId: string) => {
      if (!window.confirm("Are you sure you want to delete this turf? This will also delete all associated bookings.")) {
         return;
      }
      try {
         await deleteTurf(turfId);
         loadTurfs();
      } catch (err: any) {
         alert(err.response?.data?.detail || 'Failed to delete turf');
      }
   };

   const handleDeleteStaff = async (staffId: number) => {
      if (!window.confirm("Are you sure you want to delete this staff account?")) {
         return;
      }
      try {
         await deleteStaff(staffId);
         loadStaff();
         loadStats();
      } catch (err: any) {
         alert(err.response?.data?.detail || 'Failed to delete staff');
      }
   };

   return (
      <div className="min-h-screen bg-background text-text flex">
         {/* Sidebar */}
         <div className="w-64 bg-surface border-r border-white/5 p-6 flex flex-col">
            <div className="mb-10">
               <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                  TurfPro Admin
               </h1>
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
                  onClick={() => setActiveTab('turfs')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'turfs' ? 'bg-primary/20 text-primary' : 'text-textMuted hover:bg-white/5 hover:text-white'}`}
               >
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">Turfs</span>
               </button>
               <button
                  onClick={() => setActiveTab('staff')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'staff' ? 'bg-primary/20 text-primary' : 'text-textMuted hover:bg-white/5 hover:text-white'}`}
               >
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Staff</span>
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
            {activeTab === 'overview' && (
               <div className="space-y-8 animate-in fade-in duration-500">
                  <h2 className="text-3xl font-bold text-white">Dashboard Overview</h2>

                  <div className="grid grid-cols-3 gap-6">
                     <div className="bg-surface border border-white/10 p-6 rounded-2xl">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="p-3 bg-green-500/20 rounded-xl text-green-500">
                              <TrendingUp className="w-6 h-6" />
                           </div>
                           <span className="text-textMuted">Total Revenue</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white">₹{stats.total_revenue.toLocaleString()}</h3>
                     </div>
                     <div className="bg-surface border border-white/10 p-6 rounded-2xl">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="p-3 bg-blue-500/20 rounded-xl text-blue-500">
                              <Calendar className="w-6 h-6" />
                           </div>
                           <span className="text-textMuted">Total Bookings</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white">{stats.total_bookings}</h3>
                     </div>
                     <div className="bg-surface border border-white/10 p-6 rounded-2xl">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="p-3 bg-purple-500/20 rounded-xl text-purple-500">
                              <Users className="w-6 h-6" />
                           </div>
                           <span className="text-textMuted">Active Users</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white">{stats.active_users}</h3>
                     </div>
                  </div>
               </div>
            )}

            {/* VIEW: TURFS */}
            {activeTab === 'turfs' && (
               <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                     <h2 className="text-3xl font-bold text-white">Manage Turfs</h2>
                     <button
                        onClick={() => setShowTurfForm(true)}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-colors"
                     >
                        <Plus className="w-5 h-5" /> Add Turf
                     </button>
                  </div>

                  {/* List Turfs */}
                  <div className="grid grid-cols-2 gap-6">
                     {turfs.map(turf => (
                        <div key={turf.id} className="bg-surface border border-white/10 rounded-2xl p-4 flex gap-4 hover:border-primary/50 transition-colors">
                           <img src={turf.image} alt={turf.name} className="w-24 h-24 rounded-xl object-cover" />
                           <div>
                              <h3 className="text-xl font-bold text-white">{turf.name}</h3>
                              <p className="text-sm text-textMuted">{turf.location}</p>
                              <p className="text-sm text-primary font-bold mt-2">₹{turf.priceStart}/hr</p>
                           </div>
                           <button
                              onClick={() => handleDeleteTurf(turf.id)}
                              className="ml-auto text-red-500 hover:bg-red-500/10 p-2 rounded-xl transition-colors self-start"
                              title="Delete Turf"
                           >
                              <Trash2 className="w-5 h-5" />
                           </button>
                        </div>
                     ))}
                  </div>

                  {/* Add Turf Modal (Simple overlay for now) */}
                  {showTurfForm && (
                     <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-surface border border-white/10 p-8 rounded-3xl w-full max-w-lg relative">
                           <button onClick={() => setShowTurfForm(false)} className="absolute top-4 right-4 text-textMuted hover:text-white">✕</button>
                           <h2 className="text-2xl font-bold text-white mb-6">Add New Turf</h2>
                           <form onSubmit={handleCreateTurf} className="space-y-4">
                              <input className="w-full bg-background border border-white/10 p-3 rounded-xl text-white outline-none focus:border-primary" placeholder="Turf Name" value={newTurf.name} onChange={e => setNewTurf({ ...newTurf, name: e.target.value })} />
                              <input className="w-full bg-background border border-white/10 p-3 rounded-xl text-white outline-none focus:border-primary" placeholder="Location" value={newTurf.location} onChange={e => setNewTurf({ ...newTurf, location: e.target.value })} />
                              <input className="w-full bg-background border border-white/10 p-3 rounded-xl text-white outline-none focus:border-primary" placeholder="Image URL" value={newTurf.image} onChange={e => setNewTurf({ ...newTurf, image: e.target.value })} />
                              <input type="number" className="w-full bg-background border border-white/10 p-3 rounded-xl text-white outline-none focus:border-primary" placeholder="Starting Price (optional)" value={newTurf.price_start || ''} onChange={e => setNewTurf({ ...newTurf, price_start: Number(e.target.value) || 0 })} />
                              <input className="w-full bg-background border border-white/10 p-3 rounded-xl text-white outline-none focus:border-primary" placeholder="Sports (comma separated)" value={sportsInput} onChange={e => setSportsInput(e.target.value)} />
                              <div className="space-y-2">
                                 <p className="text-sm text-textMuted">Set Fixed Price Per Time Slot</p>
                                 <div className="grid grid-cols-2 gap-3">
                                    {SLOT_TIMES.map(time => (
                                       <div key={time} className="space-y-1">
                                          <label className="text-xs text-textMuted">{time}</label>
                                          <input
                                             type="number"
                                             min={0}
                                             className="w-full bg-background border border-white/10 p-2 rounded-xl text-white outline-none focus:border-primary"
                                             value={newTurf.slot_prices[time] ?? 0}
                                             onChange={e =>
                                                setNewTurf(prev => ({
                                                   ...prev,
                                                   slot_prices: {
                                                      ...prev.slot_prices,
                                                      [time]: Number(e.target.value) || 0
                                                   }
                                                }))
                                             }
                                          />
                                       </div>
                                    ))}
                                 </div>
                              </div>

                              <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-3 rounded-xl mt-4">
                                 {loading ? 'Creating...' : 'Create Turf'}
                              </button>
                           </form>
                        </div>
                     </div>
                  )}
               </div>
            )}

            {/* VIEW: STAFF */}
            {activeTab === 'staff' && (
               <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                     <h2 className="text-3xl font-bold text-white">Manage Staff</h2>
                     <button
                        onClick={() => setShowStaffForm(true)}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-colors"
                     >
                        <Plus className="w-5 h-5" /> Add Staff
                     </button>
                  </div>

                  {/* List Staff */}
                  <div className="space-y-4">
                     {staff.map(s => (
                        <div key={s.id} className="bg-surface border border-white/10 rounded-xl p-4 flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                 {s.name[0]}
                              </div>
                              <div>
                                 <h3 className="font-bold text-white">{s.name}</h3>
                                 <p className="text-sm text-textMuted">{s.email}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <span className="text-xs text-textMuted uppercase tracking-wider">Managed Turf ID</span>
                              <p className="font-mono text-sm text-white">{s.managedTurfId || 'Unassigned'}</p>
                           </div>
                           <button
                              onClick={() => handleDeleteStaff(s.id)}
                              className="ml-4 text-red-500 hover:bg-red-500/10 p-2 rounded-xl transition-colors"
                              title="Delete Staff"
                           >
                              <Trash2 className="w-5 h-5" />
                           </button>
                        </div>
                     ))}
                  </div>

                  {/* Add Staff Modal */}
                  {showStaffForm && (
                     <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-surface border border-white/10 p-8 rounded-3xl w-full max-w-lg relative">
                           <button onClick={() => setShowStaffForm(false)} className="absolute top-4 right-4 text-textMuted hover:text-white">✕</button>
                           <h2 className="text-2xl font-bold text-white mb-6">Create Staff Account</h2>
                           <form onSubmit={handleCreateStaff} className="space-y-4">
                              <input className="w-full bg-background border border-white/10 p-3 rounded-xl text-white outline-none focus:border-primary" placeholder="Staff Name" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} />
                              <input className="w-full bg-background border border-white/10 p-3 rounded-xl text-white outline-none focus:border-primary" placeholder="Email" value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} />
                              <input className="w-full bg-background border border-white/10 p-3 rounded-xl text-white outline-none focus:border-primary" placeholder="Password" type="password" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} />

                              <div className="space-y-1">
                                 <label className="text-xs text-textMuted ml-1">Assign Turf</label>
                                 <select
                                    className="w-full bg-background border border-white/10 p-3 rounded-xl text-white outline-none focus:border-primary"
                                    value={newStaff.managed_turf_id}
                                    onChange={e => setNewStaff({ ...newStaff, managed_turf_id: e.target.value })}
                                 >
                                    <option value="">Select Turf</option>
                                    {turfs.map(t => (
                                       <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                 </select>
                              </div>

                              <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-3 rounded-xl mt-4">
                                 {loading ? 'Creating...' : 'Create Staff'}
                              </button>
                           </form>
                        </div>
                     </div>
                  )}
               </div>
            )}

         </div>
      </div>
   );
};

export default AdminDashboard;
