import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function PwaInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        // Check if already running as standalone PWA
        if (
            window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true
        ) {
            setIsInstalled(true);
            return;
        }

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
            console.log('[PWA] App installed successfully');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            alert("To install GameVerse Hub, tap your browser's menu (or Share button) and select 'Add to Home Screen' or 'Install App'.");
            return;
        }

        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
            console.log('[PWA] User accepted the install prompt');
            setDeferredPrompt(null);
            setIsInstalled(true);
        } else {
            console.log('[PWA] User dismissed the install prompt');
        }
    };

    if (isInstalled) {
        return null;
    }

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={handleInstallClick}
                className="gv-header-icon-btn pwa-install-btn"
                title="Install GameVerse App"
                aria-label="Install GameVerse App"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                style={{
                    borderColor: 'rgba(0, 255, 135, 0.4)',
                    color: 'var(--gv-mint)',
                    background: 'rgba(0, 255, 135, 0.1)'
                }}
            >
                <Download size={16} />
                {deferredPrompt && (
                    <span
                        style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--gv-mint)',
                            boxShadow: '0 0 6px var(--gv-mint)'
                        }}
                    />
                )}
            </button>

            {showTooltip && (
                <div
                    style={{
                        position: 'absolute',
                        top: '115%',
                        right: '0',
                        background: 'rgba(15, 5, 29, 0.95)',
                        border: '1px solid rgba(0, 255, 135, 0.3)',
                        borderRadius: '6px',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.7rem',
                        color: 'var(--gv-mint)',
                        whiteSpace: 'nowrap',
                        zIndex: 250,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        pointerEvents: 'none'
                    }}
                >
                    Install App
                </div>
            )}
        </div>
    );
}
