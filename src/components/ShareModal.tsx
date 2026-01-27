import React, { useEffect, useState } from 'react';
import { X, Copy, Download, Check, Settings2, Camera, Users, Radio, Globe, Link } from 'lucide-react';
import QRCode from 'qrcode';
import { logEvent } from '../utils/analytics';
import type { PeerSession } from '../hooks/usePeerSession';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    // shareUrl: string; // REMOVED: Now generated dynamically
    isLightMode: boolean;
    warning?: string | null;
    peerSession?: PeerSession; // Added PeerSession prop
    viewMode: 'single' | 'dual' | 'triple' | 'quad';
    viewports: { index: number; title: string; hasContent: boolean }[];
    onGenerateLink: (indices: number[]) => string;
    // New Props for Lifting State
    selectedIndices: number[];
    onSelectionChange: (indices: number[]) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, isLightMode, warning, peerSession, viewports, onGenerateLink, selectedIndices, onSelectionChange }) => {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'link' | 'embed' | 'live'>('link');

    // Multi-View Selection State REMOVED (Lifted to Parent)
    // const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

    // Initialize selection when modal opens or viewMode changes
    // MOVED initialization logic to parent (App.tsx)
    /* useEffect(() => {
        if (isOpen) {
            const activeIndices = viewports.filter(v => v.hasContent).map(v => v.index);
            if (activeIndices.length === 0) setSelectedIndices([0]);
            else setSelectedIndices(activeIndices);
        }
    }, [isOpen, viewports]); */

    // Memoized Share URL based on selection
    const shareUrl = React.useMemo(() => {
        return onGenerateLink(selectedIndices);
    }, [selectedIndices, onGenerateLink]);

    // Embed Options State
    const [embedSpin, setEmbedSpin] = useState(false);
    const [embedControls, setEmbedControls] = useState(true);
    const [embedTheme, setEmbedTheme] = useState<'dark' | 'light'>('dark');
    const [embedStatic, setEmbedStatic] = useState(false);
    const [embedScrollProtection, setEmbedScrollProtection] = useState(false);
    const [embedSize, setEmbedSize] = useState<'small' | 'medium' | 'large' | 'full' | 'custom'>('medium');
    const [customWidth, setCustomWidth] = useState('800');
    const [customHeight, setCustomHeight] = useState('600');
    const [embedOrientation, setEmbedOrientation] = useState<any>(null);
    const [embedTransparent, setEmbedTransparent] = useState(false);
    const [embedBorderRadius, setEmbedBorderRadius] = useState<0 | 12 | 24>(12);
    const [embedShadow, setEmbedShadow] = useState(true);
    // const [embedLazy, setEmbedLazy] = useState(false); // REMOVED
    const [embedInteractionWrapper, setEmbedInteractionWrapper] = useState(false);

    // Live Session State
    const [remotePeerIdInput, setRemotePeerIdInput] = useState('');

    // Orientation Message Handler
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'ORIENTATION_RESPONSE') {
                console.log("Received orientation for embed:", event.data.orientation);
                setEmbedOrientation(event.data.orientation);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleSetStartView = () => {
        console.log("ShareModal: handleSetStartView clicked. Sending REQUEST_ORIENTATION");
        // Request orientation from main window (App)
        window.postMessage({ type: 'REQUEST_ORIENTATION' }, '*');
    };

    // Generate QR Code
    useEffect(() => {
        if (!isOpen) return;

        let targetUrl = shareUrl;

        // If in Live Session mode, generate a Join Link QR
        if (activeTab === 'live' && peerSession?.peerId) {
            const url = new URL(window.location.href);
            url.search = `?join=${peerSession.peerId}`;
            targetUrl = url.toString();
        }

        if (targetUrl) {
            console.log(`Generating QR for URL (${targetUrl.length} chars)`);
            QRCode.toDataURL(targetUrl, {
                margin: 2,
                width: 400,
                errorCorrectionLevel: 'L',
                color: {
                    dark: isLightMode ? '#000000' : '#FFFFFF',
                    light: isLightMode ? '#FFFFFF' : '#171717'
                }
            })
                .then(url => {
                    setQrCodeDataUrl(url);
                    setGenerationError(null);
                })
                .catch(err => {
                    console.error('Failed to generate QR code', err);
                    setGenerationError('URL too long for QR Code');
                });
        }
    }, [isOpen, shareUrl, isLightMode, activeTab, peerSession?.peerId]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            logEvent('copy_share_link', { url: shareUrl });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleCopySessionId = async () => {
        if (!peerSession?.peerId) return;
        try {
            await navigator.clipboard.writeText(peerSession.peerId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) { console.error(err); }
    };

    const handleCopyJoinLink = async () => {
        if (!peerSession?.peerId) return;
        const url = new URL(window.location.href);
        url.search = `?join=${peerSession.peerId}`;
        try {
            await navigator.clipboard.writeText(url.toString());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) { console.error(err); }
    };

    const handleDownloadQR = () => {
        if (!qrCodeDataUrl) return;
        logEvent('download_qr');
        const link = document.createElement('a');
        link.href = qrCodeDataUrl;
        link.download = 'protein-viewer-qr-code.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Generate Embed Code
    const getEmbedUrl = () => {
        let url = shareUrl.replace('?', '?embed=true&');
        if (embedSpin) {
            url += '&spin=true';
        }
        if (!embedControls) url += '&ui=false';
        if (embedTheme === 'light') url += '&theme=light';
        if (embedTheme === 'dark') url += '&theme=dark';
        if (embedStatic) url += '&interaction=false';
        if (embedScrollProtection) url += '&scroll=false';
        // if (embedLazy) url += '&lazy=true'; // REMOVED
        if (embedInteractionWrapper) url += '&interactionWrapper=true';

        if (embedTransparent) url += '&bg=transparent';
        if (embedOrientation) url += `&orientation=${encodeURIComponent(JSON.stringify(embedOrientation))}`;
        return url;
    };

    const finalEmbedUrl = getEmbedUrl();

    const getDimensions = () => {
        switch (embedSize) {
            case 'small': return { width: '400', height: '300' };
            case 'medium': return { width: '600', height: '450' };
            case 'large': return { width: '800', height: '600' };
            case 'full': return { width: '100%', height: '600' };
            case 'custom': return { width: customWidth, height: customHeight };
        }
    };
    const { width, height } = getDimensions();

    const embedCode = `<iframe
  src="${finalEmbedUrl}"
  width="${width}"
  height="${height}"
  style="border:none; border-radius: ${embedBorderRadius}px; box-shadow: ${embedShadow ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none'}; max-width: 100%;${embedTransparent ? ' background: transparent;' : ''}"
  title="Quercus Viewer"
  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
  allowFullScreen
  ${embedTransparent ? 'allowTransparency="true"' : ''}
></iframe>`;

    const handleCopyEmbed = async () => {
        try {
            await navigator.clipboard.writeText(embedCode);
            setCopied(true);
            logEvent('copy_embed_code');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className={`relative w-full max-w-5xl rounded-xl shadow-2xl p-5 my-auto ${isLightMode ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white'}`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Share Visualization</h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isLightMode ? 'hover:bg-neutral-100' : 'hover:bg-neutral-800'}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {warning ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <div className="p-4 rounded-full bg-yellow-500/10 text-yellow-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                        </div>
                        <div>
                            <h3 className={`font-semibold ${isLightMode ? 'text-neutral-900' : 'text-white'}`}>Sharing Unavailable</h3>
                            <p className={`text-sm mt-1 ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
                                {warning}
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Multi-View Selection */}
                        <div className={`p-4 mb-6 rounded-xl border ${isLightMode ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-950 border-neutral-800'}`}>
                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                Select Views to Share
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {viewports.map((vp) => (
                                    <label
                                        key={vp.index}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedIndices.includes(vp.index)
                                            ? (isLightMode ? 'bg-white border-blue-500 shadow-sm' : 'bg-neutral-900 border-blue-500 shadow-sm')
                                            : (isLightMode ? 'bg-transparent border-transparent hover:bg-neutral-100' : 'bg-transparent border-transparent hover:bg-neutral-800')
                                            } ${!vp.hasContent ? 'opacity-50' : ''}`}
                                    >
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedIndices.includes(vp.index)
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : (isLightMode ? 'border-neutral-300 bg-white' : 'border-neutral-700 bg-neutral-950')
                                            }`}>
                                            {selectedIndices.includes(vp.index) && <Check className="w-3.5 h-3.5" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={selectedIndices.includes(vp.index)}
                                            disabled={!vp.hasContent && !selectedIndices.includes(vp.index)}
                                            onChange={() => {
                                                // Use Parent's Handler
                                                if (selectedIndices.includes(vp.index)) {
                                                    // Uncheck
                                                    onSelectionChange(selectedIndices.filter((i: number) => i !== vp.index));
                                                } else {
                                                    // Check
                                                    onSelectionChange([...selectedIndices, vp.index]);
                                                }
                                            }}
                                        />
                                        <div className="flex flex-col min-w-0">
                                            <span className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-neutral-500' : 'text-neutral-500'}`}>
                                                Viewport {vp.index + 1}
                                            </span>
                                            <span className={`text-sm font-medium truncate ${isLightMode ? 'text-neutral-900' : 'text-white'}`}>
                                                {vp.title || "Empty"}
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>


                        {/* Tabs */}
                        <div className={`flex p-1 mb-4 rounded-lg ${isLightMode ? 'bg-neutral-100' : 'bg-neutral-800'}`}>
                            <button
                                onClick={() => setActiveTab('link')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'link'
                                    ? (isLightMode ? 'bg-white shadow-sm text-neutral-900' : 'bg-neutral-700 shadow-sm text-white')
                                    : (isLightMode ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white')
                                    }`}
                            >
                                Share Link
                            </button>
                            <button
                                onClick={() => setActiveTab('embed')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'embed'
                                    ? (isLightMode ? 'bg-white shadow-sm text-neutral-900' : 'bg-neutral-700 shadow-sm text-white')
                                    : (isLightMode ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white')
                                    }`}
                            >
                                Embed Widget
                            </button>
                            <button
                                onClick={() => setActiveTab('live')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'live'
                                    ? (isLightMode ? 'bg-white shadow-sm text-neutral-900' : 'bg-neutral-700 shadow-sm text-white')
                                    : (isLightMode ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white')
                                    }`}
                            >
                                Live Session
                            </button>
                        </div>

                        {activeTab === 'link' ? (
                            <>
                                {/* QR Code */}
                                <div className="flex flex-col items-center gap-4 mb-6">
                                    {qrCodeDataUrl ? (
                                        <div className={`p-4 rounded-lg border-2 ${isLightMode ? 'bg-white border-neutral-200' : 'bg-neutral-950 border-neutral-700'}`}>
                                            <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
                                        </div>
                                    ) : (
                                        <div className="w-48 h-48 flex flex-col items-center justify-center text-center p-4">
                                            {generationError ? (
                                                <>
                                                    <div className="text-red-500 mb-2">⚠️</div>
                                                    <p className="text-sm text-red-400">{generationError}</p>
                                                    <p className="text-xs text-neutral-500 mt-2">Try shortening the URL or using fewer viewports.</p>
                                                </>
                                            ) : (
                                                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Link */}
                                <div className="space-y-3 mb-6">
                                    <label className={`text-sm font-medium ${isLightMode ? 'text-neutral-700' : 'text-neutral-300'}`}>
                                        Shareable Link
                                    </label>
                                    <div className={`flex items-center gap-2 p-3 rounded-lg border ${isLightMode ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-950 border-neutral-700'}`}>
                                        <input
                                            type="text"
                                            value={shareUrl}
                                            readOnly
                                            className={`flex-1 bg-transparent text-sm outline-none ${isLightMode ? 'text-neutral-900' : 'text-neutral-100'}`}
                                        />
                                        <button
                                            onClick={handleCopy}
                                            className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-500 text-white' : (isLightMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white')}`}
                                            title="Copy to clipboard"
                                        >
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Social Sharing */}
                                <div className="space-y-3 mb-6">
                                    <label className={`text-sm font-medium ${isLightMode ? 'text-neutral-700' : 'text-neutral-300'}`}>
                                        Post to Socials
                                    </label>
                                    <div className="flex gap-2">
                                        <a
                                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Check out this protein structure I visualized with Quercus Viewer! 🧬✨")}&url=${encodeURIComponent(shareUrl)}&hashtags=StructuralBiology,ProteinDesign,QuercusViewer`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => logEvent('share_twitter')}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold bg-black text-white hover:bg-neutral-800 transition-colors border border-white/10"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                            </svg>
                                            <span className="text-xs">Post</span>
                                        </a>
                                        <a
                                            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => logEvent('share_linkedin')}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold bg-[#0077b5] text-white hover:bg-[#006396] transition-colors"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                            </svg>
                                            <span className="text-xs">Share</span>
                                        </a>
                                    </div>
                                </div>
                            </>
                        ) : activeTab === 'embed' ? (
                            /* Embed Tab */
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-1">
                                {/* Left Column: Controls */}
                                <div className="md:col-span-5 space-y-4">
                                    {/* Behavior Group */}
                                    <div className="space-y-3">
                                        <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                            Behavior
                                        </label>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => setEmbedSpin(!embedSpin)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${embedSpin
                                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                    : (isLightMode ? 'bg-neutral-100/50 text-neutral-600 border-neutral-200 hover:bg-neutral-100' : 'bg-neutral-800/50 text-neutral-400 border-neutral-700 hover:bg-neutral-800')
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${embedSpin ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                                                    Auto-Spin
                                                </span>
                                                {embedSpin && <Check className="w-4 h-4" />}
                                            </button>



                                            <button
                                                onClick={() => setEmbedScrollProtection(!embedScrollProtection)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${embedScrollProtection
                                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                    : (isLightMode ? 'bg-neutral-100/50 text-neutral-600 border-neutral-200 hover:bg-neutral-100' : 'bg-neutral-800/50 text-neutral-400 border-neutral-700 hover:bg-neutral-800')
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${embedScrollProtection ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                                                    Scroll Protection
                                                </span>
                                                {embedScrollProtection && <Check className="w-4 h-4" />}
                                            </button>

                                            <button
                                                onClick={() => setEmbedStatic(!embedStatic)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${embedStatic
                                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                    : (isLightMode ? 'bg-neutral-100/50 text-neutral-600 border-neutral-200 hover:bg-neutral-100' : 'bg-neutral-800/50 text-neutral-400 border-neutral-700 hover:bg-neutral-800')
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${embedStatic ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                                                    Static Mode
                                                </span>
                                            </button>

                                            <button
                                                onClick={handleSetStartView}
                                                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${embedOrientation
                                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                    : (isLightMode ? 'bg-neutral-100/50 text-neutral-600 border-neutral-200 hover:bg-neutral-100' : 'bg-neutral-800/50 text-neutral-400 border-neutral-700 hover:bg-neutral-800')
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${embedOrientation ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                                                    Set Start View
                                                </span>
                                                {embedOrientation ? <Check className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                                            </button>

                                            {/* Lazy Load Button REMOVED */}

                                            <button
                                                onClick={() => setEmbedInteractionWrapper(!embedInteractionWrapper)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${embedInteractionWrapper
                                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                    : (isLightMode ? 'bg-neutral-100/50 text-neutral-600 border-neutral-200 hover:bg-neutral-100' : 'bg-neutral-800/50 text-neutral-400 border-neutral-700 hover:bg-neutral-800')
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${embedInteractionWrapper ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                                                    Click-to-Interact
                                                </span>
                                                {embedInteractionWrapper && <Check className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Appearance Group */}
                                    <div className="space-y-3">
                                        <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                            Appearance
                                        </label>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => setEmbedControls(!embedControls)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${!embedControls
                                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                    : (isLightMode ? 'bg-neutral-100/50 text-neutral-600 border-neutral-200 hover:bg-neutral-100' : 'bg-neutral-800/50 text-neutral-400 border-neutral-700 hover:bg-neutral-800')
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${!embedControls ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                                                    Hide Controls
                                                </span>
                                                {!embedControls && <Check className="w-4 h-4" />}
                                            </button>

                                            {/* Theme Toggle */}
                                            <div className={`flex items-center justify-between p-1 rounded-lg border ${isLightMode ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-800 border-neutral-700'}`}>
                                                <button
                                                    onClick={() => setEmbedTheme('dark')}
                                                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${embedTheme === 'dark'
                                                        ? (isLightMode ? 'bg-white shadow text-neutral-900' : 'bg-neutral-700 shadow text-white')
                                                        : 'text-neutral-500 hover:text-neutral-400'
                                                        }`}
                                                >
                                                    Dark Theme
                                                </button>
                                                <button
                                                    onClick={() => setEmbedTheme('light')}
                                                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${embedTheme === 'light'
                                                        ? (isLightMode ? 'bg-white shadow text-neutral-900' : 'bg-neutral-600 shadow text-white')
                                                        : 'text-neutral-500 hover:text-neutral-400'
                                                        }`}
                                                >
                                                    Light Theme
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visual Style Group */}
                                    <div className="space-y-3">
                                        <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                            Visual Style
                                        </label>
                                        <div className="flex flex-col gap-2">


                                            <button
                                                onClick={() => setEmbedTransparent(!embedTransparent)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${embedTransparent
                                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                    : (isLightMode ? 'bg-neutral-100/50 text-neutral-600 border-neutral-200 hover:bg-neutral-100' : 'bg-neutral-800/50 text-neutral-400 border-neutral-700 hover:bg-neutral-800')
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${embedTransparent ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                                                    Transparent Background
                                                </span>
                                                {embedTransparent && <Check className="w-4 h-4" />}
                                            </button>

                                            <button
                                                onClick={() => setEmbedShadow(!embedShadow)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${embedShadow
                                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                    : (isLightMode ? 'bg-neutral-100/50 text-neutral-600 border-neutral-200 hover:bg-neutral-100' : 'bg-neutral-800/50 text-neutral-400 border-neutral-700 hover:bg-neutral-800')
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${embedShadow ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                                                    Drop Shadow
                                                </span>
                                                {embedShadow && <Check className="w-4 h-4" />}
                                            </button>

                                            {/* Border Radius Control */}
                                            <div className={`p-3 rounded-lg border space-y-2 ${isLightMode ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-800/50 border-neutral-700'}`}>
                                                <div className="flex justify-between text-xs font-medium opacity-70">
                                                    <span>Corner Radius</span>
                                                    <span>{embedBorderRadius}px</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    {[0, 12, 24].map((radius) => (
                                                        <button
                                                            key={radius}
                                                            onClick={() => setEmbedBorderRadius(radius as any)}
                                                            className={`flex-1 py-1.5 text-xs rounded transition-all ${embedBorderRadius === radius
                                                                ? 'bg-blue-600 text-white shadow'
                                                                : (isLightMode ? 'bg-white text-neutral-600 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700')}`}
                                                        >
                                                            {radius === 0 ? 'Sharp' : radius === 12 ? 'Round' : 'Soft'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                        </div>
                                    </div>

                                    {/* Frame Size Selector */}
                                    <div className="space-y-3">
                                        <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                            Frame Width
                                        </label>
                                        <div className="flex gap-2">
                                            {/* Presets Group */}
                                            <div className={`flex-1 grid grid-cols-4 gap-1 p-1 rounded-lg ${isLightMode ? 'bg-neutral-100' : 'bg-neutral-800'}`}>
                                                {(['small', 'medium', 'large', 'full'] as const).map((size) => (
                                                    <button
                                                        key={size}
                                                        onClick={() => setEmbedSize(size)}
                                                        className={`py-1.5 text-xs font-medium rounded-md capitalize transition-all ${embedSize === size
                                                            ? (isLightMode ? 'bg-white shadow text-neutral-900' : 'bg-neutral-700 shadow text-white')
                                                            : 'text-neutral-500 hover:text-neutral-900'
                                                            }`}
                                                    >
                                                        {size}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Distinct Custom Button */}
                                            <button
                                                onClick={() => setEmbedSize('custom')}
                                                className={`px-3 flex items-center gap-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${embedSize === 'custom'
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                    : (isLightMode
                                                        ? 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
                                                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200')
                                                    }`}
                                                title="Custom Dimensions"
                                            >
                                                <Settings2 className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">Custom</span>
                                            </button>
                                        </div>

                                        {/* Custom Dimensions Inputs */}
                                        {embedSize === 'custom' && (
                                            <div className="grid grid-cols-2 gap-3 mt-2 animate-in slide-in-from-top-2">
                                                <div className="space-y-1">
                                                    <label className={`text-[10px] font-medium ml-1 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                                        Width (px/%)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={customWidth}
                                                        onChange={(e) => setCustomWidth(e.target.value)}
                                                        className={`w-full px-3 py-2 rounded-lg text-sm font-medium outline-none border transition-all ${isLightMode
                                                            ? 'bg-neutral-100 border-neutral-200 focus:border-blue-500 text-neutral-900 placeholder:text-neutral-400'
                                                            : 'bg-neutral-800 border-neutral-700 focus:border-blue-500 text-white placeholder:text-neutral-500'}`}
                                                        placeholder="800"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className={`text-[10px] font-medium ml-1 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                                        Height (px)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={customHeight}
                                                        onChange={(e) => setCustomHeight(e.target.value)}
                                                        className={`w-full px-3 py-2 rounded-lg text-sm font-medium outline-none border transition-all ${isLightMode
                                                            ? 'bg-neutral-100 border-neutral-200 focus:border-blue-500 text-neutral-900 placeholder:text-neutral-400'
                                                            : 'bg-neutral-800 border-neutral-700 focus:border-blue-500 text-white placeholder:text-neutral-500'}`}
                                                        placeholder="600"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column: Preview & Code */}
                                <div className="md:col-span-7 space-y-4">
                                    {/* Preview */}
                                    <div className="space-y-2">
                                        <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                            Live Preview
                                        </label>
                                        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/50">
                                            <iframe
                                                src={finalEmbedUrl}
                                                className="w-full h-full border-none pointer-events-none"
                                                title="Embed Preview"
                                            />
                                        </div>
                                    </div>

                                    {/* Code Block */}
                                    <div className="space-y-2">
                                        <label className={`text-xs font-bold uppercase tracking-wider flex justify-between ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                            <span>Embed Code</span>
                                            <span className="text-[10px] font-normal opacity-70">Click to copy</span>
                                        </label>
                                        <div
                                            onClick={handleCopyEmbed}
                                            className={`relative p-4 rounded-lg border leading-relaxed font-mono text-[10px] sm:text-xs overflow-x-auto whitespace-pre cursor-pointer hover:border-blue-500/50 transition-colors group ${isLightMode ? 'bg-neutral-800 text-green-400 border-neutral-700 shadow-inner' : 'bg-black text-green-400 border-neutral-800 shadow-inner'}`}
                                        >
                                            {embedCode}
                                            <div className="absolute top-2 right-2 p-1.5 rounded bg-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Copy size={14} />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleCopyEmbed}
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all shadow-lg ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-[1.02] active:scale-[0.98]'}`}
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copied to Clipboard!' : 'Copy Embed Code'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Live Session Tab */
                            <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                        <Users className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Live Collaboration</h3>
                                    <p className={`text-sm max-w-md mx-auto mb-6 ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
                                        Share your session ID or join a friend to synchronize your view in real-time. Camera and structure changes are mirrored instantly.
                                    </p>

                                    {peerSession ? (
                                        <div className="space-y-6 text-left">
                                            {/* Host Section: My Session ID + QR */}
                                            <div className={`p-5 rounded-2xl border ${isLightMode ? 'bg-white border-neutral-200' : 'bg-neutral-950 border-neutral-800'}`}>
                                                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                                                    {/* QR Code (Fixed Size) */}
                                                    {peerSession.peerId && (
                                                        <div className="bg-white p-2 rounded-xl border border-neutral-200 shrink-0">
                                                            <img
                                                                src={qrCodeDataUrl || ''}
                                                                alt="Join Session QR"
                                                                className="w-32 h-32 object-contain block"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Session ID Stats */}
                                                    <div className="flex-1 w-full space-y-4">
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-2 flex items-center gap-2">
                                                                <Radio className="w-3 h-3" />
                                                                Invite Others
                                                            </label>
                                                            <p className={`text-sm mb-3 ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
                                                                Share this ID or let others scan the QR code to join your session instantly.
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`flex-1 font-mono text-sm truncate p-3 rounded-lg border ${isLightMode ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900 border-neutral-800'}`}>
                                                                    {peerSession.peerId || 'Generating...'}
                                                                </div>
                                                                <button
                                                                    onClick={handleCopySessionId}
                                                                    className="p-3 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-colors"
                                                                    title="Copy ID"
                                                                >
                                                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                                </button>
                                                                <button
                                                                    onClick={handleCopyJoinLink}
                                                                    className="p-3 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-colors"
                                                                    title="Copy Link"
                                                                >
                                                                    <Link className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Join Section */}
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className={`w-full border-t ${isLightMode ? 'border-neutral-200' : 'border-neutral-800'}`}></div>
                                                </div>
                                                <div className="relative flex justify-center text-xs uppercase">
                                                    <span className={`px-2 ${isLightMode ? 'bg-white text-neutral-500' : 'bg-neutral-900 text-neutral-500'}`}>Or join existing</span>
                                                </div>
                                            </div>

                                            <div className={`p-5 rounded-2xl border ${isLightMode ? 'bg-white border-neutral-200' : 'bg-neutral-950 border-neutral-800'}`}>
                                                <label className="text-xs font-bold uppercase tracking-wider text-purple-500 mb-3 block flex items-center gap-2">
                                                    <Globe className="w-3 h-3" />
                                                    Join a Session
                                                </label>
                                                <div className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Enter Peer ID to join..."
                                                        value={remotePeerIdInput}
                                                        onChange={(e) => setRemotePeerIdInput(e.target.value)}
                                                        className={`flex-1 min-w-0 px-4 py-2.5 text-sm rounded-lg outline-none border focus:border-purple-500 transition-all ${isLightMode ? 'bg-neutral-50 border-neutral-200 text-neutral-900' : 'bg-neutral-900 border-neutral-800 text-white'
                                                            }`}
                                                    />
                                                    <button
                                                        onClick={() => peerSession.connectToPeer(remotePeerIdInput)}
                                                        disabled={!remotePeerIdInput}
                                                        className="px-6 py-2.5 text-sm font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20"
                                                    >
                                                        Join
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Status Footer */}
                                            <div className="flex items-center justify-center gap-2 pt-2">
                                                <div className={`w-2.5 h-2.5 rounded-full ${peerSession.isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-neutral-500'}`} />
                                                <span className={`text-xs font-medium ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                                    {peerSession.isConnected
                                                        ? `Active Session • ${peerSession.connections.length} peer(s) connected`
                                                        : 'Ready to connect'}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-red-400 p-4 border border-red-500/20 rounded-xl bg-red-500/10">
                                            PeerJS Service Unavailable
                                        </div>
                                    )}

                                    {/* Connection Status */}
                                    {peerSession && (
                                        <div className="mt-8 flex items-center justify-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${peerSession.isConnected ? 'bg-green-500 animate-pulse' : 'bg-neutral-500'
                                                }`} />
                                            <span className={`text-sm font-medium ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
                                                {peerSession.isConnected
                                                    ? `Connected to ${peerSession.connections.length} peer(s)`
                                                    : 'Waiting for connection...'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Actions - Link Mode Only (Download QR) */}
                {!warning && activeTab === 'link' && (
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={handleDownloadQR}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isLightMode ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900' : 'bg-neutral-800 hover:bg-neutral-700 text-white'}`}
                        >
                            <Download className="w-4 h-4" />
                            Download QR
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
};
