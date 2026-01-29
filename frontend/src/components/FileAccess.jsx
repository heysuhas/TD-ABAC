import { useState } from 'react'

export default function FileAccess() {
    const [fileHash, setFileHash] = useState('')
    const [status, setStatus] = useState('idle')
    const [errorFragment, setErrorFragment] = useState(null)

    const handleAccess = async (e) => {
        e.preventDefault()
        if (!fileHash) return
        setStatus('checking')
        setErrorFragment(null)

        try {
            const response = await fetch(`http://localhost:8080/api/access/${fileHash}`);

            if (response.ok) {
                // Try to get filename from content-disposition
                const disposition = response.headers.get('Content-Disposition');
                let filename = `secure-file-${fileHash}`;

                if (disposition && disposition.indexOf('attachment') !== -1) {
                    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1]) {
                        filename = matches[1].replace(/['"]/g, '');
                    }
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename; // Use dynamic filename
                document.body.appendChild(a);
                a.click();
                a.remove();
                setStatus('idle');
            } else {
                const errorText = await response.text();
                setStatus('error');
                setErrorFragment(errorText || "Access Denied: Time-Lock Expired on Blockchain");
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
            setErrorFragment("Network Error: Could not reach backend");
        }
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">Access File</h2>
                <p className="text-slate-400">Retrieve data if permission is still valid</p>
            </div>

            <form onSubmit={handleAccess} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">File Hash / ID</label>
                    <input
                        type="text"
                        value={fileHash}
                        onChange={(e) => setFileHash(e.target.value)}
                        placeholder="Qm..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    />
                </div>

                <button
                    type="submit"
                    disabled={!fileHash || status === 'checking'}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {status === 'checking' ? 'Verifying Blockchain...' : 'Request Access'}
                </button>
            </form>

            {status === 'error' && (
                <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl mt-4 flex items-start gap-3">
                    <svg className="w-6 h-6 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <div>
                        <h3 className="text-red-400 font-bold mb-1">Access Denied</h3>
                        <p className="text-sm text-red-200">{errorFragment}</p>
                    </div>
                </div>
            )}
        </div>
    )
}
