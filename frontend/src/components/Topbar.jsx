export default function Topbar() {
  return (
    <div className="topbar">
      <h2>Dashboard</h2>

      <div className="status">
        🟢 Servidor Conectado
        <button>🔔</button>
        <button>⚙️</button>
      </div>
    </div>
  )
}