import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, KeyRound, UserPlus, User, Lock, IdCard, Shirt, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AuthPage() {
    const [tab, setTab] = useState('login'); // 'login' | 'register'
    const { login, register } = useAuth();
    const navigate = useNavigate();

    // Login State
    const [loginName, setLoginName] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [regUsername, setRegUsername] = useState('');
    const [regName, setRegName] = useState('');
    const [regPass, setRegPass] = useState('');
    const [regGame, setRegGame] = useState('DLS');

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(loginName, loginPass);
            if (user.role === 'admin') navigate('/admin');
            else navigate('/');
        } catch (err) {
            setError(err.message || 'Invalid login credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(regUsername, regName, '', regPass, regGame);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Failed to create account.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '440px', margin: '3rem auto 1rem' }}>
            <div className="gv-card">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Gamepad2 size={48} style={{ color: 'var(--gv-mint)', marginBottom: '0.5rem' }} />
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>
                        GAME<span style={{ color: 'var(--gv-mint)' }}>VERSE</span> HUB
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)' }}>
                        Multi-Game Community & Tournament Platform
                    </p>
                </div>

                {/* Tab Switcher */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <button 
                        className={`gv-btn ${tab === 'login' ? 'gv-btn-primary' : 'gv-btn-secondary'}`}
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                        onClick={() => setTab('login')}
                    >
                        <KeyRound size={16} /> Sign In
                    </button>
                    <button 
                        className={`gv-btn ${tab === 'register' ? 'gv-btn-primary' : 'gv-btn-secondary'}`}
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                        onClick={() => setTab('register')}
                    >
                        <UserPlus size={16} /> Create Account
                    </button>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(233, 0, 82, 0.15)',
                        border: '1px solid rgba(233, 0, 82, 0.3)',
                        color: 'var(--gv-pink)',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        marginBottom: '1rem',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                    }}>
                        <AlertTriangle size={15} /> {error}
                    </div>
                )}

                {tab === 'login' ? (
                    <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                                <User size={14} /> Username
                            </label>
                            <input 
                                type="text"
                                className="gv-input"
                                placeholder="Enter your username (e.g. Admin or AlexMercer)"
                                value={loginName}
                                onChange={(e) => setLoginName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                                <Lock size={14} /> Password
                            </label>
                            <input 
                                type="password"
                                className="gv-input"
                                placeholder="Enter password"
                                value={loginPass}
                                onChange={(e) => setLoginPass(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="gv-btn gv-btn-primary" style={{ padding: '0.75rem', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }} disabled={loading}>
                            {loading ? 'Logging in...' : <><ArrowRight size={16} /> Login to GameVerse</>}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                                <IdCard size={14} /> Unique Username (Used for Login)
                            </label>
                            <input 
                                type="text"
                                className="gv-input"
                                placeholder="Choose username handle (e.g. AlexMercer)"
                                value={regUsername}
                                onChange={(e) => setRegUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                                <User size={14} /> Display Gamer Name
                            </label>
                            <input 
                                type="text"
                                className="gv-input"
                                placeholder="Enter display name (e.g. Alex Mercer)"
                                value={regName}
                                onChange={(e) => setRegName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                                <Gamepad2 size={14} /> Primary Game
                            </label>
                            <select 
                                className="gv-input"
                                value={regGame}
                                onChange={(e) => setRegGame(e.target.value)}
                            >
                                <option value="DLS">Dream League Soccer (DLS)</option>
                                <option value="eFootball">eFootball (PES)</option>
                                <option value="CoD Mobile">Call of Duty Mobile</option>
                                <option value="PUBG">PUBG Mobile</option>
                                <option value="Free Fire">Free Fire</option>
                                <option value="EA Sports FC">EA Sports FC / FIFA</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                                <Lock size={14} /> Password
                            </label>
                            <input 
                                type="password"
                                className="gv-input"
                                placeholder="Create a password"
                                value={regPass}
                                onChange={(e) => setRegPass(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="gv-btn gv-btn-mint" style={{ padding: '0.75rem', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }} disabled={loading}>
                            {loading ? 'Creating...' : <><CheckCircle2 size={16} /> Join GameVerse</>}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
