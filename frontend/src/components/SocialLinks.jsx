import React from 'react';

const PLATFORMS = [
    { key: 'twitter', label: 'X', color: '#1da1f2', prefix: 'https://x.com/' },
    { key: 'instagram', label: 'IG', color: '#e1306c', prefix: 'https://instagram.com/' },
    { key: 'tiktok', label: 'TT', color: '#69c9d0', prefix: 'https://tiktok.com/@' },
    { key: 'discord', label: 'DC', color: '#5865f2', prefix: null },
    { key: 'youtube', label: 'YT', color: '#ff0000', prefix: 'https://youtube.com/@' },
];

function buildUrl(platform, handle) {
    if (!handle) return null;
    const h = handle.replace(/^@/, '').trim();
    if (!h) return null;
    if (platform.prefix) return platform.prefix + h;
    return null;
}

export default function SocialLinks({ user, size = 'sm' }) {
    if (!user) return null;

    const links = PLATFORMS.filter(p => user[p.key]).map(p => ({
        ...p,
        handle: user[p.key],
        url: buildUrl(p, user[p.key]),
    }));

    if (links.length === 0) return null;

    const fontSize = size === 'md' ? '0.72rem' : '0.65rem';
    const pad = size === 'md' ? '0.3rem 0.55rem' : '0.2rem 0.45rem';

    return (
        <div className="social-links-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: size === 'md' ? '0.5rem' : '0.25rem' }}>
            {links.map(p => {
                const inner = (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: pad,
                        borderRadius: '20px',
                        fontSize,
                        fontWeight: 800,
                        background: `${p.color}22`,
                        border: `1px solid ${p.color}55`,
                        color: p.color,
                        textDecoration: 'none',
                        transition: 'var(--transition)',
                    }}>
                        <span style={{ fontSize: '0.6rem', opacity: 0.9 }}>{p.label}</span>
                        @{p.handle.replace(/^@/, '')}
                    </span>
                );

                return p.url ? (
                    <a key={p.key} href={p.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        {inner}
                    </a>
                ) : (
                    <span key={p.key} title={p.handle}>{inner}</span>
                );
            })}
        </div>
    );
}
