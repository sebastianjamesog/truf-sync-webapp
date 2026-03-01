import React, { useState } from 'react';
import { registerUser, verifyEmail, loginUser } from '../services/api';
import {
    ArrowLeft, Trophy, User, Mail, Lock, Eye, EyeOff, ChevronRight, CheckCircle
} from 'lucide-react';

interface LoginScreenProps {
    onLogin: (user: { email: string; name: string; role: string; managedTurfId?: string }) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [step, setStep] = useState<'DETAILS' | 'OTP'>('DETAILS');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [serverOtp, setServerOtp] = useState(''); // For demo purposes

    const handleRegister = async () => {
        if (!email || !password || !name) {
            setError('Please fill all fields');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await registerUser(email, password, name);
            setServerOtp(response.otp); // In production, this won't be sent
            setStep('OTP');
            console.log('OTP sent to email:', response.otp); // For demo
        } catch (err: any) {
            console.error("Registration error:", err);
            setError(err.response?.data?.detail || err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter email and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await loginUser(email, password);
            // Pass full user object including role
            onLogin({
                email: response.user.email || email,
                name: response.user.name,
                role: response.user.role || 'player', // Default to player if undefined
                managedTurfId: response.user.managedTurfId
            });
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.response?.data?.detail || err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        const otpValue = otp.join('');
        if (otpValue.length !== 6) {
            setError('Please enter complete OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await verifyEmail(email, otpValue);
            onLogin({
                email: response.user?.email || email,
                name: response.user?.name || name || 'User',
                role: response.user?.role || 'player',
                managedTurfId: response.user?.managedTurfId
            });
        } catch (err: any) {
            console.error("Verification error:", err);
            setError(err.response?.data?.detail || err.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    return (
        <div className="min-h-screen bg-background relative flex flex-col p-6 overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-10%] right-[-20%] w-[300px] h-[300px] bg-primary/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-20%] w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[100px]" />

            {/* Removed back button as this is the entry point now */}

            <div className="flex-1 flex flex-col justify-center relative z-10">
                <div className="mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-primary to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                        <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        {step === 'OTP' ? 'Verify Email' : (isRegistering ? 'Create Account' : 'Welcome Back')}
                    </h1>
                    <p className="text-textMuted text-lg">
                        {step === 'OTP'
                            ? `Enter the code sent to ${email}`
                            : (isRegistering ? 'Join the community of players.' : 'Login to book your turf.')}
                    </p>
                    {serverOtp && step === 'OTP' && (
                        <p className="text-xs text-primary mt-2">💡 Demo OTP: {serverOtp}</p>
                    )}
                    {error && (
                        <p className="text-xs text-red-500 mt-2">❌ {error}</p>
                    )}
                </div>

                <div className="bg-surface/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-6 shadow-2xl">

                    {step === 'DETAILS' ? (
                        <>
                            {isRegistering && (
                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold text-textMuted tracking-wider">Full Name</label>
                                    <div className="flex items-center gap-3 bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus-within:border-primary/50 transition-colors">
                                        <User className="w-5 h-5 text-textMuted" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="John Doe"
                                            className="bg-transparent border-none outline-none text-white w-full placeholder:text-textMuted/50 font-medium"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-textMuted tracking-wider">Email Address</label>
                                <div className="flex items-center gap-3 bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus-within:border-primary/50 transition-colors">
                                    <Mail className="w-5 h-5 text-textMuted" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="john@example.com"
                                        className="bg-transparent border-none outline-none text-white w-full placeholder:text-textMuted/50 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-textMuted tracking-wider">Password</label>
                                <div className="flex items-center gap-3 bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus-within:border-primary/50 transition-colors">
                                    <Lock className="w-5 h-5 text-textMuted" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="bg-transparent border-none outline-none text-white w-full placeholder:text-textMuted/50 font-medium"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-textMuted hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {isRegistering && (
                                    <p className="text-xs text-textMuted">Minimum 8 characters</p>
                                )}
                            </div>

                            <button
                                onClick={isRegistering ? handleRegister : handleLogin}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-primary to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 active:scale-95 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>{loading ? (isRegistering ? 'Creating Account...' : 'Logging in...') : (isRegistering ? 'Create Account' : 'Login')}</span>
                                {!loading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                            </button>

                            <div className="flex items-center justify-center gap-2 text-sm text-textMuted">
                                <span>{isRegistering ? 'Already have an account?' : "Don't have an account?"}</span>
                                <button
                                    onClick={() => {
                                        setIsRegistering(!isRegistering);
                                        setError('');
                                    }}
                                    className="text-primary font-bold hover:underline"
                                >
                                    {isRegistering ? 'Login' : 'Sign Up'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-center gap-3 py-4">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        className="w-12 h-14 bg-background/50 border border-white/10 rounded-xl text-center text-2xl font-bold text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                ))}
                            </div>

                            <button
                                onClick={handleVerify}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-primary to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>{loading ? 'Verifying...' : 'Verify & Continue'}</span>
                                {!loading && <CheckCircle className="w-5 h-5" />}
                            </button>

                            <p className="text-center text-xs text-textMuted mt-4">
                                Didn't receive code? <button className="text-primary font-bold hover:underline" onClick={handleRegister}>Resend</button>
                            </p>
                        </>
                    )}

                    <p className="text-center text-xs text-textMuted/50 pt-4 border-t border-white/5">
                        By continuing, you agree to our Terms & Conditions.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
