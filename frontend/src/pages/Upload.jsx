import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, X, CheckCircle2, Loader2, ArrowLeft, ShieldCheck, HardDrive, Link, Lock } from 'lucide-react';
import { ethers } from 'ethers';

const generateUserWallet = (email) => {
    const normalizedEmail = email.toLowerCase().trim();
    const hash = ethers.id("user_wallet_" + normalizedEmail + import.meta.env.VITE_SUPABASE_ANON_KEY);
    const wallet = new ethers.Wallet(hash);
    return wallet;
};

const STEPS = [
  { id: 'encrypt', label: 'AES-256 Encryption', icon: Lock },
  { id: 'ipfs', label: 'Uploading to IPFS', icon: HardDrive },
  { id: 'blockchain', label: 'Recording to Blockchain', icon: ShieldCheck },
];

export default function Upload() {
  const [file, setFile] = useState(null);
  const [duration, setDuration] = useState('');
  const [durationUnit, setDurationUnit] = useState('minutes');
  const [status, setStatus] = useState('idle'); // idle, uploading, complete, error
  const [currentStep, setCurrentStep] = useState(-1);
  const [resultHash, setResultHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [wallet, setWallet] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const userWallet = generateUserWallet(session.user.email);
        setWallet(userWallet);
        setWalletAddress(userWallet.address);
      }
    });
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const getDurationInSeconds = () => {
    const val = parseInt(duration);
    if (isNaN(val)) return 0;
    if (durationUnit === 'minutes') return val * 60;
    if (durationUnit === 'hours') return val * 3600;
    if (durationUnit === 'days') return val * 86400;
    return val;
  };

  const simulateStepDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleUpload = async () => {
    if (!file || !duration) return;

    setStatus('uploading');
    setErrorMsg('');
    setCurrentStep(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('duration', getDurationInSeconds());
    formData.append('userAddress', walletAddress);
    if (wallet) {
        formData.append('privateKey', wallet.privateKey);
    }

    try {
        // Step 1: Encryption (Simulated delay for visualizer before actual request)
        await simulateStepDelay(800);
        setCurrentStep(1); // IPFS

        // Step 2: Actually send to backend which does Encryption + IPFS + Blockchain
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080/api';

        // We start the backend request. While it's running, we simulate the UI steps progressing
        const uploadPromise = fetch(`${backendUrl}/upload`, {
            method: 'POST',
            body: formData,
        });

        // Wait a bit to show IPFS step
        await simulateStepDelay(1200);
        setCurrentStep(2); // Blockchain

        const response = await uploadPromise;

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const data = await response.json();

        // Ensure final step completes
        await simulateStepDelay(800);
        setCurrentStep(3); // All done

        setResultHash(data.fileHash);
        setStatus('complete');
    } catch (err) {
        console.error(err);
        setErrorMsg(err.message || 'An error occurred during upload');
        setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6">
       <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
      >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Vault
      </button>

      <div className="max-w-3xl mx-auto bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden">

        {/* Progress Visualizer Background Glow */}
        {status === 'uploading' && (
             <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: `${(currentStep / 3) * 100}%` }}
                    className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                />
            </div>
        )}

        <div className="text-center mb-10">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
                Secure File Upload
            </h1>
            <p className="text-slate-400">Upload and configure time-decaying access</p>
        </div>

        {status === 'idle' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

            {/* File Dropzone */}
            <div
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${file ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700 hover:border-slate-500 bg-slate-800/20'}`}
            >
                <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="fileInput"
                />
                <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center">
                    {file ? (
                        <>
                            <File className="w-12 h-12 text-blue-400 mb-4" />
                            <p className="text-lg font-medium text-slate-200">{file.name}</p>
                            <p className="text-sm text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            <button
                                onClick={(e) => { e.preventDefault(); setFile(null); }}
                                className="mt-4 text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded-full bg-red-400/10 flex items-center gap-1"
                            >
                                <X className="w-3 h-3" /> Remove
                            </button>
                        </>
                    ) : (
                        <>
                            <UploadCloud className="w-12 h-12 text-slate-500 mb-4 group-hover:text-blue-400 transition-colors" />
                            <p className="text-lg font-medium text-slate-300">Click to select a file</p>
                            <p className="text-sm text-slate-500 mt-2">Any file type up to 50MB</p>
                        </>
                    )}
                </label>
            </div>

            {/* Duration Config */}
            <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50">
                <label className="block text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" /> Access Duration
                </label>
                <div className="flex gap-4">
                    <input
                        type="number"
                        min="1"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="e.g. 10"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <select
                        value={durationUnit}
                        onChange={(e) => setDurationUnit(e.target.value)}
                        className="w-32 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                    >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                    </select>
                </div>
                <p className="text-xs text-slate-500 mt-3">After this duration, the file automatically self-destructs on the blockchain.</p>
            </div>

            <button
                onClick={handleUpload}
                disabled={!file || !duration}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
            >
                Encrypt & Upload
            </button>

            {errorMsg && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{errorMsg}</p>}

          </motion.div>
        )}

        {status === 'uploading' && (
            <div className="py-12 px-6">
                <div className="space-y-8">
                    {STEPS.map((step, index) => {
                        const isPast = currentStep > index;
                        const isCurrent = currentStep === index;
                        const StepIcon = step.icon;

                        return (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0.3, x: -20 }}
                                animate={{
                                    opacity: isPast || isCurrent ? 1 : 0.3,
                                    x: 0,
                                    scale: isCurrent ? 1.05 : 1
                                }}
                                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                                    isCurrent ? 'bg-blue-500/10 border-blue-500/30' :
                                    isPast ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-transparent border-slate-800'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                                    isCurrent ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' :
                                    isPast ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                                }`}>
                                    {isPast ? <CheckCircle2 className="w-6 h-6" /> :
                                     isCurrent ? <Loader2 className="w-6 h-6 animate-spin" /> :
                                     <StepIcon className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className={`font-medium ${isCurrent ? 'text-blue-400' : isPast ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        {step.label}
                                    </h3>
                                    {isCurrent && <p className="text-sm text-slate-400 mt-1 animate-pulse">Processing...</p>}
                                    {isPast && <p className="text-sm text-slate-400 mt-1">Complete</p>}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        )}

        {status === 'complete' && (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
            >
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Upload Successful!</h2>
                <p className="text-slate-400 mb-8">Your file is encrypted and secured on the blockchain.</p>

                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-8 flex items-center gap-3 text-left">
                    <Link className="w-5 h-5 text-slate-500 shrink-0" />
                    <div className="overflow-hidden">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">File Hash</p>
                        <p className="text-sm text-slate-300 font-mono truncate">{resultHash}</p>
                    </div>
                </div>

                <div className="flex gap-4 justify-center">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                    >
                        Go to Dashboard
                    </button>
                    <button
                        onClick={() => navigate(`/access/${resultHash}?share=true`)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
                    >
                        Share File
                    </button>
                </div>
            </motion.div>
        )}

      </div>
    </div>
  );
}
