import { STAGE_COLOR } from '../../constants/stages.js'

function daysUntil(d) { if(!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000) }

function Badge({ cls, children }) { return <span className={`badge ${cls||'b-gray'}`}>{children}</span> }
function ExpiryBadge({ date }) {
  const days = daysUntil(date)
  if (days === null) return <Badge cls="b-gray">Not Set</Badge>
  if (days < 0) return <Badge cls="b-red">Expired {Math.abs(days)}d ago</Badge>
  if (days <= 30) return <Badge cls="b-red">{days}d left</Badge>
  if (days <= 90) return <Badge cls="b-amber">{days}d left</Badge>
  return <Badge cls="b-green">{days}d left</Badge>
}
function StageBadge({ stage }) { return <Badge cls={STAGE_COLOR[stage]||'b-gray'}>{stage}</Badge> }


export { Badge, ExpiryBadge, StageBadge }
