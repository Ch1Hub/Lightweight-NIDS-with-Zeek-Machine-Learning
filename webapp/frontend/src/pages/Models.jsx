import { useState, useEffect } from 'react'

const API = '/api'

export default function Models() {
  const [info, setInfo] = useState(null)
  const [selectedShap, setSelectedShap] = useState(null)

  useEffect(() => {
    fetch(`${API}/models`).then(r => r.json()).then(setInfo)
  }, [])

  if (!info) return <div style={{padding:20}}><div className="spinner" /></div>

  return (
    <div>
      <h1 className="page-title">Model Info</h1>

      <div className="card">
        <div className="card-title">Tier 1 — Binary Classifier</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, fontSize:13}}>
          <div><strong>Model:</strong> {info.tier1?.model}</div>
          <div><strong>Threshold:</strong> {info.tier1?.threshold}</div>
          <div><strong>IsoForest:</strong> {info.tier1?.use_iforest ? 'Enabled' : 'Disabled'}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Tier 2 — Multi-class Attack Classifier</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, fontSize:13}}>
          <div><strong>Model:</strong> {info.tier2?.model}</div>
          <div><strong>Unknown Threshold:</strong> {info.tier2?.unknown_threshold}</div>
          <div><strong>Known Classes:</strong> {(info.tier2?.classes || []).join(', ')}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">SHAP Explainability</div>
        <div className="toolbar">
          <button className="btn btn-secondary" onClick={() => setSelectedShap('tier1')}>Tier 1 SHAP</button>
          <button className="btn btn-secondary" onClick={() => setSelectedShap('tier2')}>Tier 2 SHAP</button>
        </div>
        {selectedShap && (
          <div style={{marginTop:12}}>
            <img src={`${API}/models/shap/${selectedShap}`} alt={`${selectedShap} SHAP`} className="shap-img"
                 onError={(e) => { e.target.style.display = 'none' }} />
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Model Files ({info.files?.length || 0} total)</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 20px', fontSize:12, color:'var(--text-dim)'}}>
          {info.files?.map(f => <div key={f}>📄 {f}</div>)}
        </div>
      </div>
    </div>
  )
}
