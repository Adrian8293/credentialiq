// ProvidersPage — Table view + Enrollment Kanban view
// Kanban now uses the real EnrollmentKanban (drag-drop, follow-up badges, filters)
// The fake KanbanBoard (provider-status-only, no drag) has been removed.

import { useState } from 'react'
import { Providers } from './index.jsx'
import EnrollmentKanban from '../../components/EnrollmentKanban'

export function ProvidersPage({
  db,
  provSearch, setProvSearch,
  provFStatus, setProvFStatus,
  provFSpec, setProvFSpec,
  openProvDetail, editProvider,
  setPage, setProvForm, setEditingId,
  setNpiInput, setNpiResult,
  syncFromNPPES,
  provForm, editingId,
  npiInput, npiResult, npiLoading,
  lookupNPI, handleSaveProvider,
  handleDeleteProvider,
  handlePhotoUpload, handleDeletePhoto,
  photoUploading, saving,
  // These are passed from index.js for the kanban drag-drop to work
  onStageChange, openEnrollModal,
}) {
  const [view, setView] = useState('table')
  const [tableTab, setTableTab] = useState('all')

  const TABLE_TABS = [
    { id: 'all',        label: 'All Providers' },
    { id: 'onboarding', label: 'Onboarding' },
    { id: 'active',     label: 'Active' },
    { id: 'inactive',   label: 'Inactive' },
  ]

  const tabFilteredStatus = tableTab === 'all' ? '' : tableTab === 'onboarding' ? 'Pending' : tableTab === 'active' ? 'Active' : 'Inactive'
  const effectiveStatus = tableTab === 'all' ? provFStatus : tabFilteredStatus

  function handleAddProvider() {
    setProvForm({})
    setEditingId(e => ({ ...e, provider: null }))
    setNpiInput('')
    setNpiResult(null)
    setPage('add-provider')
  }

  return (
    <div className="page">

      {/* ── Page header with view toggle ── */}
      <div className="page-header" style={{ marginBottom: 14 }}>
        <div className="page-header-left">
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>
            {db.providers.length} providers · {db.providers.filter(p => p.status === 'Active').length} active
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', background: 'var(--card)' }}>
            <button
              onClick={() => setView('table')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: view === 'table' ? 'var(--navy)' : 'transparent', color: view === 'table' ? '#fff' : 'var(--text-3)', transition: 'all var(--t)' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="1" width="10" height="3" rx="1"/><rect x="1" y="5" width="10" height="3" rx="1"/><rect x="1" y="9" width="10" height="2" rx="1"/></svg>
              Table
            </button>
            <button
              onClick={() => setView('kanban')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: view === 'kanban' ? 'var(--navy)' : 'transparent', color: view === 'kanban' ? '#fff' : 'var(--text-3)', transition: 'all var(--t)' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="1" width="3" height="10" rx="1"/><rect x="4.5" y="1" width="3" height="7" rx="1"/><rect x="8" y="1" width="3" height="8.5" rx="1"/></svg>
              Kanban
            </button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleAddProvider}>+ Add Provider</button>
        </div>
      </div>

      {/* ── TABLE VIEW ── */}
      {view === 'table' && (
        <>
          <div className="tabs" style={{ marginBottom: 12 }}>
            {TABLE_TABS.map(t => (
              <div key={t.id} className={`tab${tableTab === t.id ? ' active' : ''}`} onClick={() => setTableTab(t.id)}>
                {t.label}
                <span style={{ marginLeft: 5, background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 9, padding: '1px 6px', fontSize: 10, fontWeight: 600, color: 'var(--text-3)' }}>
                  {t.id === 'all'        ? db.providers.length
                  : t.id === 'onboarding' ? db.providers.filter(p => p.status === 'Pending').length
                  : t.id === 'active'     ? db.providers.filter(p => p.status === 'Active').length
                  :                         db.providers.filter(p => p.status === 'Inactive').length}
                </span>
              </div>
            ))}
          </div>
          <Providers
            db={db}
            search={provSearch} setSearch={setProvSearch}
            fStatus={effectiveStatus} setFStatus={setProvFStatus}
            fSpec={provFSpec} setFSpec={setProvFSpec}
            openProvDetail={openProvDetail}
            editProvider={editProvider}
            setPage={setPage}
            setProvForm={setProvForm}
            setEditingId={setEditingId}
            setNpiInput={setNpiInput}
            setNpiResult={setNpiResult}
            syncFromNPPES={syncFromNPPES}
            hideAddBtn
          />
        </>
      )}

      {/* ── KANBAN VIEW — real EnrollmentKanban with drag-drop ── */}
      {view === 'kanban' && (
        <EnrollmentKanban
          enrollments={db.enrollments}
          providers={db.providers}
          payers={db.payers}
          onStageChange={onStageChange}
          onOpen={(enr) => openEnrollModal(enr.id)}
        />
      )}

    </div>
  )
}

export default ProvidersPage
