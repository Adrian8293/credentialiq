import { useState, useMemo } from 'react'
import { PAYER_REQUIREMENTS } from '../constants/stages.js'
import { daysUntil, fmtDate, pName } from '../lib/helpers.js'

// Document requirement status
const STATUS = {
  READY: 'ready',
  EXPIRED: 'expired',
  MISSING: 'missing',
  EXPIRING: 'expiring',
}

const STATUS_CONFIG = {
  [STATUS.READY]: { label: 'Ready', color: 'var(--success)', bg: 'rgba(16,185,129,.08)', icon: '✓' },
  [STATUS.EXPIRED]: { label: 'Expired', color: 'var(--danger)', bg: 'rgba(239,68,68,.08)', icon: '✗' },
  [STATUS.MISSING]: { label: 'Missing', color: 'var(--warning)', bg: 'rgba(245,158,11,.08)', icon: '!' },
  [STATUS.EXPIRING]: { label: 'Expiring Soon', color: 'var(--warning)', bg: 'rgba(245,158,11,.08)', icon: '⚠' },
}

// Map payer requirements to provider fields and document types
const REQUIREMENT_MAPPING = {
  'CAQH Profile': { providerField: 'caqhDue', docType: null, label: 'CAQH Attestation' },
  'CAQH Profile (must be current)': { providerField: 'caqhDue', docType: null, label: 'CAQH Attestation' },
  'W-9 Form': { providerField: null, docType: 'w9', label: 'W-9' },
  'Current CV/Resume': { providerField: null, docType: 'cv', label: 'CV/Resume' },
  'CV/Resume': { providerField: null, docType: 'cv', label: 'CV/Resume' },
  'Copy of License': { providerField: 'licenseExp', docType: 'license', label: 'Professional License' },
  'License Copy': { providerField: 'licenseExp', docType: 'license', label: 'Professional License' },
  'Malpractice Insurance Certificate': { providerField: 'malExp', docType: 'malpractice', label: 'Malpractice Insurance' },
  'DEA Certificate (if applicable)': { providerField: 'deaExp', docType: 'dea', label: 'DEA Certificate' },
  'DEA Certificate': { providerField: 'deaExp', docType: 'dea', label: 'DEA Certificate' },
  'NPI Type 1': { providerField: 'npi', docType: 'npi', label: 'NPI Type 1' },
  'NPI Type 1 & Type 2': { providerField: 'npi', docType: 'npi', label: 'NPI Type 1 & 2' },
  'Board Certification': { providerField: null, docType: 'board_cert', label: 'Board Certification' },
  'Board Certification (if applicable)': { providerField: null, docType: 'board_cert', label: 'Board Certification' },
  'Background Check': { providerField: null, docType: 'background', label: 'Background Check' },
  'Background Check Authorization': { providerField: null, docType: 'background', label: 'Background Check' },
}

function getRequirementStatus(requirement, provider, documents) {
  const mapping = REQUIREMENT_MAPPING[requirement]
  
  // Check provider field first (for dated credentials)
  if (mapping?.providerField && provider[mapping.providerField]) {
    const days = daysUntil(provider[mapping.providerField])
    if (days === null) return STATUS.READY
    if (days < 0) return STATUS.EXPIRED
    if (days <= 30) return STATUS.EXPIRING
    return STATUS.READY
  }
  
  // Check for NPI (no expiration)
  if (requirement.includes('NPI') && provider.npi) {
    return STATUS.READY
  }
  
  // Check if document exists
  if (mapping?.docType) {
    const doc = documents.find(d => 
      d.provId === provider.id && 
      (d.type?.toLowerCase().includes(mapping.docType) || 
       d.type?.toLowerCase().includes(mapping.label.toLowerCase()))
    )
    if (doc) {
      const days = daysUntil(doc.exp)
      if (days === null) return STATUS.READY
      if (days < 0) return STATUS.EXPIRED
      if (days <= 30) return STATUS.EXPIRING
      return STATUS.READY
    }
  }
  
  return STATUS.MISSING
}

