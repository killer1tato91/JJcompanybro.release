export default function StatCard({ title, value }) {
  return (
    <div className="card">
      <p className="muted">{title}</p>
      <h2>{value}</h2>
    </div>
  )
}