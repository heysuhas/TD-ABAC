import { useEffect, useState } from 'react'

export default function FileAccess() {
    const [fileHash, setFileHash] = useState('')
    const [downloadStatus, setDownloadStatus] = useState('idle')
    const [viewStatus, setViewStatus] = useState('idle')
    const [errorFragment, setErrorFragment] = useState(null)
    const [viewUrl, setViewUrl] = useState(null)
    const [viewContentType, setViewContentType] = useState('')
    const [viewFilename, setViewFilename] = useState('')

    useEffect(() => {
        return () => {
            if (viewUrl) {
                window.URL.revokeObjectURL(viewUrl)
            }
        }
    }, [viewUrl])

    const getFilenameFromDisposition = (disposition, fallbackName) => {
        if (disposition && disposition.indexOf('filename') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
            const matches = filenameRegex.exec(disposition)
            if (matches != null && matches[1]) {
                return matches[1].replace(/['"]/g, '')
            }
        }
        return fallbackName
    }

    const handleAccess = async (e) => {
        e.preventDefault()
        if (!fileHash) return
        setDownloadStatus('checking')
        setErrorFragment(null)

        try {
            const response = await fetch(`http://localhost:8080/api/access/${fileHash}`)

            if (response.ok) {
                // Try to get filename from content-disposition
                const disposition = response.headers.get('Content-Disposition')
                const filename = getFilenameFromDisposition(disposition, `secure-file-${fileHash}`)

                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = filename // Use dynamic filename
                document.body.appendChild(a)
                a.click()
                a.remove()
                setDownloadStatus('idle')
            } else {
                const errorText = await response.text()
                setDownloadStatus('error')
                setErrorFragment(errorText || "Access Denied: Time-Lock Expired on Blockchain")
            }
        } catch (err) {
            console.error(err)
            setDownloadStatus('error')
            setErrorFragment("Network Error: Could not reach backend")
        }
    }

    const handleView = async () => {
        if (!fileHash) return
        setViewStatus('checking')
        setErrorFragment(null)

        try {
            const tokenResponse = await fetch(`http://localhost:8080/api/files/${fileHash}/view-token`, {
                method: 'POST'
            })

            if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text()
                setViewStatus('error')
                setErrorFragment(errorText || "Access Denied: Time-Lock Expired on Blockchain")
                return
            }

            const tokenPayload = await tokenResponse.json()
            const token = tokenPayload.token

            const response = await fetch(`http://localhost:8080/api/files/${fileHash}/view?token=${encodeURIComponent(token)}`)

            if (response.ok) {
                const disposition = response.headers.get('Content-Disposition')
                const filename = getFilenameFromDisposition(disposition, `secure-file-${fileHash}`)
                const contentType = response.headers.get('Content-Type') || ''
                const blob = await response.blob()
                if (viewUrl) {
                    window.URL.revokeObjectURL(viewUrl)
                }
                const url = window.URL.createObjectURL(blob)
                setViewUrl(url)
                setViewContentType(contentType)
                setViewFilename(filename)
                setViewStatus('ready')
            } else {
                const errorText = await response.text()
                setViewStatus('error')
                setErrorFragment(errorText || "Access Denied: Time-Lock Expired on Blockchain")
            }
        } catch (err) {
            console.error(err)
            setViewStatus('error')
            setErrorFragment("Network Error: Could not reach backend")
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

                <div className="grid gap-3 sm:grid-cols-2">
                    <button
                        type="submit"
                        disabled={!fileHash || downloadStatus === 'checking'}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {downloadStatus === 'checking' ? 'Verifying Blockchain...' : 'Download'}
                    </button>
                    <button
                        type="button"
                        onClick={handleView}
                        disabled={!fileHash || viewStatus === 'checking'}
                        className="w-full bg-slate-900 border border-emerald-500/60 text-emerald-200 font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {viewStatus === 'checking' ? 'Preparing Viewer...' : 'View'}
                    </button>
                </div>
            </form>

            {viewUrl && (
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="text-sm text-slate-400">Viewing</p>
                            <p className="text-sm font-semibold text-white break-all">{viewFilename}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (viewUrl) {
                                    window.URL.revokeObjectURL(viewUrl)
                                }
                                setViewUrl(null)
                                setViewContentType('')
                                setViewFilename('')
                            }}
                            className="text-xs text-slate-300 border border-slate-600 rounded-full px-3 py-1 hover:border-slate-400"
                        >
                            Close
                        </button>
                    </div>
                    {viewContentType.startsWith('application/pdf') ? (
                        <iframe
                            title="Secure file preview"
                            src={viewUrl}
                            className="w-full h-96 rounded-lg border border-slate-700 bg-slate-950"
                        />
                    ) : viewContentType.startsWith('image/') ? (
                        <img src={viewUrl} alt={viewFilename} className="w-full max-h-96 object-contain rounded-lg border border-slate-700 bg-slate-950" />
                    ) : (
                        <p className="text-sm text-slate-400">
                            Preview unavailable for this file type. Use Download instead.
                        </p>
                    )}
                </div>
            )}

            {(downloadStatus === 'error' || viewStatus === 'error') && (
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
