export default function Sidebar() {
  return (
    <div className="sidebar">
      <div className="logo">J&J COMPANY BRO</div>

      <nav>
        <a className="active">📊 Dashboard</a>
        <a>👤 Cuentas</a>
        <a>🤖 Copiadora</a>
        <a>📈 Operaciones</a>
        <a>⚠️ Riesgo</a>
        <a>📜 Historial</a>
        <a>⚙️ Configuración</a>
      </nav>

      <div className="userbox">
        <p>Hola, Trader</p>
        <span>Plan PRO</span>
      </div>
    </div>
  )
}