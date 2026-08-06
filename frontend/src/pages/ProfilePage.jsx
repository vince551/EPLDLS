import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, uploadAvatar } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { 
    User, Camera, Shirt, Gamepad2, MessagesSquare, Lock, 
    ImagePlus, FolderOpen, FileText, Save, LogOut, AlertTriangle, CheckCircle2, Shield, LayoutDashboard, Share2
} from 'lucide-react';
import SocialLinks from '../components/SocialLinks';

export default function ProfilePage() {
    const { currentUser, updateUser, logout } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState(currentUser?.username || '');
    const [team, setTeam] = useState(currentUser?.team || '');
    const [bio, setBio] = useState(currentUser?.bio || '');
    const [favoriteGame, setFavoriteGame] = useState(currentUser?.favorite_game || 'DLS');
    const [picUrl, setPicUrl] = useState(currentUser?.pic || '');
    const [twitter, setTwitter] = useState(currentUser?.twitter || '');
    const [instagram, setInstagram] = useState(currentUser?.instagram || '');
    const [tiktok, setTiktok] = useState(currentUser?.tiktok || '');
    const [discord, setDiscord] = useState(currentUser?.discord || '');
    const [youtube, setYoutube] = useState(currentUser?.youtube || '');
    const [newPass, setNewPass] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [msg, setMsg] = useState({ text: '', type: '' });

    if (!currentUser) return null;

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    // Handle File Upload from device
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setMsg({ text: 'Uploading avatar image...', type: 'info' });

        try {
            const res = await uploadAvatar(currentUser.id, file);
            if (res.url) {
                setPicUrl(res.url);
                updateUser({ pic: res.url });
                setMsg({ text: 'Avatar uploaded successfully!', type: 'success' });
            }
        } catch (err) {
            setMsg({ text: err.message || 'Failed to upload avatar', type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg({ text: '', type: '' });

        try {
            const res = await apiFetch('/auth.php?action=update_profile', {
                method: 'POST',
                body: {
                    id: currentUser.id,
                    username,
                    pic: picUrl,
                    team,
                    bio,
                    favoriteGame,
                    twitter,
                    instagram,
                    tiktok,
                    discord,
                    youtube,
                    newPass
                }
            });

            if (res.user) {
                updateUser(res.user);
                setNewPass('');
                setMsg({ text: 'Profile updated successfully!', type: 'success' });
            }
        } catch (err) {
            setMsg({ text: err.message || 'Failed to save profile', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={24} /> Gamer Profile Settings
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)' }}>
                    Manage your gaming identity, avatar image, squad team, and preferences
                </p>
            </div>

            {/* Avatar Preview Card */}
            <div className="gv-card" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                flexWrap: 'wrap',
                background: 'linear-gradient(135deg, rgba(56,0,60,0.9), rgba(15,5,29,0.95))',
                borderColor: 'rgba(0,255,135,0.3)'
            }}>
                <div style={{ position: 'relative' }}>
                    {picUrl ? (
                        <img 
                            src={picUrl} 
                            alt={currentUser.name}
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            style={{
                                width: '90px',
                                height: '90px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '3px solid var(--gv-mint)',
                                boxShadow: '0 0 16px var(--gv-mint-glow)'
                            }}
                        />
                    ) : null}
                    <div style={{
                        width: '90px', height: '90px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--gv-purple), var(--gv-pink))',
                        display: picUrl ? 'none' : 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.6rem', fontWeight: 900, color: 'white',
                        border: '3px solid var(--gv-mint)',
                        boxShadow: '0 0 16px var(--gv-mint-glow)'
                    }}>
                        {getInitials(currentUser.name)}
                    </div>
                    <label 
                        htmlFor="avatarFileInput"
                        style={{
                            position: 'absolute',
                            bottom: '0',
                            right: '0',
                            background: 'var(--gv-pink)',
                            color: 'white',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px var(--gv-pink-glow)'
                        }}
                        title="Upload Avatar Image"
                    >
                        <Camera size={16} />
                    </label>
                    <input 
                        type="file"
                        id="avatarFileInput"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                </div>

                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {currentUser.name} {currentUser.role === 'admin' && <span className="gv-badge gv-badge-pink" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Shield size={11} /> Admin</span>}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)', fontWeight: 700, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        @{currentUser.username || currentUser.name.replace(/\s+/g, '')}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gv-cyan)', fontWeight: 700, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Shirt size={14} /> {currentUser.team}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                        <span className="gv-badge gv-badge-mint" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Gamepad2 size={11} /> {favoriteGame}
                        </span>
                        {currentUser.can_create_forums ? (
                            <span className="gv-badge gv-badge-cyan" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <MessagesSquare size={11} /> Forum Author Granted
                            </span>
                        ) : (
                            <span className="gv-badge gv-badge-pink" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Lock size={11} /> Member
                            </span>
                        )}
                    </div>
                    {currentUser.role === 'admin' && (
                        <button
                            type="button"
                            className="gv-btn gv-btn-primary"
                            style={{ marginTop: '0.75rem', padding: '0.45rem 0.9rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            onClick={() => navigate('/admin')}
                        >
                            <LayoutDashboard size={14} /> Open Admin Dashboard
                        </button>
                    )}
                    <SocialLinks user={{ twitter, instagram, tiktok, discord, youtube }} size="md" />
                </div>
            </div>

            {/* Form Card */}
            <div className="gv-card">
                {msg.text && (
                    <div style={{
                        background: msg.type === 'error' ? 'rgba(233,0,82,0.15)' : 'rgba(0,255,135,0.15)',
                        border: `1px solid ${msg.type === 'error' ? 'rgba(233,0,82,0.3)' : 'rgba(0,255,135,0.3)'}`,
                        color: msg.type === 'error' ? 'var(--gv-pink)' : 'var(--gv-mint)',
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
                        {msg.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />} {msg.text}
                    </div>
                )}

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                            <ImagePlus size={14} /> Profile Avatar Upload
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                                type="text"
                                className="gv-input"
                                placeholder="Paste image URL or upload image file using button above"
                                value={picUrl}
                                onChange={(e) => setPicUrl(e.target.value)}
                            />
                            <label htmlFor="avatarFileInput" className="gv-btn gv-btn-secondary" style={{ whiteSpace: 'nowrap', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                <FolderOpen size={14} /> Browse File
                            </label>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                            <User size={14} /> Unique Username (Used for Login)
                        </label>
                        <input 
                            type="text"
                            className="gv-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                            <Shirt size={14} /> Squad / Team Name
                        </label>
                        <input 
                            type="text"
                            className="gv-input"
                            value={team}
                            onChange={(e) => setTeam(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                            <Gamepad2 size={14} /> Primary / Favorite Game
                        </label>
                        <select 
                            className="gv-input"
                            value={favoriteGame}
                            onChange={(e) => setFavoriteGame(e.target.value)}
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
                            <FileText size={14} /> Gamer Bio / Motto
                        </label>
                        <textarea 
                            className="gv-input"
                            rows="3"
                            placeholder="Tell the community about your gaming accomplishments..."
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                            <Share2 size={14} /> Social Media Handles
                        </label>
                        <p style={{ fontSize: '0.7rem', color: 'var(--gv-text-muted)', marginBottom: '0.5rem' }}>Enter usernames only (without @). Leave blank to hide.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                            <input type="text" className="gv-input" placeholder="X / Twitter" value={twitter} onChange={e => setTwitter(e.target.value.replace(/^@/, ''))} />
                            <input type="text" className="gv-input" placeholder="Instagram" value={instagram} onChange={e => setInstagram(e.target.value.replace(/^@/, ''))} />
                            <input type="text" className="gv-input" placeholder="TikTok" value={tiktok} onChange={e => setTiktok(e.target.value.replace(/^@/, ''))} />
                            <input type="text" className="gv-input" placeholder="Discord username" value={discord} onChange={e => setDiscord(e.target.value)} />
                            <input type="text" className="gv-input" placeholder="YouTube" value={youtube} onChange={e => setYoutube(e.target.value.replace(/^@/, ''))} />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gv-text-sub)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                            <Lock size={14} /> New Password (leave blank to keep current)
                        </label>
                        <input 
                            type="password"
                            className="gv-input"
                            placeholder="Enter new password"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="gv-btn gv-btn-mint" style={{ padding: '0.75rem', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }} disabled={loading || uploading}>
                        {loading ? 'Saving...' : <><Save size={16} /> Save Profile Changes</>}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--gv-card-border)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gv-text-sub)' }}>Sign out of your session</span>
                    <button 
                        className="gv-btn gv-btn-primary" 
                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => { logout(); navigate('/auth'); }}
                    >
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
