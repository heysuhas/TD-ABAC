import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Key, LogOut, FileText, Share2, Search, Clock, ShieldCheck } from 'lucide-react';
import { ethers } from 'ethers';

// Helper to generate deterministic wallet from Supabase user ID
const generateUserWallet = (email) => {
    const normalizedEmail = email.toLowerCase().trim();
    const hash = ethers.id("user_wallet_" + normalizedEmail + import.meta.env.VITE_SUPABASE_ANON_KEY);
    const wallet = new ethers.Wallet(hash);
    return wallet.address;
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [myFiles, setMyFiles] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndFiles = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const address = generateUserWallet(session.user.email);
        setWalletAddress(address);

        try {
            // Fetch owned files
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080/api';
            const resOwned = await fetch(`${backendUrl}/user/${address}/files`);
            if (resOwned.ok) {
                const ownedHashes = await resOwned.json();

                // Fetch metadata for each file
                const ownedWithMeta = await Promise.all(ownedHashes.map(async (hash) => {
                    const metaRes = await fetch(`${backendUrl}/files/${hash}/metadata`);
                    if(metaRes.ok) {
                        const meta = await metaRes.json();
                        return { hash, ...meta };
                    }
                    return { hash, filename: 'Unknown', contentType: 'Unknown', expiryTimestamp: 0 };
                }));
                setMyFiles(ownedWithMeta);
            }

            // Fetch shared files
            const resShared = await fetch(`${backendUrl}/user/${address}/shared-files`);
            if (resShared.ok) {
                const sharedHashes = await resShared.json();

                 // Fetch metadata for each shared file
                 const sharedWithMeta = await Promise.all(sharedHashes.map(async (hash) => {
                    const metaRes = await fetch(`${backendUrl}/files/${hash}/metadata`);
                    const shareInfoRes = await fetch(`${backendUrl}/files/${hash}/share-info?recipientAddress=${address}`);
                    
                    let meta = { filename: 'Unknown', contentType: 'Unknown', ownerAddress: '' };
                    let shareInfo = { expiryTime: 0, timeShared: 0, senderEmail: 'Unknown' };
                    
                    if(metaRes.ok) meta = await metaRes.json();
                    if(shareInfoRes.ok) shareInfo = await shareInfoRes.json();
                    
                    return { hash, ...meta, shareInfo };
                }));
                setSharedFiles(sharedWithMeta);
            }
        } catch (error) {
            console.error("Error fetching files:", error);
        }
      }
      setLoading(false);
    };

    fetchUserAndFiles();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const truncateHash = (hash) => {
    if(!hash) return '';
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  const [showExpiredOwned, setShowExpiredOwned] = useState(false);
  const [showExpiredShared, setShowExpiredShared] = useState(false);

  const now = Date.now();
  const activeOwnedFiles = myFiles.filter(f => !f.expiryTimestamp || f.expiryTimestamp > now);
  const expiredOwnedFiles = myFiles.filter(f => f.expiryTimestamp && f.expiryTimestamp <= now);

  const activeSharedFiles = sharedFiles.filter(f => !f.shareInfo?.expiryTime || f.shareInfo.expiryTime > now);
  const expiredSharedFiles = sharedFiles.filter(f => f.shareInfo?.expiryTime && f.shareInfo.expiryTime <= now);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <span className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-12 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              TD-ABAC Vault
            </h1>
            <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs text-slate-400 font-mono truncate max-w-[150px]">{walletAddress}</span>
            </div>
            <button
                onClick={() => navigate('/upload')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
                <Upload className="w-4 h-4" /> New Upload
            </button>
            <button
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                title="Sign Out"
            >
                <LogOut className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Files Section */}
        <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-200">
                    <FileText className="w-5 h-5 text-blue-400" /> My Vault
                </h2>
                <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-full">{activeOwnedFiles.length} Active</span>
            </div>

            {myFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Search className="w-12 h-12 mb-3 opacity-20" />
                    <p>No files uploaded yet.</p>
                </div>
            ) : (
                <>
                    <ul className="space-y-3">
                        {activeOwnedFiles.map((file, idx) => (
                            <motion.li
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                key={file.hash}
                                className="group flex items-center justify-between bg-slate-800/30 hover:bg-slate-800 border border-slate-700/30 p-4 rounded-2xl transition-all cursor-pointer"
                                onClick={() => navigate(`/access/${file.hash}`)}
                            >
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-200 truncate pr-4">{file.filename}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-slate-500 font-mono">{truncateHash(file.hash)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); navigate(`/access/${file.hash}?share=true`); }} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" title="Share">
                                        <Share2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.li>
                        ))}
                    </ul>

                    {expiredOwnedFiles.length > 0 && (
                        <div className="mt-6 border-t border-slate-800/50 pt-4">
                            <button 
                                onClick={() => setShowExpiredOwned(!showExpiredOwned)}
                                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors w-full"
                            >
                                <Clock className="w-4 h-4" /> 
                                {showExpiredOwned ? 'Hide' : 'Show'} Expired Files ({expiredOwnedFiles.length})
                            </button>
                            
                            {showExpiredOwned && (
                                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-3 mt-4 overflow-hidden">
                                    {expiredOwnedFiles.map((file, idx) => (
                                        <li
                                            key={file.hash}
                                            className="flex items-center justify-between bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl opacity-60 cursor-not-allowed"
                                        >
                                            <div className="flex items-center gap-4 overflow-hidden">
                                                <div className="w-10 h-10 rounded-lg bg-slate-800 text-slate-600 flex items-center justify-center shrink-0">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-400 line-through truncate pr-4">{file.filename}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className="text-xs text-red-400 font-mono">Expired on {new Date(file.expiryTimestamp).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </motion.ul>
                            )}
                        </div>
                    )}
                </>
            )}
        </section>

        {/* Shared With Me Section */}
        <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-sm">
             <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-200">
                    <Key className="w-5 h-5 text-emerald-400" /> Shared With Me
                </h2>
                <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-full">{activeSharedFiles.length} Active</span>
            </div>

            {sharedFiles.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Search className="w-12 h-12 mb-3 opacity-20" />
                    <p>No files shared with you.</p>
                </div>
            ) : (
                <>
                    <ul className="space-y-3">
                        {activeSharedFiles.map((file, idx) => (
                             <motion.li
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                key={file.hash}
                                className="group flex items-center justify-between bg-slate-800/30 hover:bg-slate-800 border border-slate-700/30 p-4 rounded-2xl transition-all cursor-pointer"
                                onClick={() => navigate(`/access/${file.hash}`)}
                            >
                                 <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        <Key className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-200 truncate pr-4">{file.filename}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-slate-500 font-mono">{file.shareInfo?.senderEmail}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.li>
                        ))}
                    </ul>

                    {expiredSharedFiles.length > 0 && (
                        <div className="mt-6 border-t border-slate-800/50 pt-4">
                            <button 
                                onClick={() => setShowExpiredShared(!showExpiredShared)}
                                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors w-full"
                            >
                                <Clock className="w-4 h-4" /> 
                                {showExpiredShared ? 'Hide' : 'Show'} Expired Shares ({expiredSharedFiles.length})
                            </button>
                            
                            {showExpiredShared && (
                                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-3 mt-4 overflow-hidden">
                                    {expiredSharedFiles.map((file, idx) => (
                                        <li
                                            key={file.hash}
                                            className="flex items-center justify-between bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl opacity-60 cursor-not-allowed"
                                        >
                                            <div className="flex items-center gap-4 overflow-hidden">
                                                <div className="w-10 h-10 rounded-lg bg-slate-800 text-slate-600 flex items-center justify-center shrink-0">
                                                    <Key className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-400 line-through truncate pr-4">{file.filename}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className="text-xs text-red-400 font-mono">Expired on {new Date(file.shareInfo.expiryTime).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </motion.ul>
                            )}
                        </div>
                    )}
                </>
            )}
        </section>
      </main>
    </div>
  );
}
