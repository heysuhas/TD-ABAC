import { useState } from 'react'
import FileUpload from './components/FileUpload'
import FileAccess from './components/FileAccess'

function App() {
  const [activeTab, setActiveTab] = useState('upload')

  return (
    <div className="min-h-screen p-8 flex flex-col items-center bg-slate-900 text-white font-sans">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
          TD-ABAC Vault
        </h1>
        <p className="text-slate-400 text-lg">Self-Destructing Secure File Sharing</p>
      </header>

      <div className="flex gap-4 mb-8 bg-slate-800 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-8 py-3 rounded-lg font-medium transition-all duration-300 ${activeTab === 'upload' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          Upload Securely
        </button>
        <button
          onClick={() => setActiveTab('access')}
          className={`px-8 py-3 rounded-lg font-medium transition-all duration-300 ${activeTab === 'access' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          Access File
        </button>
      </div>

      <div className="w-full max-w-2xl bg-slate-800/50 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-700/50 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

        {activeTab === 'upload' ? <FileUpload /> : <FileAccess />}
      </div>

      <footer className="mt-12 text-slate-500 text-sm">
        Powered by Hybrid Blockchain & AES Cryptography
      </footer>
    </div>
  )
}

export default App
