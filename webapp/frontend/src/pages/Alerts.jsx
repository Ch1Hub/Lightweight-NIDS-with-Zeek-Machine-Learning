import { useState, useEffect } from 'react'

const API = '/api'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [attackFilter, setAttackFilter] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAlerts = () => {
    setLoading(true)
    const p = new URLSearchParams({page, per_page: 50})
    if (statusFilter) p.set('status', statusFilter)
    if (attackFilter) p.set('attack', attackFilter)
    if (search) p.set('search', search)

    fetch(`${API}/alerts?${p}`)
      .then(r => r.json())
      .then(d => {
        setAlerts(d.alerts || [])
        setTotal(d.total)
        setPages(d.pages)
        setLoading(false)
      })
  }

  useEffect(() => { fetchAlerts() }, [page, statusFilter, attackFilter])

  return (
    <div>
      <h1 className="page-title">Alert History</h1>

      <div className="card">
        <div className="toolbar">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="">All Status</option>
            <option value="benign">Benign</option>
            <option value="malicious">Malicious</option>
          </select>
          <select value={attackFilter} onChange={e => { setAttackFilter(e.target.value); setPage(1) }}>
            <option value="">All Attacks</option>
            <option value="N/A">N/A (Benign)</option>
            <option value="Unknown">Unknown</option>
            <option value="BruteForce">BruteForce</option>
            <option value="DoS">DoS</option>
            <option value="PortScan">PortScan</option>
          </select>
          <input placeholder="Search alerts..." value={search} onChange={e => setSearch(e.target.value)}
                 onKeyDown={e => { if (e.key === 'Enter') { setPage(1); fetchAlerts() } }}
                 style={{maxWidth:200}} />
          <button className="btn btn-secondary" onClick={() => { setPage(1); fetchAlerts() }}>Search</button>
          <span style={{color:'var(--text-dim)', fontSize:12}}>{total} alerts found</span>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{padding:20}}><div className="spinner" /></div>
        ) : alerts.length === 0 ? (
          <p style={{color:'var(--text-dim)', fontSize:13}}>No alerts found.</p>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Time</th><th>Status</th><th>Attack</th><th>Confidence</th><th>Source</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a, i) => (
                    <>
                      <tr key={i} onClick={() => setExpanded(expanded === i ? null : i)} style={{cursor:'pointer'}}>
                        <td style={{color:'var(--text-dim)', whiteSpace:'nowrap'}}>{a.timestamp?.slice(0,19)}</td>
                        <td><span className={`badge ${a.status === 'benign' ? 'badge-green' : 'badge-red'}`}>{a.status}</span></td>
                        <td><span className={`badge ${a.attack === 'Unknown' ? 'badge-yellow' : a.attack === 'N/A' ? 'badge-green' : 'badge-red'}`}>{a.attack}</span></td>
                        <td>{(a.confidence * 100).toFixed(1)}%</td>
                        <td style={{color:'var(--text-dim)'}}>{a.source}</td>
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
            {pages > 1 && (
              <div className="pagination">
                <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
                <span>Page {page} of {pages}</span>
                <button className="btn btn-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
