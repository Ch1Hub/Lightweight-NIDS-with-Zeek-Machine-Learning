import { useState } from 'react'

const API = '/api'

export default function OfflineAnalysis() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [job, setJob] = useState(null)
  const [results, setResults] = useState(null)
  const [expanded, setExpanded] = useState(null)

  const handleFile = (e) => setFile(e.target.files[0])

  const upload = async () => {
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('pcap', file)

    const res = await fetch(`${API}/offline/upload`, { method: 'POST', body: fd })
    const data = await res.json()
    setJob(data)
    setUploading(false)
    pollJob(data.job_id)
  }

  const pollJob = (jobId) => {
    const ival = setInterval(async () => {
      const r = await fetch(`${API}/offline/status/${jobId}`)
      const d = await r.json()
      if (d.status === 'completed' || d.status === 'failed') {
        clearInterval(ival)
        if (d.status === 'completed') {
          const rr = await fetch(`${API}/offline/results/${jobId}`)
          setResults(await rr.json())
          setJob(d)
        } else {
          setJob({ status: 'failed', error: 'Processing failed' })
        }
      }
      setJob(d)
    }, 1000)
  }

  const s = results?.summary
  const alerts = results?.results || []

  return (
    <div>
      <h1 className="page-title">Offline Analysis</h1>

      <div className="card">
        <div className="card-title">Upload PCAP File</div>
        <div
          className="upload-zone"
          onClick={() => document.getElementById('pcap-input').click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0]) }}
        >
          <div className="icon">{file ? '📁' : '⬆'}</div>
          <p>{file ? file.name : 'Click or drag a .pcap / .pcapng file here'}</p>
        </div>
        <input id="pcap-input" type="file" accept=".pcap,.pcapng" onChange={handleFile} style={{display:'none'}} />
        {file && (
          <div style={{marginTop:14}}>
            <button className="btn btn-primary" onClick={upload} disabled={uploading}>
              {uploading ? <><span className="spinner" /> Processing...</> : 'Analyze PCAP'}
            </button>
          </div>
        )}
      </div>

      {job && job.status === 'processing' && (
        <div className="card">
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <div className="spinner" /> <span style={{fontSize:13}}>Analyzing PCAP... Zeek extraction + ML inference running.</span>
          </div>
        </div>
      )}

      {s && (
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value stat-accent">{s.total}</div><div className="stat-label">Total Flows</div></div>
          <div className="stat-card"><div className="stat-value stat-green">{s.benign}</div><div className="stat-label">Benign</div></div>
          <div className="stat-card"><div className="stat-value stat-red">{s.malicious}</div><div className="stat-label">Malicious</div></div>
          <div className="stat-card"><div className="stat-value stat-yellow">{s.unknown}</div><div className="stat-label">Unknown</div></div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="card">
          <div className="card-title">Results ({alerts.length} records)</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Status</th><th>Attack</th><th>Confidence</th><th>Timestamp</th><th></th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a, i) => (
                  <>
                    <tr key={i} onClick={() => setExpanded(expanded === i ? null : i)} style={{cursor:'pointer'}}>
                      <td style={{color:'var(--text-dim)'}}>{a.window_id || i + 1}</td>
                      <td>
                        <span className={`badge ${a.status === 'benign' ? 'badge-green' : 'badge-red'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${a.attack === 'Unknown' ? 'badge-yellow' : a.attack === 'N/A' ? 'badge-green' : 'badge-red'}`}>
                          {a.attack}
                        </span>
                      </td>
                      <td>{(a.confidence * 100).toFixed(1)}%</td>
                      <td style={{color:'var(--text-dim)'}}>{a.timestamp?.slice(0,19)}</td>
                      <td style={{color:'var(--text-dim)'}}>{expanded === i ? '▾' : '▸'}</td>
                    </tr>
                    {expanded === i && (
                      <tr key={`d-${i}`}>
                        <td colSpan={6} className="result-detail">
                          <pre>{JSON.stringify(a, null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