export function PayerPacketGenerator({ db, selectedProvider, selectedPayer, onStartEnrollment, onUploadDocument }) {
  const [showAllPayers, setShowAllPayers] = useState(false)
  const [expandedPayer, setExpandedPayer] = useState(selectedPayer || null)

  const provider = db.providers.find(p => p.id === selectedProvider)
  
  // Get all payers with requirements
  const payersWithRequirements = useMemo(() => {
    return Object.entries(PAYER_REQUIREMENTS)
      .map(([name, config]) => {
        const requirements = (config.requirements || []).map(req => ({
          name: req,
          status: provider ? getRequirementStatus(req, provider, db.documents) : STATUS.MISSING,
          mapping: REQUIREMENT_MAPPING[req],
        }))
        
        const readyCount = requirements.filter(r => r.status === STATUS.READY).length
        const total = requirements.length
        const readiness = total > 0 ? Math.round((readyCount / total) * 100) : 0
        
        return {
          name,
          ...config,
          requirements,
          readiness,
          readyCount,
          total,
        }
      })
      .sort((a, b) => b.readiness - a.readiness)
  }, [provider, db.documents])

  const displayedPayers = showAllPayers ? payersWithRequirements : payersWithRequirements.slice(0, 8)

  if (!provider) {
    return (
      <div className="card">
        <div className="card-header">
          <h3>Payer Application Packet Generator</h3>
        </div>
        <div className="card-body">
          <div className="empty-state">
            <div className="ei">📋</div>
            <h4>Select a Provider</h4>
            <p>Choose a provider to see their enrollment readiness for each payer.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="payer-packet-generator">
      {/* Provider summary header */}
      <div className="card mb-16">
        <div className="card-body" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--pr-l)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--pr)',
              }}>
                {provider.fname?.[0]}{provider.lname?.[0]}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>
                  {provider.fname} {provider.lname}{provider.cred ? `, ${provider.cred}` : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {provider.spec} • NPI: {provider.npi || 'Not set'}
                </div>
              </div>
            </div>
            
            {/* Quick credential status */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <CredentialChip 
                label="License" 
                date={provider.licenseExp} 
              />
              <CredentialChip 
                label="Malpractice" 
                date={provider.malExp} 
              />
              <CredentialChip 
                label="CAQH" 
                date={provider.caqhDue} 
              />
              {provider.deaExp && (
                <CredentialChip 
                  label="DEA" 
                  date={provider.deaExp} 
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payer readiness grid */}
      <div className="card">
        <div className="card-header">
          <h3>Enrollment Readiness by Payer</h3>
          <span className="badge b-blue">{payersWithRequirements.length} payers</span>
        </div>
        <div className="card-body" style={{ padding: '8px 16px' }}>
          {displayedPayers.map((payer, idx) => (
            <PayerRequirementRow
              key={payer.name}
              payer={payer}
              isExpanded={expandedPayer === payer.name}
              onToggle={() => setExpandedPayer(expandedPayer === payer.name ? null : payer.name)}
              onStartEnrollment={() => onStartEnrollment?.(payer)}
              onUploadDocument={(req) => onUploadDocument?.(provider, req)}
              isLast={idx === displayedPayers.length - 1}
            />
          ))}
          
          {!showAllPayers && payersWithRequirements.length > 8 && (
            <button
              className="btn btn-sm"
              style={{ width: '100%', marginTop: 12 }}
              onClick={() => setShowAllPayers(true)}
            >
              Show {payersWithRequirements.length - 8} more payers
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CredentialChip({ label, date }) {
  const days = daysUntil(date)
  let status = 'ready'
  let statusText = 'Valid'
  
  if (!date) {
    status = 'missing'
    statusText = 'Not set'
  } else if (days !== null) {
    if (days < 0) {
      status = 'expired'
      statusText = 'Expired'
    } else if (days <= 30) {
      status = 'expiring'
      statusText = `${days}d left`
    } else {
      statusText = fmtDate(date)
    }
  }

  const colors = {
    ready: { bg: 'rgba(16,185,129,.1)', border: 'rgba(16,185,129,.2)', text: 'var(--success)' },
    expired: { bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.2)', text: 'var(--danger)' },
    expiring: { bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.2)', text: 'var(--warning)' },
    missing: { bg: 'var(--elevated)', border: 'var(--border)', text: 'var(--text-3)' },
  }
  
  const c = colors[status]

  return (
    <div style={{
      padding: '4px 10px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 'var(--r)',
      fontSize: 11,
      fontWeight: 500,
    }}>
      <span style={{ color: 'var(--text-2)' }}>{label}:</span>{' '}
      <span style={{ color: c.text, fontWeight: 600 }}>{statusText}</span>
    </div>
  )
}

function PayerRequirementRow({ payer, isExpanded, onToggle, onStartEnrollment, onUploadDocument, isLast }) {
  const readinessColor = payer.readiness >= 80 ? 'var(--success)' : 
                         payer.readiness >= 50 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-l)' }}>
      {/* Summary row */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 4px',
          cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        {/* Payer color indicator */}
        <div style={{
          width: 4,
          height: 32,
          borderRadius: 2,
          background: payer.color || 'var(--pr)',
          flexShrink: 0,
        }} />
        
        {/* Payer name and type */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontSize: 13, 
            fontWeight: 600, 
            color: 'var(--text-1)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {payer.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {payer.type} • {payer.timeline || 'Timeline varies'}
          </div>
        </div>
        
        {/* Readiness bar */}
        <div style={{ width: 80, flexShrink: 0 }}>
          <div style={{ 
            height: 6, 
            background: 'var(--elevated)', 
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${payer.readiness}%`,
              background: readinessColor,
              borderRadius: 3,
              transition: 'width .3s ease',
            }} />
          </div>
          <div style={{ fontSize: 10, color: readinessColor, fontWeight: 600, textAlign: 'center', marginTop: 2 }}>
            {payer.readiness}%
          </div>
        </div>

        {/* Status badge */}
        <span 
          className={`badge ${payer.readiness >= 80 ? 'b-green' : payer.readiness >= 50 ? 'b-amber' : 'b-red'}`}
          style={{ fontSize: 10, flexShrink: 0 }}
        >
          {payer.readyCount}/{payer.total}
        </span>
        
        {/* Expand indicator */}
        <div style={{ 
          color: 'var(--text-3)', 
          fontSize: 12,
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform .2s ease',
        }}>
          ▼
        </div>
      </div>

      {/* Expanded requirements */}
      {isExpanded && (
        <div style={{
          padding: '0 4px 16px 20px',
          animation: 'fadeIn .2s ease',
        }}>
          {/* Portal link */}
          {payer.portalUrl && (
            <div style={{ marginBottom: 12 }}>
              <a 
                href={payer.portalUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  fontSize: 12, 
                  color: 'var(--pr)', 
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                Open {payer.name} Portal →
              </a>
            </div>
          )}

          {/* Notes */}
          {payer.notes && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--pr-l)',
              border: '1px solid rgba(59,130,246,.2)',
              borderRadius: 'var(--r)',
              fontSize: 11,
              color: 'var(--pr)',
              marginBottom: 12,
              lineHeight: 1.5,
            }}>
              {payer.notes}
            </div>
          )}

          {/* Requirements checklist */}
          <div style={{ marginBottom: 12 }}>
            {payer.requirements.map((req, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 0',
                  borderBottom: idx < payer.requirements.length - 1 ? '1px solid var(--border-l)' : 'none',
                }}
              >
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: STATUS_CONFIG[req.status].bg,
                  color: STATUS_CONFIG[req.status].color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {STATUS_CONFIG[req.status].icon}
                </div>
                <span style={{ 
                  flex: 1, 
                  fontSize: 12, 
                  color: req.status === STATUS.READY ? 'var(--text-2)' : 'var(--text-1)',
                  fontWeight: req.status === STATUS.READY ? 400 : 500,
                }}>
                  {req.name}
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: STATUS_CONFIG[req.status].color,
                }}>
                  {STATUS_CONFIG[req.status].label}
                </span>
                {req.status !== STATUS.READY && onUploadDocument && (
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: 10, padding: '2px 8px' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onUploadDocument(req)
                    }}
                  >
                    Upload
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {payer.readiness >= 80 && (
              <button
                className="btn btn-primary btn-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onStartEnrollment()
                }}
              >
                Start Enrollment
              </button>
            )}
            <button
              className="btn btn-sm"
              onClick={(e) => {
                e.stopPropagation()
                // Could open a detailed view or print packet
              }}
            >
              View Full Checklist
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PayerPacketGenerator
