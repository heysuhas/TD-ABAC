import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, AlertCircle, Clock, ShieldX, Key, ArrowLeft, Share2, CheckCircle2, UserPlus, Link, Copy } from 'lucide-react';
import { ethers } from 'ethers';

const generateUserWallet = (email) => {
    // Generate the wallet based on the user's email consistently
    // This allows sharing to an email to resolve to the same wallet address as when they log in.
    const normalizedEmail = email.toLowerCase().trim();
    const hash = ethers.id("user_wallet_" + normalizedEmail + import.meta.env.VITE_SUPABASE_ANON_KEY);
    const wallet = new ethers.Wallet(hash);
    return wallet;
};

export default function Access() {
  const { hash } = useParams();
  const [searchParams] = useSearchParams();
  const isSharingInitial = searchParams.get('share') === 'true';
  const autoAccessHash = searchParams.get('token'); // if they click a link with token=?

  const [fileHash, setFileHash] = useState(hash || autoAccessHash || '');
  const [shareEmail, setShareEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, checking, success, error, sharing
  const [message, setMessage] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [activeTab, setActiveTab] = useState(isSharingInitial ? 'share' : 'access');
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();

  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const userWallet = generateUserWallet(session.user.email);
        setWallet(userWallet);
        setWalletAddress(userWallet.address);
      }
    });

    if (autoAccessHash && !hash) {
      setFileHash(autoAccessHash);
    }
  }, [autoAccessHash, hash]);

  const handleAccess = async () => {
    if (!fileHash) return;

    setLoading(true);
    setStatus('checking');
    setMessage('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080/api';

      const response = await fetch(`${backendUrl}/access/${fileHash}?userAddress=${walletAddress}`, {
        method: 'GET',
      });

      if (response.ok) {
        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Try to get filename from header
        const disposition = response.headers.get('Content-Disposition');
        let filename = 'downloaded_file';
        if (disposition && disposition.indexOf('filename=') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);

        setStatus('success');
        setMessage('Access Granted: File downloaded successfully.');
      } else {
        const errorText = await response.text();
        setStatus('error');
        setMessage(errorText || 'Access Denied');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage('An error occurred while connecting to the backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!fileHash || !shareEmail) return;
    setLoading(true);
    setMessage('');

    try {
      // 1. We need the target user's wallet address.
      // Since we auto-generate wallets based on Supabase UUIDs, we need to know their UUID.
      // For MVP without exposing a full user directory API, we can either:
      // A) Ask backend to handle mapping (if we stored emails there, but we didn't).
      // B) Ask Supabase for the user ID of the given email.
      // Since Supabase `auth.admin` is needed to list users by email, and we only have anon key,
      // we'll implement a workaround: "Generate Share Link" which allows ANYONE who clicks it while logged in to claim access.
      // Actually, since we want to grant on-chain access to a specific user, we will just use a magic trick for the MVP:
      // We'll generate a shareable link that contains the fileHash. When the recipient clicks it, they log in,
      // and their frontend can hit a backend endpoint to "claim" the share if they have the link token.

      // Let's do something simpler: We just generate a link with the hash.
      // Wait, the prompt says "integrate with the backend to grant on-chain access automatically".
      // If User A invites User B via email, User A needs to grant User B access on the blockchain.
      // To simulate this without an admin API:
      // We will hash the email deterministically just like the user ID to get their wallet address!
      // This is a neat Web3/Web2 hybrid trick for the MVP.

      // For MVP, map target email to a wallet address deterministically
      const targetWallet = generateUserWallet(shareEmail);

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080/api';

      // Pass the private key so the backend can sign the transaction instead of impersonating
      // In a real app, the frontend would sign a typed data message and send the signature,
      // or sign the transaction directly and send the raw transaction.
      // For this MVP, we send the private key to the backend over HTTPS.
      const response = await fetch(`${backendUrl}/files/${fileHash}/share`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            ownerAddress: walletAddress,
            shareWithAddress: targetWallet.address,
            privateKey: wallet.privateKey
        })
      });

      if (!response.ok) {
         throw new Error(await response.text());
      }

      setStatus('success');
      setMessage(`Successfully shared with ${shareEmail} on the blockchain!`);

      // Generate link
      const link = `${window.location.origin}/access/${fileHash}`;
      setShareLink(link);

    } catch(err) {
        console.error(err);
        setStatus('error');
        setMessage(err.message || 'Error sharing file');
    } finally {
        setLoading(false);
    }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6">
       <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
      >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Vault
      </button>

      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
                File Manager
            </h1>
            <p className="text-slate-400">Access or share secure files</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl backdrop-blur-sm overflow-hidden shadow-2xl">

            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900/80">
                <button
                    onClick={() => { setActiveTab('access'); setStatus('idle'); setMessage(''); }}
                    className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'access' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Download className="w-4 h-4" /> Download Access
                </button>
                <button
                    onClick={() => { setActiveTab('share'); setStatus('idle'); setMessage(''); }}
                    className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'share' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Share2 className="w-4 h-4" /> Share File
                </button>
            </div>

            <div className="p-8">
                {/* Status Messages */}
                {status === 'error' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
                        <ShieldX className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm">{message}</p>
                    </motion.div>
                )}

                {status === 'success' && activeTab === 'access' && (
                     <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm">{message}</p>
                    </motion.div>
                )}

                {/* Content */}
                {activeTab === 'access' ? (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">File Hash (IPFS CID)</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="text"
                                    value={fileHash}
                                    onChange={(e) => setFileHash(e.target.value)}
                                    placeholder="Qm..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleAccess}
                            disabled={!fileHash || loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && status === 'checking' ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Download className="w-5 h-5" /> Decrypt & Download
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                         <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">File Hash to Share</label>
                            <input
                                type="text"
                                value={fileHash}
                                onChange={(e) => setFileHash(e.target.value)}
                                placeholder="Qm..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 font-mono text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Recipient Email</label>
                            <div className="relative">
                                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    value={shareEmail}
                                    onChange={(e) => setShareEmail(e.target.value)}
                                    placeholder="collaborator@example.com"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Target user will inherit the remaining file duration.
                            </p>
                        </div>

                        <button
                            onClick={handleShare}
                            disabled={!fileHash || !shareEmail || loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                             {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Share2 className="w-5 h-5" /> Grant On-Chain Access
                                </>
                            )}
                        </button>

                        {status === 'success' && shareLink && (
                             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 pt-6 border-t border-slate-800">
                                <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                                    <Link className="w-4 h-4 text-emerald-400" /> Shareable Link
                                </h4>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={shareLink}
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono"
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors flex items-center gap-2"
                                    >
                                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-3 text-center">
                                    Send this link to {shareEmail}. They must log in to access the file.
                                </p>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
