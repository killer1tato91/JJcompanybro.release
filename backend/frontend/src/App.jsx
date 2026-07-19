import { useState, useEffect } from 'react'
import './App.css'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [activePage, setActivePage] = useState('Dashboard')
  const [connected, setConnected] = useState(true)
  const [accounts, setAccounts] = useState([])
  const [trades, setTrades] = useState([])

 useEffect(() => {
  const loadData = () => {
    fetch('http://localhost:3001/api/accounts')
      .then(res => res.json())
      .then(data => {
        console.log('Cuentas cargadas:', data)
        setAccounts(data)
      })
      .catch(err => console.error('Error cuentas:', err))

    fetch('http://localhost:3001/api/live-trades')
      .then(res => res.json())
      .then(data => {
        console.log('Trades cargados:', data)
        setTrades(data)
      })
      .catch(err => console.error('Error trades:', err))
  }

  loadData()

  const interval = setInterval(loadData, 3000)

  return () => clearInterval(interval)
}, [])
return (
  <div style={{
    background: 'red',
    color: 'white',
    fontSize: '50px',
    height: '100vh',
    padding: '40px'
  }}>
    PRUEBA APP PRINCIPAL
  </div>
)

  if (!loggedIn) {
    return (
      <div className="login-screen">
        <div className="login-wrapper">
          <div className="company-header">
            <div className="company-logo">JJ</div>
            <h1>J&J COMPANY BRO</h1>
            <p>Multi Account Trading Dashboard</p>
          </div>

          <div className="login-card">
            {!showRegister ? (
              <>
                <h2>Iniciar Sesión</h2>
                <input placeholder="Usuario" />
                <input placeholder="Contraseña" type="password" />

                <button className="login-btn" onClick={() => setLoggedIn(true)}>
                  Entrar al Dashboard
                </button>

                <button className="register-btn" onClick={() => setShowRegister(true)}>
                  Crear Cuenta Nueva
                </button>
              </>
            ) : (
              <>
                <h2>Crear Cuenta</h2>
                <input placeholder="Nombre completo" />
                <input placeholder="Usuario" />
                <input placeholder="Correo electrónico" />
                <input placeholder="Contraseña" type="password" />
                <input placeholder="Confirmar contraseña" type="password" />

                <button
                  className="login-btn"
                  onClick={() => {
                    alert('Cuenta creada correctamente')
                    setShowRegister(false)
                  }}
                >
                  Crear Cuenta
                </button>

                <button className="register-btn" onClick={() => setShowRegister(false)}>
                  Volver al Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">JJ</div>
          <div>
            <h2>J&J Company Bro</h2>
            <span>Trading Dashboard</span>
          </div>
        </div>

        <nav>
          {['Dashboard', 'Journal', 'Copy Trading', 'Accounts', 'Drawdown', 'Settings'].map(page => (
            <a
              key={page}
              className={activePage === page ? 'active' : ''}
              onClick={() => setActivePage(page)}
            >
              {page}
            </a>
          ))}
        </nav>

        <div className="premium">
          <strong>Hola, Trader</strong>
          <p>{connected ? 'Servidor conectado' : 'Servidor desconectado'}</p>
          <button className="logout" onClick={() => setLoggedIn(false)}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{activePage}</h1>
            <p>Resumen general de tus cuentas y operaciones</p>
          </div>

          <div className="top-actions">
            <input placeholder="Search..." />
            <button>🔔</button>
            <button
              className={connected ? 'connect' : 'disconnect'}
              onClick={() => setConnected(!connected)}
            >
              {connected ? 'Connected' : 'Disconnected'}
            </button>
          </div>
        </header>

        {activePage === 'Dashboard' && <Dashboard accounts={accounts} trades={trades} />}
        {activePage === 'Journal' && <Journal />}
        {activePage === 'Copy Trading' && <CopyTrading accounts={accounts} />}
        {activePage === 'Accounts' && <Accounts accounts={accounts} />}

        {activePage === 'Drawdown' && (
          <div className="panel empty-page">
            <h2>Drawdown</h2>
            <p>Control de pérdida diaria y margen disponible.</p>
          </div>
        )}

        {activePage === 'Settings' && (
          <div className="panel empty-page">
            <h2>Settings</h2>
            <p>Configuración del sistema.</p>
          </div>
        )}
      </main>
    </div>
  )
}

function Dashboard({ accounts = [], trades = [] }) {
	return <h1 style={{ color: 'red', fontSize: '60px' }}>TEST DASHBOARD</h1>
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
  const totalPnl = accounts.reduce((sum, acc) => sum + (acc.pnl || 0), 0)
  const activeAccounts = accounts.filter(acc => acc.active).length
  const masterCount = accounts.filter(acc => acc.type === 'master').length
  const slaveCount = accounts.filter(acc => acc.type === 'slave').length
  const availableCapital = totalBalance + totalPnl

  return (
    <>
      <section className="stats">
        <div className="stat-card">
          <span>Balance Total</span>
          <h2>${totalBalance.toLocaleString()}</h2>
          <p className={totalPnl >= 0 ? 'green' : 'red'}>
            P&L Total {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}
          </p>
        </div>

        <div className="stat-card">
          <span>Cuentas Conectadas</span>
          <h2>{accounts.length}</h2>
          <p className="blue">{masterCount} Master / {slaveCount} Slave</p>
        </div>

        <div className="stat-card">
          <span>Operaciones</span>
          <h2>{trades.length}</h2>
          <p className="orange">Trades recientes</p>
        </div>

        <div className="stat-card">
          <span>Estado Sistema</span>
          <h2 className="green">Operativo</h2>
          <p>Backend conectado</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel performance">
          <div className="panel-head">
            <h3>Performance General</h3>
            <span>Últimos 7 días</span>
          </div>

          <div className="chart">
            <div className="bar b1"></div>
            <div className="bar b2"></div>
            <div className="bar b3"></div>
            <div className="bar b4"></div>
            <div className="bar b5"></div>
            <div className="bar b6"></div>
            <div className="bar b7"></div>
          </div>
        </div>

        <div className="panel accounts">
          <div className="panel-head">
            <h3>Vista General Cuentas test</h3>
            <b style={{ color: 'red', fontSize: '14px' }}>
  {accounts.length} TEST
</b>
          </div>

          <div className="account-row">
            <span>Equidad Total</span>
            <b>${totalBalance.toLocaleString()}</b>
          </div>

          <div className="account-row">
            <span>P&L Total</span>
            <b className={totalPnl >= 0 ? 'green' : 'red'}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}
            </b>
          </div>

          <div className="account-row">
            <span>Capital Disponible</span>
            <b className="green">${availableCapital.toLocaleString()}</b>
          </div>

          <div className="account-row">
            <span>Cuentas Activas</span>
            <b className="blue">{activeAccounts}</b>
          </div>

          {accounts.map(acc => (
            <div className="account-row" key={acc.id}>
              <span>{acc.name}</span>
              <b className={acc.pnl >= 0 ? 'green' : 'red'}>
                ${acc.balance.toLocaleString()}
              </b>
            </div>
          ))}
        </div>

        <div className="panel trades">
          <div className="panel-head">
            <h3>Operaciones Recientes</h3>
            <span>Live feed</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cuenta</th>
                <th>Símbolo</th>
                <th>Acción</th>
                <th>Cantidad</th>
                <th>P&L</th>
                <th>Estado</th>
                <th>Hora</th>
              </tr>
            </thead>

            <tbody>
              {trades.map(trade => (
                <tr key={trade.id}>
                  <td>#{trade.id}</td>
                  <td>{trade.account}</td>
                  <td>{trade.symbol}</td>
                  <td className={trade.side === 'BUY' ? 'green' : 'red'}>
                    {trade.side}
                  </td>
                  <td>{trade.quantity}</td>
                  <td className={trade.pnl >= 0 ? 'green' : 'red'}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString()}
                  </td>
                  <td className={trade.status === 'Closed' ? 'green' : 'orange'}>
                    {trade.status}
                  </td>
                  <td>{trade.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function Journal() {
  return (
    <div className="panel connections">
      <h2>Journal</h2>
      <p>Calendario de operaciones.</p>
    </div>
  )
}

function CopyTrading({ accounts = [] }) {
  const [copierActive, setCopierActive] = useState(true)
  const [multiplier, setMultiplier] = useState(1)
  const [selectedMaster, setSelectedMaster] = useState('')
  const [selectedSlaves, setSelectedSlaves] = useState([])
  useEffect(() => {
  fetch('http://localhost:3001/api/copier/config')
    .then(res => res.json())
    .then(data => {
      setSelectedMaster(data.master)
      setSelectedSlaves(data.slaves || [])
      setCopierActive(data.enabled)
      setMultiplier(data.multiplier)
    })
}, [])
 const saveConfig = () => {
  fetch('http://localhost:3001/api/copier/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      master: selectedMaster,
      slaves: selectedSlaves,
      enabled: copierActive,
      multiplier: Number(multiplier)
    })
  })
    .then(res => res.json())
    .then(data => {
      console.log('CONFIG GUARDADA:', data)
      alert('Configuración guardada')
    })
    .catch(err => console.error('Error guardando config:', err))
}
  const masterAccounts = accounts
  const slaveAccounts = accounts.filter(account => account.type === 'slave')

  return (
    <div className="copy-page">
      <div className="panel copy-main">
        <div className="panel-head">
          <h3>Copy Trading Control</h3>
          <span className={copierActive ? 'green' : 'red'}>
            {copierActive ? 'Activo' : 'Pausado'}
          </span>
        </div>
        <button
    className="success-btn save-config-btn"
    onClick={saveConfig}
  >
    Guardar Configuración
  </button>
        <div className="copy-status">
          <div>
            <span>Cuenta Master</span>
            <h2>{accounts[0]?.name || 'Sin cuenta detectada'}</h2>
            <p>{accounts[0]?.broker || 'NinjaTrader'}</p>
          </div>

          
        </div>

       <div className="copy-config">
  <div className="form-group">
    <label>Cuenta Master</label>

    <select
      value={selectedMaster}
      onChange={(e) => setSelectedMaster(e.target.value)}
    >
      {masterAccounts.map(account => (
        <option key={account.id} value={account.name}>
          {account.name}
        </option>
      ))}
    </select>
  </div>

  <div className="form-group">
    <label>Modo de Copiado</label>
    <select>
      <option>Por multiplicador</option>
      <option>Por porcentaje</option>
      <option>Contrato fijo</option>
    </select>
  </div>

  <div className="form-group">
    <label>Multiplicador</label>
    <input
      type="number"
      value={multiplier}
      min="0.25"
      step="0.25"
      onChange={(e) => setMultiplier(Number(e.target.value))}
    />
  </div>

  <div className="form-group">
    <label>Protección de riesgo</label>
    <select>
      <option>Activada</option>
      <option>Desactivada</option>
    </select>
  </div>
</div>


</div>
      

      <div className="panel connections">
       <div className="panel-head">
  <h3>Copy Trading Control</h3>

 <div className="copy-actions">
  <button
    className={copierActive ? 'danger-btn' : 'success-btn'}
    onClick={() => setCopierActive(!copierActive)}
  >
    {copierActive ? 'Pausar Copiadora' : 'Activar Copiadora'}
  </button>

  <button
    className="success-btn"
    onClick={saveConfig}
  >
    Guardar
  </button>
</div>
</div>


        {slaveAccounts.map(account => (
          <div className="slave-row" key={account.id}>
            <div>
              <b>{account.name}</b>
              <p>{account.broker} / Balance: ${account.balance.toLocaleString()}</p>
            </div>

            <label className="switch">
              <input type="checkbox" defaultChecked={account.active} />
              <span></span>
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
function Accounts({ accounts = [] }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Accounts Manager</h3>
        <span>{accounts.length} cuentas detectadas</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Broker</th>
            <th>Balance</th>
            <th>P&L</th>
            <th>Tipo</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>
          {accounts.map(account => (
            <tr key={account.id}>
              <td>{account.name}</td>
              <td>{account.broker}</td>
              <td>${account.balance.toLocaleString()}</td>
              <td className={account.pnl >= 0 ? 'green' : 'red'}>
                ${account.pnl.toLocaleString()}
              </td>
              <td>{account.type === 'master' ? '👑 Master' : '🔁 Slave'}</td>
              <td>
                {account.active ? (
                  <span className="green">● Activa</span>
                ) : (
                  <span className="red">● Inactiva</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}