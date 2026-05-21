import { useState, useEffect, useCallback } from 'react'

const API = '/api'

export default function LiveCapture() {
  const [running, setRunning] = useState(false)
  const [interfaceName, setInterfaceName] = useState('lo')
  const [pid, setPid] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [error, setError] = useState('')

  const checkStatus = useCallback(async () => {
    const r = await fetch(`${API}/live/status`)
    const d = await r.json()
    setRunning(d.running)
    setPid(d.pid)
  }, [])

  useEffect(() => { checkStatus() }, [checkStatus])

  useEffect(() => {
    if (!running) return
    const iv = setInterval(async () => {
      const r = await fetch(`${API}/alerts?per_page=10`)
      const d = await r.json()
      setAlerts(d.alerts || [])
    }, 3000)
    return () => clearInterval(iv)
  }, [running])

  const start = async () => {
    setError('')
    const r = await fetch(`${API}/live/start`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({interface: interfaceName})
    })
    const d = await r.json()
    if (d.error) setError(d.error)
    else checkStatus()
  }

  const stop = async () => {
    await fetch(`${API}/live/stop`, {method: 'POST'})
    checkStatus()
  }

  return (
    <div>
      <h1 className="page-title">Live Capture</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-title">Capture Control</div>
        <div className="form-group">
          <label className="form-label">Network Interface</label>
          <div className="toolbar">
            <input value={interfaceName} onChange={e => setInterfaceName(e.target.value)}
                   placeholder="e.g. eth0, lo" disabled={running} style={{maxWidth:200}} />
            {!running ? (
              <button className="btn btn-primary" onClick={start}>Start Capture</button>
            ) : (
              <button className="btn btn-danger" onClick={stop}>Stop Capture</button>
            )}
          </div>
        </div>
        <div style={{fontSize:13, marginTop:8}}>
          Status:{' '}
          <span className={`badge ${running ? 'badge-green' : 'badge-yellow'}`}>
            {running ? `Running (PID ${pid})` : 'Idle'}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Live Alert Stream</div>
        {alerts.length === 0 ? (
          <p style={{color:'var(--text-dim)', fontSize:13}}>
            {running ? 'Waiting for traffic...' : 'Start capture to see live alerts.'}
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>#</th><th>Status</th><th>Attack</th><th>Confidence</th><th>Time</th></tr>
              </thead>
              <tbody>
                {alerts.map((a, i) => (
                  <tr key={i}>
                    <td style={{color:'var(--text-dim)'}}>{a.window_id || i+1}</td>
                    <td><span className={`badge ${a.status === 'benign' ? 'badge-green' : 'badge-red'}`}>{a.status}</span></td>
                    <td><span className={`badge ${a.attack === 'Unknown' ? 'badge-yellow' : a.attack === 'N/A' ? 'badge-green' : 'badge-red'}`}>{a.attack}</span></td>
                    <td>{(a.confidence * 100).toFixed(1)}%</td>
                    <td style={{color:'var(--text-dim)'}}>{a.timestamp?.slice(11,19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
