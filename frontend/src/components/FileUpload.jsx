import { useState } from 'react'

export default function FileUpload() {
    const [file, setFile] = useState(null)
    const [duration, setDuration] = useState(60) // Default 60 seconds
    const [status, setStatus] = useState('idle') // idle, uploading, success, error
    const [result, setResult] = useState(null)

    const handleUpload = async (e) => {
        e.preventDefault()
        if (!file) return

        setStatus('uploading')

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("duration", duration);

            const response = await fetch('http://localhost:8080/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();

            setStatus('success')
            setResult({
                fileHash: data.fileHash,
                expiry: data.expiry
            })
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Secure Upload</h2>
                <p className="text-slate-400">Encrypt and share with a self-destruct timer</p>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
                <div className="group relative border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-slate-800/50 hover:bg-slate-800"
                    onClick={() => document.getElementById('file-input').click()}>
                    <input
                        id="file-input"
                        type="file"
                        className="hidden"
                        onChange={(e) => setFile(e.target.files[0])}
                    />
                    <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        <span className="text-lg font-medium text-slate-300 group-hover:text-white">
                            {file ? file.name : "Click to select a file"}
                        </span>
                        <span className="text-sm text-slate-500">AES-256 Encrypted Client-Side</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Duration (Seconds)</label>
                    <input
                        type="number"
                        min="1"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <button
                    type="submit"
                    disabled={!file || status === 'uploading'}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {status === 'uploading' ? 'Encrypting & Uploading...' : 'Secure Upload'}
                </button>
            </form>

            {status === 'success' && result && (
                <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl mt-4">
                    <h3 className="text-emerald-400 font-bold mb-2">Upload Successful!</h3>
                    <p className="text-sm text-slate-300 break-all"><span className="text-slate-500">File Hash:</span> {result.fileHash}</p>
                    <p className="text-sm text-slate-300"><span className="text-slate-500">Expires At:</span> {result.expiry}</p>
                </div>
            )}
        </div>
    )
}
