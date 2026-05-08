// KanbanPipeline — used in Applications tab (Pipeline Kanban sub-tab)
// This is a thin wrapper around EnrollmentKanban.
// onStageChange and toast come from index.js via ApplicationsPage props.

import EnrollmentKanban from '../../components/EnrollmentKanban'

export function KanbanPipeline({ db, openEnrollModal, onStageChange }) {
  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary btn-sm" onClick={() => openEnrollModal()}>
          + New Enrollment
        </button>
      </div>
      <EnrollmentKanban
        enrollments={db.enrollments}
        providers={db.providers}
        payers={db.payers}
        onStageChange={onStageChange}
        onOpen={(enr) => openEnrollModal(enr.id)}
      />
    </div>
  )
}

export default KanbanPipeline
