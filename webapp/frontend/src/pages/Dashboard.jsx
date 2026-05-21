import { useState, useEffect } from 'react'

const API = '/api'

export default function Dashboard() {
  const [alertStats, setAlertStats] = useState(null)
  const [modelInfo, setModelInfo] = useState(null)
  const [liveStatus, setLiveStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/alerts/stats`).then(r => r.json()),
      fetch(`${API}/models`).then(r => r.json()),
      fetch(`${API}/live/status`).then(r => r.json()),
    ]).then(([stats, models, live]) => {
      setAlertStats(stats)
      setModelInfo(models)
      setLiveStatus(live)
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{padding:20}}><div className="spinner" /></div>

  const s = alertStats || {}
  const livetext = liveStatus?.running ? 'Active' : 'Idle'

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value stat-accent">{s.total || 0}</div>
          <div className="stat-label">Total Alerts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value stat-green">{s.benign || 0}</div>
          <div className="stat-label">Benign</div>
        </div>
        <div className="stat-card">
          <div className="stat-value stat-red">{s.malicious || 0}</div>
          <div className="stat-label">Malicious</div>
        </div>
        <div className="stat-card">
          <div className="stat-value stat-yellow">{s.unknown || 0}</div>
          <div className="stat-label">Unknown / Zero-Day</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${liveStatus?.running ? 'stat-green' : 'stat-yellow'}`}>
            {livetext}
          </div>
          <div className="stat-label">Live Capture</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Attack Breakdown</div>
        {s.by_attack && Object.keys(s.by_attack).length > 0 ? (
          <table>
            <thead><tr><th>Attack Type</th><th>Count</th></tr></thead>
            <tbody>
              {Object.entries(s.by_attack).map(([k, v]) => (
                <tr key={k}>
                  <td><span className={`badge ${k === 'Unknown' ? 'badge-yellow' : k === 'N/A' ? 'badge-green' : 'badge-red'}`}>{k}</span></td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{color:'var(--text-dim)', fontSize:13}}>No alerts yet. Upload a PCAP or start live capture.</p>}
      </div>

      <div className="card">
        <div className="card-title">Model Configuration</div>
        {modelInfo && (
          <div style={{display:'flex', gap:40, fontSize:13}}>
            <div>
              <strong>Tier 1:</strong> {modelInfo.tier1?.model}<br />
              Threshold: {modelInfo.tier1?.threshold}<br />
              IsoForest: {modelInfo.tier1?.use_iforest ? 'Enabled' : 'Disabled'}
            </div>
            <div>
              <strong>Tier 2:</strong> {modelInfo.tier2?.model}<br />
              Classes: {(modelInfo.tier2?.classes || []).join(', ')}<br />
              Unknown threshold: {modelInfo.tier2?.unknown_threshold}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
