import { useState, useEffect } from 'react'
import './App.css'
import logo from './assets/logo.png'
const readStoredUser = () => {
  try {
    const rawUser = localStorage.getItem('jj_user')

    if (!rawUser || rawUser === 'undefined' || rawUser === 'null') {
      localStorage.removeItem('jj_user')
      localStorage.removeItem('jj_logged_in')
      return null
    }

    return JSON.parse(rawUser)
  } catch (error) {
    console.error('Usuario guardado inválido. Se limpiará la sesión:', error)
    localStorage.removeItem('jj_user')
    localStorage.removeItem('jj_logged_in')
    return null
  }
}


const initialStoredUser = readStoredUser()

export default function App() {
  const [loggedIn, setLoggedIn] = useState(
    localStorage.getItem('jj_logged_in') === 'true' && Boolean(initialStoredUser)
  )
  const [appVersion, setAppVersion] = useState('')
  const [updateStatus, setUpdateStatus] =
  useState('idle')

const [updateMessage, setUpdateMessage] =
  useState('')

const [updateProgress, setUpdateProgress] =
  useState(0)
  const [showRegister, setShowRegister] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [activePage, setActivePage] = useState('Dashboard')
  const [advancedMenuOpen, setAdvancedMenuOpen] = useState(false)
  const [connected, setConnected] = useState(true)
  const [currentUser, setCurrentUser] = useState(initialStoredUser)
const [accentColor, setAccentColor] = useState(() => {
  try {
    const savedUser = initialStoredUser
    const savedColor = savedUser?.email
      ? localStorage.getItem(`jj_accent_color_${savedUser.email}`)
      : null

    return savedUser?.accentColor || savedColor || '#2563eb'
  } catch {
    return '#2563eb'
  }
})
const [showAlertsPanel, setShowAlertsPanel] = useState(false)
const [riskAlerts, setRiskAlerts] = useState([])
const [riskRules, setRiskRules] = useState([])
const [groups, setGroups] = useState([])
const [newGroupName, setNewGroupName] = useState('')
const [registerForm, setRegisterForm] = useState({
  name: '',
  username: '',
  email: '',
  confirmEmail: '',
  password: '',
  confirmPassword: ''
})
const [confirmModal, setConfirmModal] = useState({
  open: false,
  title: 'Confirmar accion',
  message: '',
  confirmText: 'Aceptar',
  onConfirm: null
})

const openConfirm = ({ title, message, confirmText, onConfirm }) => {
  setConfirmModal({
    open: true,
    title: title || 'Confirmar accion',
    message,
    confirmText: confirmText || 'Aceptar',
    onConfirm
  })
}

const closeConfirm = () => {
  setConfirmModal({
    open: false,
    title: 'Confirmar accion',
    message: '',
    confirmText: 'Aceptar',
    onConfirm: null
  })
}
const [settings, setSettings] = useState({
  platformName: 'J&J Company Bro',
  language: 'es',
  theme: 'dark',
  primaryColor: '#2563eb',
  soundsEnabled: true,
  alertsEnabled: true,
  alertSound: 'default'
  
})
const updateSetting = (field, value) => {
  setSettings(prev => ({
    ...prev,
    [field]: value
  }))
}

const getAccentStorageKey = (email) =>
  `jj_accent_color_${email}`

const applyAccentColor = (color) => {
  const finalColor = color || '#2563eb'

  setAccentColor(finalColor)

  setSettings(prev => ({
    ...prev,
    primaryColor: finalColor
  }))

  document.documentElement.style.setProperty(
    '--primary',
    finalColor
  )
}

const saveSettings = () => {
  const cleanSettings = {
    platformName: settings.platformName || 'J&J Company Bro',
    language: settings.language || 'es',
    theme: settings.theme || 'dark',
    primaryColor: accentColor || settings.primaryColor || '#2563eb',
    soundsEnabled: settings.soundsEnabled === true,
    alertsEnabled: settings.alertsEnabled === true,
    alertSound: settings.alertSound || 'default',
    refreshInterval: Number(settings.refreshInterval || 3),
    showGlobalPnL: settings.showGlobalPnL === true,
    confirmPanicClose: settings.confirmPanicClose === true
  }

  fetch('http://localhost:3001/api/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cleanSettings)
  })
    .then(res => res.json())
    .then(data => {
      console.log('SETTINGS GUARDADOS:', data)

      const savedPrimaryColor =
        data.settings?.primaryColor ||
        cleanSettings.primaryColor ||
        '#2563eb'

      setSettings({
        ...data.settings,
        primaryColor: savedPrimaryColor
      })

      applyAccentColor(savedPrimaryColor)

      if (currentUser?.email) {
        localStorage.setItem(
          getAccentStorageKey(currentUser.email),
          savedPrimaryColor
        )

        const updatedUser = {
          ...currentUser,
          accentColor: savedPrimaryColor
        }

        setCurrentUser(updatedUser)
        localStorage.setItem('jj_user', JSON.stringify(updatedUser))
      }

      document.body.classList.toggle(
        'light-mode',
        data.settings.theme === 'light'
      )

      alert('Configuración guardada')
    })
    .catch(err => {
      console.error('ERROR GUARDANDO SETTINGS:', err)
      alert('Error guardando configuración')
    })
}
 const [accounts, setAccounts] = useState([])
 const [
  payoutConfirmationOpen,
  setPayoutConfirmationOpen
] = useState(false)

const [
  pendingPayoutAccount,
  setPendingPayoutAccount
] = useState(null)
console.log('ACCOUNTS STATE:', accounts)

const [trades, setTrades] = useState([])
const [copyLogs, setCopyLogs] = useState([])
const [performanceData, setPerformanceData] = useState([])
const userPlan = currentUser?.plan || 'FREE'
const hasPremiumAccess = [
  'EARLY_ACCESS',
  'PRO',
  'ELITE'
].includes(userPlan)
const advancedPages = [
  'Advanced Summary',
  'Advanced Performance',
  'Advanced Accounts',
  'Advanced Payouts',
  'Advanced Evaluations',
  'Advanced Risk'
]

const isAdvancedPage =
  advancedPages.includes(activePage)

const advancedSectionMap = {
  'Advanced Summary': 'summary',
  'Advanced Performance': 'performance',
  'Advanced Accounts': 'accounts',
  'Advanced Payouts': 'payouts',
  'Advanced Evaluations': 'evaluations',
  'Advanced Risk': 'risk'
}

const advancedMenuItems = [
  {
    page: 'Advanced Summary',
    label: 'Resumen',
    icon: '◉'
  },
  {
    page: 'Advanced Performance',
    label: 'Rendimiento',
    icon: '↗'
  },
  {
    page: 'Advanced Accounts',
    label: 'Cuentas Prop',
    icon: '▣'
  },
  {
    page: 'Advanced Payouts',
    label: 'Payouts',
    icon: '$'
  },
  {
    page: 'Advanced Evaluations',
    label: 'Evaluaciones',
    icon: '✓'
  },
  {
    page: 'Advanced Risk',
    label: 'Riesgo',
    icon: '!'
  }
]

const changePage = page => {
  setActivePage(page)

  if (currentUser?.email) {
    localStorage.setItem(
      `jj_active_page_${currentUser.email}`,
      page
    )
  }
}
const isAdmin =
  currentUser?.email?.toLowerCase() ===
  'killer1tato@gmail.com'
  const [users, setUsers] = useState([])
const hasFeature = (feature) => {
  const features = currentUser?.features || ['dashboard', 'journal']
  return features.includes(feature)
}

useEffect(() => {
  if (!currentUser?.email) {
    applyAccentColor('#2563eb')
    return
  }

  const savedColor =
    currentUser.accentColor ||
    localStorage.getItem(getAccentStorageKey(currentUser.email)) ||
    settings.primaryColor ||
    '#2563eb'

  applyAccentColor(savedColor)
}, [currentUser?.email])

useEffect(() => {
  document.documentElement.style.setProperty(
    '--primary',
    accentColor || '#2563eb'
  )
}, [accentColor])

useEffect(() => {
  const loadAppVersion = async () => {
    try {
      const version =
        await window.jjDesktop?.getAppVersion?.()

      setAppVersion(version || 'Web')
    } catch (error) {
      console.error(
        'Error obteniendo la versión:',
        error
      )

      setAppVersion('No disponible')
    }
  }

  loadAppVersion()
}, [])

const getFriendlyUpdateError = (message = '') => {
  const text = String(message || '').toLowerCase()

  if (
    text.includes('latest.yml') ||
    text.includes('404') ||
    text.includes('not found')
  ) {
    return 'No se encontró la información de actualización en GitHub. Verifica que la publicación incluya latest.yml, el instalador y el archivo .blockmap.'
  }

  if (
    text.includes('network') ||
    text.includes('internet') ||
    text.includes('connect') ||
    text.includes('timeout')
  ) {
    return 'No se pudo conectar con el servidor de actualizaciones. Revisa tu conexión a internet e inténtalo nuevamente.'
  }

  return 'No se pudo comprobar la actualización. Inténtalo nuevamente en unos minutos.'
}

useEffect(() => {
  if (!window.jjDesktop?.onUpdateStatus) {
    return
  }

  const removeListener =
    window.jjDesktop.onUpdateStatus(data => {
      setUpdateStatus(data.status || 'idle')
      setUpdateMessage(
        data.status === 'error'
          ? getFriendlyUpdateError(data.message)
          : data.message || ''
      )

      if (
        typeof data.percent === 'number'
      ) {
        setUpdateProgress(data.percent)
      }

      if (data.status === 'downloaded') {
        setUpdateProgress(100)
      }
    })

  return () => {
    removeListener?.()
  }
}, [])

useEffect(() => {
  if (!currentUser?.email) return

  const savedPage = localStorage.getItem(
    `jj_active_page_${currentUser.email}`
  )

  if (savedPage) {
    if (savedPage === 'Admin' && !isAdmin) {
      setActivePage('Dashboard')
      localStorage.setItem(
        `jj_active_page_${currentUser.email}`,
        'Dashboard'
      )
    } else {
      setActivePage(savedPage)
    }
  } else {
    setActivePage('Dashboard')
    localStorage.setItem(
      `jj_active_page_${currentUser.email}`,
      'Dashboard'
    )
  }
}, [currentUser?.email, isAdmin])
useEffect(() => {

  const loadData = () => {

  const userEmail = currentUser?.email

  if (!userEmail) return

  fetch(`http://localhost:3001/api/accounts?email=${userEmail}`)
    .then(res => res.json())
    .then(data => {
      setAccounts(data)
    })

  fetch(`http://localhost:3001/api/trades/closed?email=${userEmail}`)
    .then(res => res.json())
    .then(data => {
      setTrades(Array.isArray(data) ? data : [])
    })
    .catch(err =>
      console.error('Error cargando trades cerrados:', err)
    )

  fetch('http://localhost:3001/api/groups')
    .then(res => res.json())
    .then(data => {
      setGroups(data)
    })

if (currentUser?.email) {
  fetch(
    `http://localhost:3001/api/user/alerts?email=${currentUser.email}`
  )
    .then(res => res.json())
    .then(data => {
      setRiskAlerts(data || [])
    })
}

  fetch(
  `http://localhost:3001/api/performance?email=${encodeURIComponent(userEmail)}`
)
    .then(res => res.json())
    .then(data => {
      setPerformanceData(data)
    })
	if (isAdmin) {
  fetch('http://localhost:3001/api/admin/users')
    .then(res => res.json())
    .then(data => {
      setUsers(data)
    })
}

  fetch('http://localhost:3001/api/copier/logs')
    .then(res => res.json())
    .then(data => {
      setCopyLogs(data)
    })
}

  loadData()

  const interval = setInterval(loadData, 3000)

  return () => clearInterval(interval)

}, [currentUser])
const deleteUser = (userId) => {
  const confirmed = window.confirm('¿Seguro que quieres eliminar este usuario?')

  if (!confirmed) return

  fetch('http://localhost:3001/api/admin/delete-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        alert(data.message || 'Error eliminando usuario')
        return
      }

      setUsers(prev =>
        prev.filter(u => String(u.id) !== String(userId))
      )
    })
}
const markAlertRead = (alertId) => {
  fetch('http://localhost:3001/api/user/alerts/read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: currentUser?.email,
      alertId
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setRiskAlerts(data.alerts || [])
      }
    })
}
const changeUserPlan = (userId, plan) => {
  fetch('http://localhost:3001/api/admin/change-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      plan
    })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        alert(data.message || 'Error cambiando plan')
        return
      }

      setUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, plan: data.user.plan }
            : u
        )
      )
    })
}
const createGroup = () => {
  if (!newGroupName.trim()) return

  fetch('http://localhost:3001/api/groups/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: newGroupName
    })
  })
    .then(res => res.json())
    .then(data => {
      setGroups(data.groups)
      setNewGroupName('')
    })
	fetch('http://localhost:3001/api/risk/alerts')
  .then(res => res.json())
  .then(data => {
    setRiskAlerts(data)
  })
}

useEffect(() => {

  fetch('http://localhost:3001/api/risk/rules')
    .then(res => res.json())
    .then(data => {
      setRiskRules(data)
    })

  fetch('http://localhost:3001/api/settings')
    .then(res => res.json())
    .then(data => {

      const userColor =
        currentUser?.email
          ? localStorage.getItem(getAccentStorageKey(currentUser.email))
          : null

      const finalPrimaryColor =
        currentUser?.accentColor ||
        userColor ||
        data.primaryColor ||
        '#2563eb'

      setSettings({
        platformName: data.platformName ?? 'J&J Company Bro',
        language: data.language ?? 'es',
        theme: data.theme ?? 'dark',
        primaryColor: finalPrimaryColor,
        soundsEnabled: data.soundsEnabled ?? true,
        alertsEnabled: data.alertsEnabled ?? true,
        alertSound: data.alertSound ?? 'default',
        showGlobalPnL: data.showGlobalPnL ?? true,
        refreshInterval: data.refreshInterval ?? 3,
        confirmPanicClose: data.confirmPanicClose ?? true
      })

      applyAccentColor(finalPrimaryColor)

      document.body.classList.toggle(
        'light-mode',
        data.theme === 'light'
      )

    })

}, [])
  
  const checkForUpdates = async () => {
  if (!window.jjDesktop?.checkForUpdates) {
    alert(
      'La búsqueda de actualizaciones solo está disponible en la aplicación de escritorio.'
    )
    return
  }

  setUpdateStatus('checking')
  setUpdateMessage('Buscando actualizaciones...')
  setUpdateProgress(0)

  try {
    const result =
      await window.jjDesktop.checkForUpdates()

    if (!result?.success) {
      setUpdateStatus('error')
      setUpdateMessage(
        getFriendlyUpdateError(result?.message)
      )
    }
  } catch (error) {
    console.error(
      'Error buscando actualización:',
      error
    )

    setUpdateStatus('error')
    setUpdateMessage(
      getFriendlyUpdateError(error?.message)
    )
  }
}

const installUpdate = async () => {
  try {
    const result =
      await window.jjDesktop?.installUpdate?.()

    if (!result?.success) {
      alert(
        result?.message ||
        'No se pudo instalar la actualización.'
      )
    }
  } catch (error) {
    console.error(
      'Error instalando actualización:',
      error
    )

    alert(
      error?.message ||
      'No se pudo instalar la actualización.'
    )
  }
}

useEffect(() => {
  if (
    payoutConfirmationOpen ||
    pendingPayoutAccount
  ) {
    return
  }

  const pendingAccount = accounts.find(
    account =>
      account
        .pendingPayoutConfirmation
        ?.detected === true
  )

  if (!pendingAccount) {
    return
  }

  setPendingPayoutAccount(
    pendingAccount
  )

  setPayoutConfirmationOpen(true)
}, [
  accounts,
  payoutConfirmationOpen,
  pendingPayoutAccount
])

const confirmDetectedPayout = async () => {
  if (!pendingPayoutAccount) {
    return
  }

  try {
    const response = await fetch(
      'http://localhost:3001/api/accounts/payout-confirm',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          email: currentUser?.email,

          accountName:
            pendingPayoutAccount.name ||
            pendingPayoutAccount.account ||
            pendingPayoutAccount.accountName
        })
      }
    )

    const data = await response.json()

    if (!data.success) {
      alert(
        data.message ||
        'No se pudo confirmar el payout'
      )

      return
    }

    setAccounts(previous =>
      previous.map(account => {
        const currentName =
          account.name ||
          account.account ||
          account.accountName

        const updatedName =
          data.account.name ||
          data.account.account ||
          data.account.accountName

        return currentName === updatedName
          ? data.account
          : account
      })
    )

    setPayoutConfirmationOpen(false)
    setPendingPayoutAccount(null)
  } catch (error) {
    console.error(
      'Error confirmando payout:',
      error
    )
  }
}

const dismissDetectedPayout = async () => {
  if (!pendingPayoutAccount) {
    return
  }

  try {
    const response = await fetch(
      'http://localhost:3001/api/accounts/payout-dismiss',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          email: currentUser?.email,

          accountName:
            pendingPayoutAccount.name ||
            pendingPayoutAccount.account ||
            pendingPayoutAccount.accountName
        })
      }
    )

    const data = await response.json()

    if (!data.success) {
      alert(
        data.message ||
        'No se pudo descartar la detección'
      )

      return
    }

    setAccounts(previous =>
      previous.map(account => {
        const currentName =
          account.name ||
          account.account ||
          account.accountName

        const updatedName =
          data.account.name ||
          data.account.account ||
          data.account.accountName

        return currentName === updatedName
          ? data.account
          : account
      })
    )

    setPayoutConfirmationOpen(false)
    setPendingPayoutAccount(null)
  } catch (error) {
    console.error(
      'Error descartando payout:',
      error
    )
  }
}
if (!loggedIn) {
  return (
    <div className="login-screen">
  <div className="login-trading-background" aria-hidden="true">
    <svg
      className="login-chart login-chart-main"
      viewBox="0 0 1200 500"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id="loginChartFill"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor="var(--primary)"
            stopOpacity="0.28"
          />

          <stop
            offset="100%"
            stopColor="var(--primary)"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>

      {[80, 160, 240, 320, 400].map(y => (
        <line
          key={`horizontal-${y}`}
          x1="0"
          y1={y}
          x2="1200"
          y2={y}
          className="login-chart-grid"
        />
      ))}

      {[100, 250, 400, 550, 700, 850, 1000, 1150].map(x => (
        <line
          key={`vertical-${x}`}
          x1={x}
          y1="0"
          x2={x}
          y2="500"
          className="login-chart-grid"
        />
      ))}

      <path
        d="
          M 0 410
          L 85 365
          L 155 390
          L 245 285
          L 325 320
          L 420 220
          L 510 260
          L 600 155
          L 690 205
          L 780 125
          L 870 175
          L 960 95
          L 1050 135
          L 1200 55
          L 1200 500
          L 0 500
          Z
        "
        fill="url(#loginChartFill)"
      />

      <path
        d="
          M 0 410
          L 85 365
          L 155 390
          L 245 285
          L 325 320
          L 420 220
          L 510 260
          L 600 155
          L 690 205
          L 780 125
          L 870 175
          L 960 95
          L 1050 135
          L 1200 55
        "
        className="login-chart-line"
      />
    </svg>

    <div className="login-candles login-candles-left">
      {[
        { height: 42, body: 18, up: true },
        { height: 65, body: 30, up: false },
        { height: 55, body: 24, up: true },
        { height: 82, body: 38, up: true },
        { height: 60, body: 25, up: false },
        { height: 95, body: 44, up: true },
        { height: 75, body: 31, up: true }
      ].map((candle, index) => (
        <span
          key={index}
          className={`login-candle ${
            candle.up ? 'up' : 'down'
          }`}
          style={{
            height: `${candle.height}px`,
            '--candle-body': `${candle.body}px`
          }}
        />
      ))}
    </div>

    <div className="login-market-label label-one">
      MNQ&nbsp;&nbsp;+1.28%
    </div>

    <div className="login-market-label label-two">
      NQ&nbsp;&nbsp;20,845.25
    </div>

    <div className="login-market-label label-three">
      LIVE MARKET
    </div>
  </div>
<div className="login-wrapper">

  <div className="company-header">

    <div className="login-logo-float">
      <img
        src={logo}
        alt="J&J Company Bro"
        className="company-logo-image login-logo-rotate"
      />
    </div>

    <h1>J&J COMPANY BRO</h1>
    <p>Multi Account Trading Dashboard</p>

  </div>

  <div className="login-card">

    {!showRegister ? (
      <>
        <h2>Iniciar Sesión</h2>

        <input
          placeholder="Usuario"
        />

<div className="password-box">
  <input
    placeholder="Contraseña"
    type={showPassword ? 'text' : 'password'}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        localStorage.setItem('jj_logged_in', 'true')
        setLoggedIn(true)
      }
    }}
  />

  <button
  type="button"
  className="show-password-btn"
  onClick={() => setShowPassword(!showPassword)}
>
  👁
</button>
</div>

             <button
  className="login-btn"
  onClick={() => {
  const usernameInput = document.querySelector('input[placeholder="Usuario"]')
  const passwordInput = document.querySelector('input[placeholder="Contraseña"]')

  fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: usernameInput.value,
      password: passwordInput.value
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert(data.error)
        return
      }

      localStorage.setItem('jj_logged_in', 'true')
      localStorage.setItem('jj_user', JSON.stringify(data.user))

      const savedColor =
        data.user?.accentColor ||
        localStorage.getItem(getAccentStorageKey(data.user.email)) ||
        '#2563eb'

      const userWithColor = {
        ...data.user,
        accentColor: savedColor
      }

      localStorage.setItem('jj_user', JSON.stringify(userWithColor))

      setCurrentUser(userWithColor)
      applyAccentColor(savedColor)
      setLoggedIn(true)
    })
    .catch(() => {
      alert('Error conectando con el servidor')
    })
}}
>
  Entrar al Dashboard
</button>

              <button
                className="register-btn"
                onClick={() => setShowRegister(true)}
              >
                Crear Cuenta Nueva
              </button>
            </>
          ) : (
            <>
             <h2>Crear Cuenta Gratis</h2>

<p className="early-access-register-note">
  Early Access gratuito · Sin tarjeta · Usuario fundador
</p>

<input
  placeholder="Nombre completo"
  value={registerForm.name}
  onChange={(e) =>
    setRegisterForm({ ...registerForm, name: e.target.value })
  }
/>

<input
  placeholder="Usuario"
  value={registerForm.username}
  onChange={(e) =>
    setRegisterForm({ ...registerForm, username: e.target.value })
  }
/>

<input
  placeholder="Correo electrónico"
  type="email"
  value={registerForm.email}
  onChange={(e) =>
    setRegisterForm({ ...registerForm, email: e.target.value })
  }
/>

<input
  placeholder="Contraseña"
  type="password"
  value={registerForm.password}
  onChange={(e) =>
    setRegisterForm({ ...registerForm, password: e.target.value })
  }
/>

<input
  placeholder="Confirmar contraseña"
  type="password"
  value={registerForm.confirmPassword}
  onChange={(e) =>
    setRegisterForm({
      ...registerForm,
      confirmPassword: e.target.value
    })
  }
/>

<button
  className="login-btn"
  onClick={() => {
    if (
      !registerForm.name ||
      !registerForm.username ||
      !registerForm.email ||
      !registerForm.password ||
      !registerForm.confirmPassword
    ) {
      alert('Completa todos los campos')
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      alert('Las contraseñas no coinciden')
      return
    }

    fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerForm)
    })
      .then(async res => {
        const data = await res.json()

        if (!res.ok) {
          throw new Error(
            data.error ||
            data.message ||
            'No se pudo crear la cuenta'
          )
        }

        return data
      })
      .then(data => {
        const savedColor =
          data.user?.accentColor ||
          localStorage.getItem(
            getAccentStorageKey(data.user.email)
          ) ||
          '#2563eb'

        const userWithColor = {
          ...data.user,
          accentColor: savedColor
        }

        localStorage.setItem(
          'jj_user',
          JSON.stringify(userWithColor)
        )
        localStorage.setItem('jj_logged_in', 'true')

        setCurrentUser(userWithColor)
        applyAccentColor(savedColor)
        setLoggedIn(true)
      })
      .catch(error => {
        alert(error.message || 'Error registrando usuario')
      })
  }}
>
  Crear cuenta gratis
</button>

<button
  className="register-btn"
  onClick={() => setShowRegister(false)}
>
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
          <img
  src={logo}
  alt="J&J Company Bro"
  className="sidebar-logo-image"
/>
          <div>
            <h2>J&J Company Bro</h2>
            <span>Trading Dashboard</span>
          </div>
        </div>

<nav className="sidebar-nav">

  {[
    'Dashboard',
    'Journal',
    'Copy Trading',
    'Accounts',
    'Drawdown',
    'Risk Rules'
  ].map(page => (
    <a
      key={page}
      className={
        activePage === page
          ? 'active'
          : ''
      }
      onClick={() => changePage(page)}
    >
      {page}
    </a>
  ))}

  <div
    className={
      `sidebar-submenu ${
        isAdvancedPage
          ? 'active-parent'
          : ''
      }`
    }
  >
    <button
      type="button"
      className={
        `sidebar-submenu-toggle ${
          isAdvancedPage
            ? 'active'
            : ''
        }`
      }
      onClick={() => {
        if (!hasPremiumAccess) {
          changePage('Advanced Summary')
          return
        }

        setAdvancedMenuOpen(prev => !prev)
      }}
    >
      <span className="sidebar-submenu-title">
        <span>
          {hasPremiumAccess ? '📊' : '🔒'}
        </span>

        <span>Advanced Metrics</span>
      </span>

      {hasPremiumAccess && (
        <span
          className={
            `sidebar-submenu-arrow ${
              advancedMenuOpen
                ? 'open'
                : ''
            }`
          }
        >
          ▾
        </span>
      )}
    </button>

    {hasPremiumAccess &&
  advancedMenuOpen && (
        <div className="sidebar-submenu-items">
          {advancedMenuItems.map(item => (
            <button
              type="button"
              key={item.page}
              className={
                activePage === item.page
                  ? 'active'
                  : ''
              }
              onClick={() => {
                changePage(item.page)
                
              }}
            >
              <span className="submenu-icon">
                {item.icon}
              </span>

              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
  </div>

  {[
    'Subscriptions',
    'Settings',
    ...(isAdmin ? ['Admin'] : [])
  ].map(page => (
    <a
      key={page}
      className={
        activePage === page
          ? 'active'
          : ''
      }
      onClick={() => changePage(page)}
    >
      {page}
    </a>
  ))}

</nav>

    <div className="premium">
  <strong>
    Hola, {currentUser?.username || 'Trader'}
  </strong>

  <p>
    {connected
      ? 'Servidor conectado'
      : 'Servidor desconectado'}
  </p>

  {currentUser?.isFounder && (
    <div className="founder-badge">
      ⭐ Usuario fundador · Early Access
    </div>
  )}

  <button
    className="logout"
    onClick={() => {
      localStorage.removeItem('jj_logged_in')
      setLoggedIn(false)
    }}
  >
    Cerrar sesión
  </button>

  <div className="app-version">
    <span>J&J Company Bro</span>
    <small>
      Versión {appVersion || '...'}
    </small>
  </div>
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
        <div
  style={{
    position: 'relative'
  }}
>
  <button
    onClick={() => setShowAlertsPanel(!showAlertsPanel)}
  >
    🔔
  </button>

  {riskAlerts.length > 0 && (
    <span className="notification-badge">
      {riskAlerts.length}
    </span>
  )}
</div>
            <button
              className={connected ? 'connect' : 'disconnect'}
              onClick={() => setConnected(!connected)}
            >
              {connected ? 'Connected' : 'Disconnected'}
            </button>
          </div>
       </header>

{activePage === 'Dashboard' && (
<Dashboard
  accounts={accounts}
  trades={trades}
  copyLogs={copyLogs}
  performanceData={performanceData}
  appVersion={appVersion}
/>
)}

{activePage === 'Journal' && (
  <Journal
    trades={trades}
    openConfirm={openConfirm}
  />
)}

{activePage === 'Copy Trading' && (
  !hasPremiumAccess ? (
    <div className="panel locked-panel">
      <h2>🔒 Copy Trading disponible en PRO</h2>
      <p>
        Actualiza tu suscripción para copiar operaciones entre cuentas.
      </p>

      <button onClick={() => setActivePage('Subscriptions')}>
        Ver planes
      </button>
    </div>
  ) : (
    <CopyTrading
      accounts={accounts}
      setAccounts={setAccounts}
      groups={groups}
      setGroups={setGroups}
      newGroupName={newGroupName}
      setNewGroupName={setNewGroupName}
      createGroup={createGroup}
    />
  )
)}
{activePage === 'Accounts' && (
  <Accounts accounts={accounts} />
)}

{activePage === 'Drawdown' && (
  <Drawdown accounts={accounts} />
)}

{activePage === 'Risk Rules' && (
  <RiskRules
    accounts={accounts}
    groups={groups}
    riskRules={riskRules}
    setRiskRules={setRiskRules}
  />
)}

{isAdvancedPage && (
  !hasPremiumAccess ? (
    <AdvancedMetricsLocked
      setActivePage={changePage}
    />
  ) : (
    <AdvancedMetrics
      trades={trades}
      accounts={accounts}
      plan={currentUser?.plan}
      section={
        advancedSectionMap[activePage] ||
        'summary'
      }
    />
  )
)}
{activePage === 'Subscriptions' && (
  <Subscriptions currentUser={currentUser} />
)}
{activePage === 'Settings' && (
  <div className="settings-page">

    <div className="panel">
      <div className="panel-head">
        <h3>Configuración de Usuario</h3>
      </div>

      <div className="settings-grid">
        <div className="form-group">
          <label>Nombre de usuario</label>
          <input
            value={currentUser?.username || ''}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Correo</label>
          <input
            value={currentUser?.email || ''}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Idioma</label>
          <select
            value={settings.language}
            onChange={(e) => updateSetting('language', e.target.value)}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </div>

    <div className="panel">
      <div className="panel-head">
        <h3>Apariencia</h3>
      </div>

      <div className="settings-grid">
        <div className="form-group">
          <label>Nombre Plataforma</label>
          <input
            value={settings.platformName}
            onChange={(e) => updateSetting('platformName', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Color principal</label>
          <select
            value={settings.primaryColor}
            onChange={(e) => applyAccentColor(e.target.value)}
          >
            <option value="#2563eb">Azul</option>
            <option value="#16a34a">Verde</option>
            <option value="#9333ea">Morado</option>
            <option value="#dc2626">Rojo</option>
            <option value="#f97316">Naranja</option>
            <option value="#06b6d4">Cyan</option>
            <option value="#ec4899">Rosa Neon</option>
          </select>

          <div className="theme-colors">
            {[
              '#2563eb',
              '#16a34a',
              '#9333ea',
              '#dc2626',
              '#f97316',
              '#06b6d4',
              '#ec4899'
            ].map(color => (
              <button
                key={color}
                type="button"
                className={accentColor === color ? 'active-color' : ''}
                style={{ background: color }}
                onClick={() => applyAccentColor(color)}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Tema</label>
          <select
            value={settings.theme}
            onChange={(e) => {
              updateSetting('theme', e.target.value)
              document.body.classList.toggle('light-mode', e.target.value === 'light')
            }}
          >
            <option value="dark">Oscuro</option>
            <option value="light">Claro</option>
          </select>
        </div>
      </div>
    </div>

    <div className="panel">
      <div className="panel-head">
        <h3>Alertas y Sonidos</h3>
      </div>

      <div className="settings-grid">
        <div className="form-group">
          <label>Alertas de riesgo</label>
          <select
            value={settings.alertsEnabled ? 'on' : 'off'}
            onChange={(e) => updateSetting('alertsEnabled', e.target.value === 'on')}
          >
            <option value="on">Activadas</option>
            <option value="off">Desactivadas</option>
          </select>
        </div>

        <div className="form-group">
          <label>Sonidos</label>
          <select
            value={settings.soundsEnabled ? 'on' : 'off'}
            onChange={(e) => updateSetting('soundsEnabled', e.target.value === 'on')}
          >
            <option value="on">Activados</option>
            <option value="off">Desactivados</option>
          </select>
        </div>

        <div className="form-group">
          <label>Sonido de alerta</label>
          <select
            value={settings.alertSound}
            onChange={(e) => updateSetting('alertSound', e.target.value)}
          >
            <option value="default">Default</option>
            <option value="beep">Beep</option>
            <option value="action">Comenzó la acción</option>
          </select>
        </div>
      </div>
    </div>
<div className="panel">
  <div className="panel-head">
    <h3>Trading</h3>
  </div>

  <div className="settings-grid">

    <div className="form-group">
      <label>Auto Refresh (segundos)</label>
      <input
        type="number"
        value={settings.refreshInterval || 3}
        onChange={(e) =>
          updateSetting(
            'refreshInterval',
            Number(e.target.value)
          )
        }
      />
    </div>

    <div className="form-group">
      <label>Mostrar PnL Global</label>
      <select
        value={settings.showGlobalPnL ? 'yes' : 'no'}
        onChange={(e) =>
          updateSetting(
            'showGlobalPnL',
            e.target.value === 'yes'
          )
        }
      >
        <option value="yes">Sí</option>
        <option value="no">No</option>
      </select>
    </div>

    <div className="form-group">
      <label>Confirmar Panic Close</label>
      <select
        value={settings.confirmPanicClose ? 'yes' : 'no'}
        onChange={(e) =>
          updateSetting(
            'confirmPanicClose',
            e.target.value === 'yes'
          )
        }
      >
        <option value="yes">Sí</option>
        <option value="no">No</option>
      </select>
    </div>

  </div>
</div>
<div className="panel">
  <div className="panel-head">
    <h3>Conexión Addon NinjaTrader</h3>
  </div>

  <div className="settings-grid">

    <div className="form-group">
      <label>Usuario</label>
      <input
        value={currentUser?.username || ''}
        readOnly
      />
    </div>

    <div className="form-group">
      <label>Correo</label>
      <input
        value={currentUser?.email || ''}
        readOnly
      />
    </div>

    <div className="form-group">
      <label>Estado</label>
      <input
        value="Listo para conectar addon"
        readOnly
      />
    </div>

  </div>
  <button
  className="success-btn"
  onClick={() => {
    window.location.href =
      `http://localhost:3001/api/addon/download?apiKey=${currentUser.apiKey}`
  }}
>
  Descargar Addon NinjaTrader
</button>
</div>

    <div className="panel">
      <button
        className="success-btn"
        onClick={saveSettings}
      >
        Guardar Configuración
      </button>
    </div>

    <div className="panel">
      <div className="panel-head">
        <h3>Actualizaciones</h3>
      </div>

      <div className="update-section">
        <div>
          <p>
            Versión instalada:
            <strong> {appVersion || '...'}</strong>
          </p>

          {updateMessage && (
            <p className="update-message">
              {updateMessage}
            </p>
          )}

          {updateStatus === 'downloading' && (
            <div className="update-progress">
              <div
                className="update-progress-fill"
                style={{
                  width: `${updateProgress}%`
                }}
              />
            </div>
          )}
        </div>

        {updateStatus === 'downloaded' ? (
          <button
            className="success-btn"
            onClick={installUpdate}
          >
            Reiniciar e instalar
          </button>
        ) : (
          <button
            className="success-btn"
            onClick={checkForUpdates}
            disabled={
              updateStatus === 'checking' ||
              updateStatus === 'available' ||
              updateStatus === 'downloading'
            }
          >
            {updateStatus === 'checking'
              ? 'Buscando...'
              : updateStatus === 'downloading'
                ? `Descargando ${updateProgress}%`
                : 'Buscar actualización'}
          </button>
        )}
      </div>
    </div>

  </div>
)}
{activePage === 'Admin' && (
  <div className="page">

    <section className="admin-stats">
      <div className="stat-card">
        <div>
          <span>USUARIOS</span>
          <h2>{users.length}</h2>
          <p>Total registrados</p>
        </div>
        <div className="stat-icon blue">👤</div>
      </div>

      <div className="stat-card">
        <div>
          <span>FREE</span>
          <h2>{users.filter(u => u.plan === 'FREE').length}</h2>
          <p>Plan gratis</p>
        </div>
        <div className="stat-icon purple">F</div>
      </div>

      <div className="stat-card">
        <div>
          <span>PRO</span>
          <h2>{users.filter(u => u.plan === 'PRO').length}</h2>
          <p>Plan premium</p>
        </div>
        <div className="stat-icon green">P</div>
      </div>

<div className="stat-card">
  <div>
    <span>ELITE</span>
    <h2>{users.filter(u => u.plan === 'ELITE').length}</h2>
    <p>Plan Elite</p>
  </div>

  <div className="stat-icon green-solid">
    E
  </div>
</div>

      <div className="stat-card">
        <div>
          <span>CUENTAS</span>
          <h2>{accounts.length}</h2>
          <p>Cuentas conectadas</p>
        </div>
        <div className="stat-icon green-solid">NT</div>
      </div>
    </section>

    <div className="panel">
      <div className="panel-head">
        <h3>Usuarios Registrados</h3>
      </div>

      <table>
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Email</th>
            <th>Plan</th>
            <th>API Key</th>
            <th>Registro</th>
			<th>Estado</th>
			<th>Acciones</th>
			
          </tr>
        </thead>

        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>{user.email}</td>
              <td>{user.plan}</td>
              <td>{user.apiKey}</td>
              <td>
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : '-'}
              </td>
			  <td>
  {user.lastSeen &&
  Date.now() - new Date(user.lastSeen).getTime() < 60000
    ? '🟢 Online'
    : '🔴 Offline'}
</td>
<td>
  <div className="admin-actions">

    <button
      className="free-btn"
      onClick={() => changeUserPlan(user.id, 'FREE')}
    >
      FREE
    </button>

    <button
      className="pro-btn"
      onClick={() => changeUserPlan(user.id, 'PRO')}
    >
      PRO
    </button>

    <button
      className="elite-btn"
      onClick={() => changeUserPlan(user.id, 'ELITE')}
    >
      ELITE
    </button>
	
	<button
  className="delete-btn"
  onClick={() => deleteUser(user.id)}
>
  X
</button>

  </div>
</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

  </div>
)}
<div className={`alerts-drawer ${showAlertsPanel ? 'open' : ''}`}>
  <div className="alerts-head">
    <h3>Notificaciones</h3>

    <button onClick={() => setShowAlertsPanel(false)}>
      X   </button>

  </div>

  <div className="alerts-list">
    {riskAlerts.length === 0 ? (
      <p className="empty-alert">No hay alertas registradas.</p>
    ) : (
      riskAlerts.map(alert => (
        <div
          className={`alert-card ${
            alert.type === 'ACCOUNT_BLOCKED'
              ? 'danger-alert'
              : 'warning-alert'
          }`}
          key={alert.id}
        >
          <b>{alert.type}</b>
          <p>{alert.message || 'Alerta del sistema'}</p>
          <span>{alert.account || '-'} / {alert.group || '-'}</span>
          <small>{alert.time || ''}</small>
		  <button onClick={() => markAlertRead(alert.id)}>
  Marcar leída
</button>
        </div>
      ))
    )}
  </div>
</div>
{confirmModal.open && (
  <div className="custom-confirm-overlay">
    <div className="custom-confirm-box">
      <h3>{confirmModal.title}</h3>
      <p>{confirmModal.message}</p>

      <div className="custom-confirm-actions">
        <button
          className="danger-btn"
          onClick={() => {
            confirmModal.onConfirm?.()
            closeConfirm()
          }}
        >
          {confirmModal.confirmText}
        </button>

        <button className="cancel-btn" onClick={closeConfirm}>
          Cancelar
        </button>
      </div>
    </div>
  </div>
)}

{payoutConfirmationOpen &&
 pendingPayoutAccount && (
  <div className="custom-confirm-overlay">
    <div className="custom-confirm-box">
      <h3>
        ¿Se realizó un payout?
      </h3>

      <p>
        Se detectó una reducción de balance de{' '}
        <strong>
          $
          {Number(
            pendingPayoutAccount
              .pendingPayoutConfirmation
              ?.amount || 0
          ).toFixed(2)}
        </strong>
        {' '}en la cuenta{' '}
        <strong>
          {pendingPayoutAccount.name ||
           pendingPayoutAccount.account ||
           pendingPayoutAccount.accountName}
        </strong>.
      </p>

      <p>
        Confirma solamente si esta reducción
        corresponde a un retiro aprobado.
      </p>

      <div className="custom-confirm-actions">
        <button
          className="success-btn"
          onClick={
            confirmDetectedPayout
          }
        >
          Sí, fue un payout
        </button>

        <button
          className="cancel-btn"
          onClick={
            dismissDetectedPayout
          }
        >
          No fue un payout
        </button>
      </div>
    </div>
  </div>
)}
      </main>
    </div>
  )
}

function Dashboard({
  accounts = [],
  trades = [],
  copyLogs = [],
  performanceData = [],
  appVersion = ''
}) {
  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0)
  const totalPnl = accounts.reduce((sum, acc) => sum + Number(acc.pnl || 0), 0)
  const masterCount = accounts.filter(acc => acc.type === 'master').length
  const slaveCount = accounts.filter(acc => acc.type === 'slave').length
  const masterAccount = accounts.find(acc => acc.type === 'master') || {}
  const totalContracts = accounts.reduce((sum, acc) => sum + Number(acc.contracts || 0), 0)
  const [performanceRange, setPerformanceRange] = useState('7')
  const [performanceTooltip, setPerformanceTooltip] = useState(null)
  const [copierEnabled, setCopierEnabled] = useState(false)
  useEffect(() => {
  fetch('http://localhost:3001/api/copier/config')
    .then(res => res.json())
    .then(data => {
      setCopierEnabled(data.enabled)
    })
    .catch(err => {
      console.error('Error cargando configuración copiadora:', err)
    })
}, [])

  const totalDrawdown = accounts.reduce(
  (sum, acc) => sum + Number(acc.remainingDrawdown || 0),
  0
)

const estimatedMarginUsed = accounts.reduce(
  (sum, acc) =>
    sum + (Number(acc.contracts || 0) * 250),
  0
)

const availableMargin = totalBalance - estimatedMarginUsed

const riskPercent =
  totalBalance > 0
    ? Math.min(
        100,
        ((totalDrawdown / totalBalance) * 100)
      ).toFixed(1)
    : 0

 const buyCount = accounts.filter(acc =>
  String(acc.positions || '').toLowerCase().includes('long')
).length

const sellCount = accounts.filter(acc =>
  String(acc.positions || '').toLowerCase().includes('short')
).length

 const rangeDays =
  performanceRange === 'all'
    ? performanceData.length || 7
    : Number(performanceRange)

const dailyPerformance =
  performanceData.length > 0
    ? performanceData.slice(-rangeDays)
    : Array.from({ length: rangeDays }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (rangeDays - 1 - i))

        return {
          day: date.toISOString().slice(0, 10),
          label: date.toLocaleDateString('es-US', {
            month: 'short',
            day: 'numeric'
          }),
          pnl: 0
        }
      })

  const pnlValues = dailyPerformance.map(d => d.pnl)
  const minPnl = Math.min(...pnlValues, -100)
  const maxPnl = Math.max(...pnlValues, 100)
  const rangePnl = maxPnl - minPnl || 1

  const chartPoints = dailyPerformance.map((d, i) => {
    const x = 40 + i * (520 / Math.max(dailyPerformance.length - 1, 1))
    const y = 210 - ((d.pnl - minPnl) / rangePnl) * 170
    return `${x},${y}`
  }).join(' ')

 const toggleCopier = () => {
  const newStatus = !copierEnabled

  setCopierEnabled(newStatus)

  fetch('http://localhost:3001/api/copier/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      enabled: newStatus
    })
  })
    .catch(() => {
      setCopierEnabled(!newStatus)
    })
}

  const saveMaster = () => {
    const selected = document.getElementById('masterSelect').value

    if (!selected) {
      alert('Selecciona una cuenta primero')
      return
    }

    fetch('http://localhost:3001/api/accounts/master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selected })
    })
      .then(res => res.json())
      .then(() => {
        alert('Master cambiada a: ' + selected)
        window.location.reload()
      })
  }

  return (
    <div className="dashboard-page">
      <section className="stats">
        <div className="stat-card">
          <div>
            <span>BALANCE TOTAL</span>
            <h2>${totalBalance.toLocaleString()}</h2>
            <p className={`pnl-today ${totalPnl >= 0 ? 'green' : 'red'}`}>
  P&L Hoy {totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toLocaleString()}
</p>
          </div>
          <div className="stat-icon purple">$</div>
        </div>

        <div className="stat-card">
          <div>
            <span>CUENTAS CONECTADAS</span>
            <h2>{accounts.length}</h2>
            <p className="blue">{masterCount} Master / {slaveCount} Slave</p>
          </div>
          <div className="stat-icon blue">👥</div>
        </div>

        <div className="stat-card">
          <div>
            <span>OPERACIONES ABIERTAS</span>
            <h2>{totalContracts}</h2>
            <p>
              <span className="green">{buyCount} Compras</span>
              {' / '}
              <span className="red">{sellCount} Ventas</span>
            </p>
          </div>
          <div className="stat-icon green">💰</div>
        </div>

        <div className="stat-card">
          <div>
            <span>ESTADO DEL SISTEMA</span>
            <h2 className="green">Operativo</h2>
            <p>Todo funcionando correctamente</p>
          </div>
         <div className="stat-icon green-solid">OK</div>
        </div>
      </section>

      <section className="dashboard-layout">
        <div className="panel performance">
          <div className="panel-head">
            <h3>Performance General</h3>
            <select
  className="period-btn"
  value={performanceRange}
  onChange={(e) => setPerformanceRange(e.target.value)}
>
  <option value="7">Últimos 7 días</option>
  <option value="14">Últimos 14 días</option>
  <option value="30">Últimos 30 días</option>
  <option value="all">Desde creación</option>
</select>
          </div>

          <div className="line-chart">
            <svg
  viewBox="0 0 620 250"
  preserveAspectRatio="none"
  onMouseLeave={() => setPerformanceTooltip(null)}
onMouseMove={(e) => {
  const svg = e.currentTarget
  const rect = svg.getBoundingClientRect()

  const mouseX = ((e.clientX - rect.left) / rect.width) * 620
  const clampedX = Math.max(40, Math.min(560, mouseX))

  const points = dailyPerformance.map((d, i) => {
    const x = 40 + i * (520 / Math.max(dailyPerformance.length - 1, 1))
    const y = 210 - ((Number(d.pnl || 0) - minPnl) / rangePnl) * 170

    return {
      x,
      y,
      pnl: Number(d.pnl || 0),
      label: d.label
    }
  })

  let leftPoint = points[0]
  let rightPoint = points[points.length - 1]

  for (let i = 0; i < points.length - 1; i++) {
    if (clampedX >= points[i].x && clampedX <= points[i + 1].x) {
      leftPoint = points[i]
      rightPoint = points[i + 1]
      break
    }
  }

  const percent =
    rightPoint.x === leftPoint.x
      ? 0
      : (clampedX - leftPoint.x) / (rightPoint.x - leftPoint.x)

  const interpolatedY =
    leftPoint.y + percent * (rightPoint.y - leftPoint.y)

  const interpolatedPnl =
    leftPoint.pnl + percent * (rightPoint.pnl - leftPoint.pnl)

  setPerformanceTooltip({
    x: clampedX,
    y: interpolatedY,
    pnl: interpolatedPnl
  })
}}
>
  <defs>
    <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
      <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
    </linearGradient>
  </defs>

  {[0, 1, 2, 3].map(i => (
    <line key={`h-${i}`} x1="40" x2="590" y1={40 + i * 55} y2={40 + i * 55} className="chart-grid" />
  ))}

  <polygon points={`40,215 ${chartPoints} 590,215`} fill="url(#lineFill)" />

  <polyline
    points={chartPoints}
    fill="none"
    stroke="#2563eb"
    strokeWidth="4"
    strokeLinecap="round"
    strokeLinejoin="round"
  />

 {performanceTooltip && (
  <>
    <line
      x1={performanceTooltip.x}
      x2={performanceTooltip.x}
      y1="35"
      y2="215"
      stroke="#94a3b8"
      strokeWidth="1"
      strokeDasharray="4 4"
    />

    <circle
      cx={performanceTooltip.x}
      cy={performanceTooltip.y}
      r="7"
      fill="#2563eb"
      stroke="white"
      strokeWidth="3"
    />

    <text
      x="310"
      y="25"
      textAnchor="middle"
      fill={performanceTooltip.pnl >= 0 ? '#22c55e' : '#ef4444'}
      fontSize="18"
      fontWeight="800"
    >
      {performanceTooltip.pnl >= 0 ? '+' : '-'}${Math.abs(performanceTooltip.pnl).toFixed(2)}
    </text>
  </>
)}

  {dailyPerformance.map((d, i) => {
    const x = 40 + i * (520 / Math.max(dailyPerformance.length - 1, 1))

    return (
      <text key={d.day} x={x} y="238" textAnchor="middle" className="chart-label">
        {d.label}
      </text>
    )
  })}

  <text x="4" y="45" className="chart-label">${maxPnl.toLocaleString()}</text>
  <text x="4" y="215" className="chart-label">${minPnl.toLocaleString()}</text>
</svg>
          </div>
        </div>

        <div className="panel connections">
          <div className="panel-head">
            <h3>Estado de Conexiones</h3>
          </div>

         {[
  { 
    icon: 'NT', 
    name: 'NinjaTrader', 
    online: accounts.length > 0 
  },
  {
    icon: 'TV',
    name: 'Tradovate',
    online: accounts.some(a =>
      a.broker === 'Tradovate' ||
      a.name?.startsWith('LFE') ||
      a.name?.startsWith('LTE') ||
      a.name?.startsWith('LFF')
    )
  },
  {
    icon: 'RH',
    name: 'Rithmic',
    online: accounts.some(a =>
      a.broker === 'Rithmic' ||
      a.name?.includes('APEX') ||
      a.name?.includes('PA-') ||
      a.name?.includes('Topstep') ||
      a.name?.includes('MFFU')
    )
  },
  { 
    icon: 'SV', 
    name: 'Servidor Principal', 
    online: true 
  }
].map(item => (
  <div className="connection-item" key={item.name}>
    <span className={`status-dot ${item.online ? 'online' : 'offline'}`}></span>
    <span className="broker-icon">{item.icon}</span>
    <b>{item.name}</b>
    <span className={item.online ? 'green' : 'red'}>
      {item.online ? 'Conectado' : 'Desconectado'}
    </span>
  </div>
))}
        </div>

<div className="panel winrate-card">
  <div className="panel-head">
    <h3>Win Rate</h3>
    <span>Trades cerrados</span>
  </div>

  {(() => {
 
const closedTrades = trades
  .filter(t => {
    const pnl = Number(t.pnl)
    return !isNaN(pnl) && pnl !== 0
  })
  .sort((a, b) => new Date(a.date) - new Date(b.date))

const wins = closedTrades.filter(t => Number(t.pnl || 0) > 0)
const losses = closedTrades.filter(t => Number(t.pnl || 0) < 0)
let currentStreak = 0
let bestWinStreak = 0
let bestLossStreak = 0

let winStreak = 0
let lossStreak = 0

closedTrades.forEach(trade => {
  const pnl = Number(trade.pnl || 0)

  if (pnl > 0) {
    winStreak++
    lossStreak = 0

    if (winStreak > bestWinStreak)
      bestWinStreak = winStreak
  }

  if (pnl < 0) {
    lossStreak++
    winStreak = 0

    if (lossStreak > bestLossStreak)
      bestLossStreak = lossStreak
  }
})

if (closedTrades.length > 0) {
  const lastTrade = Number(
    closedTrades[closedTrades.length - 1].pnl || 0
  )

  if (lastTrade > 0) {
    for (let i = closedTrades.length - 1; i >= 0; i--) {
      if (Number(closedTrades[i].pnl || 0) > 0)
        currentStreak++
      else
        break
    }
  }

  if (lastTrade < 0) {
    for (let i = closedTrades.length - 1; i >= 0; i--) {
      if (Number(closedTrades[i].pnl || 0) < 0)
        currentStreak--
      else
        break
    }
  }
}
    const winRate =
      closedTrades.length > 0
        ? ((wins.length / closedTrades.length) * 100).toFixed(1)
        : '0.0'

   const today = new Date().toISOString().slice(0, 10)

const todayTrades = closedTrades.filter(t =>
  String(t.date || '').slice(0, 10) === today
)

const tradesForSummary = todayTrades.length > 0
  ? todayTrades
  : closedTrades

const bestTrade = [...tradesForSummary].sort(
  (a, b) => Number(b.pnl || 0) - Number(a.pnl || 0)
)[0]

const worstTrade = [...tradesForSummary].sort(
  (a, b) => Number(a.pnl || 0) - Number(b.pnl || 0)
)[0]
    return (
      <>
        <div
          className="winrate-layout"
          style={{ '--winrate': Number(winRate) }}
        >
          <div className="winrate-donut">
            <div className="winrate-center">
              <h2>{winRate}%</h2>
              <span>Win Rate</span>
            </div>
          </div>

          <div className="winrate-right">
            <div className="wr-row">
              <span>Ganadoras</span>
              <b className="green">{wins.length}</b>
            </div>

            <div className="wr-row">
              <span>Perdedoras</span>
              <b className="red">{losses.length}</b>
            </div>

            <div className="wr-row">
              <span>Total</span>
              <b>{closedTrades.length}</b>
            </div>
          </div>
        </div>

 <div className="winrate-divider"></div>

<div className="streak-bar">
  <div className="streak-item">
    <span>Mejor</span>
    <b className="green">{bestWinStreak}W</b>
  </div>

  <div className="streak-item">
    <span>Peor</span>
    <b className="red">{bestLossStreak}L</b>
  </div>

  <div className="streak-item">
    <span>Actual</span>
    <b className={currentStreak >= 0 ? 'green' : 'red'}>
      {currentStreak >= 0
        ? `${currentStreak}W`
        : `${Math.abs(currentStreak)}L`}
    </b>
  </div>
</div>

<div className="trade-summary">
  <div className="trade-row">
    <span>Mejor Trade</span>
    <b className="green">
      {bestTrade
        ? `${bestTrade.symbol || '-'} +$${Number(bestTrade.pnl || 0).toLocaleString()}`
        : '-'}
    </b>
  </div>

  <div className="trade-row">
    <span>Peor Trade</span>
    <b className="red">
      {worstTrade
        ? `${worstTrade.symbol || '-'} -$${Math.abs(Number(worstTrade.pnl || 0)).toLocaleString()}`
        : '-'}
    </b>
  </div>
</div>
      </>
    )
  })()}
</div>

        <div className="panel trades">
          <div className="panel-head">
            <h3>Operaciones Abiertas</h3>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>MASTER</th>
                <th>SÍMBOLO</th>
                <th>ACCIÓN</th>
                <th>TIPO</th>
                <th>CANTIDAD</th>
                <th>PNL</th>
                <th>ESTADO</th>
                <th>HORA</th>
              </tr>
            </thead>

<tbody>
  {accounts
    .filter(acc => Number(acc.contracts || 0) > 0)
    .slice(0, 5)
    .map((acc, index) => {
      const pos = String(acc.positions || '')
      const isShort = pos.toLowerCase().includes('short')
      const isLong = pos.toLowerCase().includes('long')

      const symbol =
        pos.split(' ')[0] && pos.split(' ')[1]
          ? `${pos.split(' ')[0]} ${pos.split(' ')[1]}`
          : '-'

      return (
        <tr key={acc.id || acc.name || index}>
          <td>#{index + 1}</td>
          <td>{acc.name}</td>
          <td>{symbol}</td>
          <td className={isShort ? 'red' : 'green'}>
            {isShort ? 'VENTA' : isLong ? 'COMPRA' : '-'}
          </td>
          <td>MARKET</td>
          <td>{acc.contracts}</td>
          <td className={Number(acc.unrealizedPnl || 0) >= 0 ? 'green' : 'red'}>
            ${Number(acc.unrealizedPnl || 0).toLocaleString()}
          </td>
          <td className="green">ABIERTA</td>
          <td>En vivo</td>
        </tr>
      )
    })}

  {accounts.filter(acc => Number(acc.contracts || 0) > 0).length === 0 && (
    <tr>
      <td colSpan="9">No hay operaciones abiertas.</td>
    </tr>
  )}
</tbody>
          </table>

          <button className="see-all">Ver todas las operaciones</button>
        </div>

        <div className="panel risk-card">
          <div className="panel-head">
            <h3>Riesgo General</h3>
          </div>

          <div className="risk-content">
            <div className="risk-circle">
              <div className="risk-inner">
                <h2>{riskPercent}%</h2>
                <span>Utilizado</span>
              </div>
            </div>

            <div className="risk-stats">
             <div className="risk-row">
  <span>Equidad Total</span>
  <b>${totalBalance.toLocaleString()}</b>
</div>

<div className="risk-row">
  <span>Drawdown Disponible</span>
  <b>${totalDrawdown.toLocaleString()}</b>
</div>

<div className="risk-row">
  <span>Margen Utilizado</span>
  <b>${estimatedMarginUsed.toLocaleString()}</b>
</div>

<div className="risk-row">
  <span>Margen Disponible</span>
  <b>${availableMargin.toLocaleString()}</b>
</div>
            </div>
          </div>

          <button className="risk-btn">
            Ver detalles de riesgo
          </button>
        </div>
      </section>

      <footer className="dashboard-footer">
  <span>J&J Company Bro © 2026</span>
  <span>v{appVersion || '...'}</span>
</footer>
    </div>
  )
}

function Journal({ trades = [], openConfirm }) {
  const today = new Date()

  const [selectedDate, setSelectedDate] = useState(
    today.toISOString().slice(0, 10)
  )

const [note, setNote] = useState('')
const [notes, setNotes] = useState([])

const [popupNoteIndex, setPopupNoteIndex] = useState(null)
  const [emotion, setEmotion] = useState('')
const [screenshots, setScreenshots] = useState([])
const [checklist, setChecklist] = useState({
  followedPlan: false,
  respectedRisk: false,
  waitedSetup: false,
  noOvertrade: false
})
  const [noteSaved, setNoteSaved] = useState(false)

  const year = today.getFullYear()
  const month = today.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
const getTradeDay = (trade) => {
  const rawDate = trade.date || trade.createdAt || trade.timestamp

  if (!rawDate) return ''

  const date = new Date(rawDate)

  const nyDate = new Date(
    date.toLocaleString('en-US', {
      timeZone: 'America/New_York'
    })
  )

  const hour = nyDate.getHours()

  if (hour >= 18) {
    nyDate.setDate(nyDate.getDate() + 1)
  }

  return nyDate.toLocaleDateString('en-CA')
}
const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
  const dayNumber = i + 1
  const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
const dayTrades = trades.filter(t =>
  getTradeDay(t) === dayKey
)


  const dayPnl = dayTrades.reduce(
    (sum, t) => sum + Number(t.pnl || 0),
    0
  )

  return {
    dayNumber,
    dayKey,
    trades: dayTrades,
    pnl: dayPnl
  }
})
const selectedTrades = trades.filter(t =>
  getTradeDay(t) === selectedDate
)


  const selectedPnl = selectedTrades.reduce(
    (sum, t) => sum + Number(t.pnl || 0),
    0
  )

  const wins = selectedTrades.filter(t => Number(t.pnl || 0) > 0)
  const losses = selectedTrades.filter(t => Number(t.pnl || 0) < 0)
  const grossProfit = wins.reduce(
  (sum, t) => sum + Number(t.pnl || 0),
  0
)

const grossLoss = Math.abs(
  losses.reduce((sum, t) => sum + Number(t.pnl || 0), 0)
)

const profitFactor =
  grossLoss > 0
    ? (grossProfit / grossLoss).toFixed(2)
    : grossProfit > 0
      ? '8'
      : '-'

const selectedWinRate =
  selectedTrades.length > 0
    ? ((wins.length / selectedTrades.length) * 100).toFixed(1)
    : '-'
  useEffect(() => {
    fetch(`http://localhost:3001/api/journal/notes/${selectedDate}`)
      .then(res => res.json())
      .then(data => {
  setNote('')
setNotes(data.data?.notes || [])

  setEmotion(
    data.data?.emotion || ''
  )

 setScreenshots(
  data.data?.screenshots || []
)

  setChecklist({
    followedPlan:
      data.data?.checklist?.followedPlan || false,

    respectedRisk:
      data.data?.checklist?.respectedRisk || false,

    waitedSetup:
      data.data?.checklist?.waitedSetup || false,

    noOvertrade:
      data.data?.checklist?.noOvertrade || false
  })

  setNoteSaved(false)
})
  }, [selectedDate])

  const saveNote = () => {
    fetch('http://localhost:3001/api/journal/notes/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
  day: selectedDate,
  notes,
  emotion,
 screenshots,
  checklist
})
    })
      .then(res => res.json())
      .then(() => {
        setNoteSaved(true)

        setTimeout(() => {
          setNoteSaved(false)
        }, 2000)
      })
  }

  return (
    <div className="journal-pro-page">

      <div className="panel journal-calendar-panel">
        <div className="panel-head">
          <h3>Calendario de Trading</h3>
          <span>
            {today.toLocaleDateString('es-US', {
              month: 'long',
              year: 'numeric'
            })}
          </span>
        </div>

        <div className="journal-weekdays">
          <span>Lun</span>
          <span>Mar</span>
          <span>Mié</span>
          <span>Jue</span>
          <span>Vie</span>
          <span>Sáb</span>
          <span>Dom</span>
        </div>

        <div className="journal-calendar-grid">
          {calendarDays.map(day => (
            <button
              key={day.dayKey}
              className={`journal-calendar-day ${
                day.pnl > 0
                  ? 'profit-day'
                  : day.pnl < 0
                    ? 'loss-day'
                    : ''
              } ${
                selectedDate === day.dayKey
                  ? 'selected-day'
                  : ''
              }`}
              onClick={() => setSelectedDate(day.dayKey)}
            >
              <strong>{day.dayNumber}</strong>

              <span>
                {day.trades.length === 0
                  ? 'Sin trade'
                  : `${day.pnl > 0 ? '+' : ''}$${day.pnl.toLocaleString()}`}
              </span>
            </button>
          ))}
        </div>
      </div>
 <div className="panel journal-history-panel">
          <div className="panel-head">
            <h3>Historial del día</h3>
            <span>{selectedTrades.length} trades</span>
          </div>

          <table>
            <thead>
  <tr>
    <th>Hora</th>
    <th>Cuenta</th>
    <th>Simbolo</th>
    <th>Accion</th>
    <th>Cant.</th>
    <th>Entrada</th>
    <th>Salida</th>
    <th>PNL</th>
  </tr>
</thead>

            <tbody>
              {selectedTrades.length === 0 ? (
                <tr>
                  <td colSpan="5">No hay trades este día.</td>
                </tr>
              ) : (
                selectedTrades.map(trade => {
                  const pnl = Number(trade.pnl || 0)

                  return (
                    <tr key={trade.id}>
  <td>{trade.time || '-'}</td>

  <td>{trade.account || '-'}</td>

  <td>{trade.symbol || '-'}</td>

  <td
    className={
      String(trade.side || '').includes('SELL')
        ? 'red'
        : String(trade.side || '').includes('BUY')
        ? 'green'
        : ''
    }
  >
    {trade.side || '-'}
  </td>

  <td>{trade.quantity || '-'}</td>

  <td>
    {trade.entryPrice
      ? Number(trade.entryPrice).toFixed(2)
      : '-'}
  </td>

  <td>
    {trade.exitPrice
      ? Number(trade.exitPrice).toFixed(2)
      : '-'}
  </td>

  <td className={pnl >= 0 ? 'green' : 'red'}>
    ${Number(pnl).toFixed(2)}
  </td>
</tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      <div className="journal-side">

        <div className="panel">
          <div className="panel-head">
            <h3>Día seleccionado</h3>
            <span>{selectedDate}</span>
          </div>

          <div className="journal-day-stats">
            <div>
              <span>Trades</span>
              <b>{selectedTrades.length}</b>
            </div>
<div>
  <span>Profit Factor</span>
  <b>{profitFactor}</b>
</div>
            <div>
              <span>Win Rate</span>
              <b>{selectedWinRate}%</b>
            </div>

            <div>
              <span>PnL</span>
              <b className={selectedPnl >= 0 ? 'green' : 'red'}>
                ${selectedPnl.toLocaleString()}
              </b>
            </div>
          </div>
        </div>

       

        <div className="panel journal-notes-panel">
          <div className="panel-head">
            <h3>Notas del día</h3>
<span>{noteSaved ? 'Guardado' : 'Auto manual'}</span>
          </div>
<div className="journal-extra-fields">
  <div className="form-group">
    <label>Emoción del día</label>
    <select
      value={emotion}
      onChange={(e) => setEmotion(e.target.value)}
    >
      <option value="">Seleccionar</option>
      <option value="calmado">Calmado</option>
      <option value="ansioso">Ansioso</option>
      <option value="disciplinado">Disciplinado</option>
      <option value="frustrado">Frustrado</option>
      <option value="euforico">Eufórico</option>
    </select>
  </div>

<div className="form-group">
  <label>Screenshot</label>

 <input
  type="file"
  accept="image/*"
  multiple
  onChange={(e) => {
    const files = Array.from(e.target.files)

    files.forEach(file => {
      const reader = new FileReader()

      reader.onload = () => {
        setScreenshots(prev => [...prev, reader.result])
      }

      reader.readAsDataURL(file)
    })

    e.target.value = ''
  }}
/>
</div>
</div>

<div className="journal-checklist">
  <label>
    <input
      type="checkbox"
      checked={checklist.followedPlan}
      onChange={(e) =>
        setChecklist({
          ...checklist,
          followedPlan: e.target.checked
        })
      }
    />
    Seguí mi plan
  </label>

  <label>
    <input
      type="checkbox"
      checked={checklist.respectedRisk}
      onChange={(e) =>
        setChecklist({
          ...checklist,
          respectedRisk: e.target.checked
        })
      }
    />
    Respeté el riesgo
  </label>

  <label>
    <input
      type="checkbox"
      checked={checklist.waitedSetup}
      onChange={(e) =>
        setChecklist({
          ...checklist,
          waitedSetup: e.target.checked
        })
      }
    />
    Esperé mi setup
  </label>

  <label>
    <input
      type="checkbox"
      checked={checklist.noOvertrade}
      onChange={(e) =>
        setChecklist({
          ...checklist,
          noOvertrade: e.target.checked
        })
      }
    />
    No hice overtrading
  </label>
</div>
{screenshots.length > 0 && (
  <div className="journal-screenshot-list">
    {screenshots.map((img, index) => (
      <div className="journal-screenshot-item" key={index}>
        <img
          src={img}
          alt={`Screenshot ${index + 1}`}
          className="journal-thumb"
          onClick={() => {
            const imgWindow = window.open('', '_blank')

            if (imgWindow) {
              imgWindow.document.write(`
                <html>
                  <head>
                    <title>Screenshot ${index + 1}</title>
                    <style>
                      body {
                        margin: 0;
                        background: #111;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                      }
                      img {
                        max-width: 95vw;
                        max-height: 95vh;
                        object-fit: contain;
                      }
                    </style>
                  </head>
                  <body>
                    <img src="${img}" />
                  </body>
                </html>
              `)
              imgWindow.document.close()
            }
          }}
        />

       <button
  className="danger-btn small"
  onClick={() => {
    openConfirm({
      title: 'Eliminar captura',
      message: 'Seguro que quieres eliminar esta captura?',
      confirmText: 'Eliminar',
      onConfirm: () => {
        setScreenshots(prev =>
          prev.filter((_, i) => i !== index)
        )
      }
    })
  }}
>
  Eliminar
</button>
      </div>
    ))}
  </div>
)}
    <div className="notes-folder-list">
  {notes.map((item, index) => (
    <div
      className="note-folder"
      key={index}
      onClick={() =>
        setPopupNoteIndex(popupNoteIndex === index ? null : index)
      }
    >
      <div className="note-folder-head">
        <span>Nota {index + 1}</span>
        <small>{item.time}</small>
      </div>
    </div>
  ))}
</div>

{popupNoteIndex !== null && notes[popupNoteIndex] && (
  <div className="note-popup">
    <div className="note-popup-head">
      <b>Nota {popupNoteIndex + 1}</b>
      <button onClick={() => setPopupNoteIndex(null)}>X</button>
    </div>

    <p>{notes[popupNoteIndex].text}</p>

   <button
  className="danger-btn small"
  onClick={() => {
    openConfirm({
      title: 'Eliminar nota',
      message: 'Seguro que quieres eliminar esta nota?',
      confirmText: 'Eliminar',
      onConfirm: () => {
        setNotes(prev => prev.filter((_, i) => i !== popupNoteIndex))
        setPopupNoteIndex(null)
      }
    })
  }}
>
  Eliminar
</button>
  </div>
)}
 

<textarea
  value={note}
  onChange={(e) => setNote(e.target.value)}
  placeholder="Escribe una nueva nota..."
/>

<button
  className="success-btn"
  onClick={() => {
    if (!note.trim()) return

    const newNote = {
      text: note,
      time: new Date().toLocaleTimeString('es-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    setNotes(prev => [...prev, newNote])
    setNote('')
  }}
>
  Agregar Nota
</button>

<button
  className="success-btn"
  onClick={saveNote}
>
  {noteSaved ? 'Guardado' : 'Guardar Dia'}
</button>
        </div>

      </div>

    </div>
  )
}
function CopyTrading({
  accounts = [],
  setAccounts,
  groups = [],
  setGroups,
  newGroupName,
  setNewGroupName,
  createGroup
}) {
  const slaveAccounts = accounts.filter(acc => acc.type === 'slave')
  const [openGroupId, setOpenGroupId] = useState(null)
const [copierActive, setCopierActive] = useState(false)

const toggleCopier = () => {
  const newStatus = !copierActive

  fetch('http://localhost:3001/api/copier/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: newStatus })
  })
    .then(res => res.json())
    .then(() => setCopierActive(newStatus))
}
useEffect(() => {
  fetch('http://localhost:3001/api/copier/config')
    .then(res => res.json())
    .then(data => {
      setCopierActive(data.enabled)
    })
    .catch(err => {
      console.error(
        'Error cargando estado de copiadora:',
        err
      )
    })
}, [])
  return (
    <div className="copy-trading-layout">

     <div className="copy-left">

  <div className="copy-card copier-control-card">
    <div className="copy-table-head">
      <h3>Copiadora</h3>

      <label className="mini-switch">
        <input
          type="checkbox"
          checked={copierActive}
          onChange={toggleCopier}
        />
        <span></span>
      </label>
    </div>

    <div className="copier-control-grid">
      <div>
        <span>Estado</span>
        <b className={copierActive ? 'green' : 'red'}>
          {copierActive ? 'Encendida' : 'Apagada'}
        </b>
      </div>

      <div>
        <span>Modo</span>
        <b>Por grupo</b>
      </div>

      <div>
        <span>Grupos</span>
        <b>{groups.length}</b>
      </div>

      <div>
        <span>Cuentas Activas</span>
        <b>{slaveAccounts.filter(a => a.active).length}</b>
      </div>
    </div>
  </div>

  <div className="copy-card groups-modern">
          <div className="copy-table-head">
            <h3>Grupos de Cuentas</h3>
            <span>{groups.length} grupos</span>
          </div>

          <div className="group-create">
            <input
              placeholder="Nombre del grupo..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />

            <button onClick={createGroup}>
              Crear Grupo
            </button>
          </div>

          <div className="group-list-modern">
            {groups.map(group => (
              <div key={group.id} className="group-pill-box">

                <div
                  className="group-pill"
                  onClick={() =>
                    setOpenGroupId(
                      openGroupId === group.id ? null : group.id
                    )
                  }
                >
                  <span>📁 {group.name}</span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()

                      fetch('http://localhost:3001/api/groups/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: group.id })
                      })
                        .then(res => res.json())
                        .then(data => setGroups(data.groups))
                    }}
                  >
                    X
                  </button>
                </div>

                {openGroupId === group.id && (
                  <div className="group-accounts-box">

                    <div className="group-master-select">
                      <label>Master del grupo</label>

                      <select
                        value={group.master || ''}
                        onChange={(e) => {
                          fetch('http://localhost:3001/api/groups/set-master', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              groupId: group.id,
                              masterName: e.target.value
                            })
                          })
                            .then(res => res.json())
                            .then(data => setGroups(data.groups))
                        }}
                      >
                        <option value="">Elegir Master</option>

                        {accounts.map(acc => (
                          <option
                            key={acc.id || acc.name}
                            value={acc.name}
                          >
                            {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="group-slave-title">
                      Cuentas Slave del grupo
                    </div>

                    {slaveAccounts.map(acc => {
                      const checked =
                        Array.isArray(group.accounts) &&
                        group.accounts.includes(acc.name)

                      return (
                        <label
                          key={acc.id || acc.name}
                          className="group-account-row"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              fetch(
                                `http://localhost:3001/api/groups/${
                                  checked ? 'remove-account' : 'add-account'
                                }`,
                                {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    groupId: group.id,
                                    accountName: acc.name
                                  })
                                }
                              )
                                .then(res => res.json())
                                .then(data => setGroups(data.groups))
                            }}
                          />

                          <span>{acc.name}</span>
                          <small>{acc.broker}</small>
                        </label>
                      )
                    })}

                    <button
                      className="success-btn save-group-btn"
                      onClick={() => setOpenGroupId(null)}
                    >
                      Guardar Grupo
                    </button>

                  </div>
                )}

              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="copy-right">
        <div className="copy-card slave-panel-modern">
          <div className="copy-table-head">
            <h3>Cuentas Slave</h3>
            <span>{slaveAccounts.length} cuentas</span>
          </div>

          {slaveAccounts.map((account, index) => (
            <div
              className={`slave-card-modern color-${index}`}
              key={account.id || account.name}
            >
              <div>
                <h4>{account.name}</h4>

                <p>
                  {account.broker} —Balance ${Number(account.balance || 0).toLocaleString()}
                </p>

                <span className={account.active ? 'green' : 'red'}>
                  {account.active ? '◿Activa' : '◿No Copy'}
                </span>
              </div>

              <label className="switch">
                <input
                  type="checkbox"
                  checked={account.active}
                  onChange={() => {
                    fetch(`http://localhost:3001/api/accounts/${account.id}/toggle`, {
                      method: 'POST'
                    })
                      .then(res => res.json())
                      .then(() => {
                        fetch(`http://localhost:3001/api/accounts?email=${currentUser.email}`)
                          .then(res => res.json())
                          .then(data => setAccounts(data))
                      })
                  }}
                />

                <span></span>
              </label>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
function Accounts({ accounts = [] }) {
  const masterAccounts = accounts.filter(acc => acc.type === 'master')
  const slaveAccounts = accounts.filter(acc => acc.type === 'slave')
  const activeAccounts = accounts.filter(acc => acc.active)

  return (
    <div className="accounts-page">
      <section className="stats">
        <div className="stat-card">
          <span>Total Cuentas</span>
          <h2>{accounts.length}</h2>
          <p className="blue">Detectadas desde NinjaTrader</p>
        </div>

        <div className="stat-card">
          <span>Master</span>
          <h2>{masterAccounts.length}</h2>
          <p className="green">
            {masterAccounts[0]?.name || 'Sin master'}
          </p>
        </div>

        <div className="stat-card">
          <span>Slave</span>
          <h2>{slaveAccounts.length}</h2>
          <p className="orange">Cuentas copiadas</p>
        </div>

        <div className="stat-card">
          <span>Activas</span>
          <h2>{activeAccounts.length}</h2>
          <p className="green">Online</p>
        </div>
      </section>

      <div className="panel accounts-table">
        <div className="panel-head">
          <h3>Accounts Manager</h3>
          <span>{accounts.length} cuentas detectadas</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Cuenta</th>
              <th>Broker</th>
              <th>Tipo</th>
              <th>Balance</th>
              <th>P&L</th>
              <th>Estado</th>
			  <th>Contratos</th>
              <th>Posición</th>
			  
            </tr>
          </thead>

          <tbody>
  {accounts.map(account => (
    <tr key={account.id}>
      <td>{account.name}</td>
      <td>{account.broker}</td>
      <td>{account.type === 'master' ? '👑 Master' : '🔁 Slave'}</td>
      <td>${account.balance.toLocaleString()}</td>
      <td>${account.pnl.toLocaleString()}</td>

      <td>
        <span className={account.connected ? 'green' : 'red'}>
          {account.connected ? '◿Online' : '◿Offline'}
        </span>
      </td>

      <td>{account.contracts || 0}</td>
      <td>{account.positions || '-'}</td>

      <td>
        <input
          type="checkbox"
          checked={account.active}
          onChange={(e) => {
            fetch('http://localhost:3001/api/accounts/toggle', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                accountName: account.name,
                active: e.target.checked
              })
            })
          }}
        />
      </td>
    </tr>
  ))}
</tbody>
        </table>
      </div>
    </div>
  )
}
function getAccountRiskConfig(account) {
  const name = account.name || ''
  const broker = account.broker || ''

  if (broker === 'Lucid' || name.startsWith('LFE') || name.startsWith('LTE') || name.startsWith('LFF')) {
    return { size: '25K', defaultMaxDrawdown: 1000 }
  }

  if (broker === 'Apex' || name.includes('APEX')) {
    return { size: '50K', defaultMaxDrawdown: 2000 }
  }

  if (broker === 'Tradefy' || name.includes('TDFY')) {
    return { size: '25K', defaultMaxDrawdown: 1000 }
  }

  if (broker === 'MyFundedFutures' || name.includes('MFFU')) {
    return { size: '25K', defaultMaxDrawdown: 1000 }
  }

  return { size: 'Custom', defaultMaxDrawdown: 1000 }
}

function Drawdown({ accounts = [] }) {
  return (
    <div className="panel accounts-table">
      <div className="panel-head">
        <h3>Drawdown Manager</h3>
        <span>{accounts.length} cuentas</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Cuenta</th>
            <th>Broker</th>
            <th>Tamaño</th>
            <th>Balance</th>
            <th>DD Nivel</th>
            <th>DD Restante</th>
            <th>Riesgo</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>
          {accounts.map(acc => {
			  console.log("DRAWDOWN ACCOUNT:", acc)
            const riskConfig = getAccountRiskConfig(acc)

            const balance = Number(acc.balance || 0)

            const ddLevel = Number(
              acc.drawdown ||
              acc.trailingDrawdown ||
              acc.trailingThreshold ||
              acc.minBalance ||
              0
            )

            const maxDrawdown = Number(
              acc.maxDrawdown ||
              riskConfig.defaultMaxDrawdown
            )

          

const remainingDrawdown = Number(
  acc.remainingDrawdown ||
  acc.drawdown ||
  0
)

const drawdownUsed = maxDrawdown - remainingDrawdown

const riskUsed = Math.min(
  100,
  Math.max(0, (drawdownUsed / maxDrawdown) * 100)
)

            return (
              <tr key={acc.id || acc.name}>
                <td>{acc.name}</td>
                <td>{acc.broker}</td>
                <td>{riskConfig.size}</td>

                <td className={balance >= 0 ? 'green' : 'red'}>
                  ${balance.toLocaleString()}
                </td>

               <td>
  ${maxDrawdown.toLocaleString()}
</td>

               <td className={remainingDrawdown <= maxDrawdown * 0.25 ? 'red' : 'green'}>
  ${remainingDrawdown.toLocaleString()}
</td>

                <td>
                  <div className="risk-bar">
                    <div
                      className="risk-fill"
                      style={{ width: `${riskUsed}%` }}
                    ></div>
                  </div>
                  <span>{riskUsed.toFixed(0)}%</span>
                </td>

                <td className={riskUsed >= 80 ? 'red' : 'green'}>
                  {riskUsed >= 80 ? 'Alto Riesgo' : 'OK'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
function RiskRules({
  accounts = [],
  groups = [],
  riskRules = [],
  setRiskRules
}) {
  const [localRules, setLocalRules] =
    useState({})

  const [savedTargets, setSavedTargets] =
    useState({})

  const validAccounts = accounts.filter(account => {
    const name = String(
      account.name || ''
    ).toLowerCase()

    return (
      name &&
      !name.includes('sim101') &&
      !name.includes('playback') &&
      !name.includes('backtest') &&
      !name.includes('demo')
    )
  })

  const targets = [
    ...validAccounts.map(account => ({
      key: `ACCOUNT:${account.name}`,
      targetType: 'ACCOUNT',
      targetId: account.name,
      label: account.name,
      subtitle:
        account.broker ||
        account.accountStage ||
        'Cuenta individual'
    })),

    ...groups.map(group => ({
      key: `GROUP:${group.id}`,
      targetType: 'GROUP',
      targetId: String(group.id),
      label: group.name,
      subtitle:
        `${Array.isArray(group.accounts)
          ? group.accounts.length
          : 0} cuentas`
    }))
  ]

  const getRule = target => {
    return (
      localRules[target.key] ||
      riskRules.find(rule => {
        /*
          Compatibilidad con reglas nuevas.
        */
        if (
          rule.targetType &&
          rule.targetId !== undefined
        ) {
          return (
            String(rule.targetType).toUpperCase() ===
              target.targetType &&
            String(rule.targetId) ===
              String(target.targetId)
          )
        }

        /*
          Compatibilidad con reglas antiguas
          basadas únicamente en groupId.
        */
        return (
          target.targetType === 'GROUP' &&
          String(rule.groupId) ===
            String(target.targetId)
        )
      }) || {
        targetType: target.targetType,
        targetId: target.targetId,
        maxDailyLoss: 0,
        maxDailyProfit: 0,
        drawdownAlertPercent: 50,
        autoBlock: false
      }
    )
  }

  const changeLocalRule = (
    target,
    field,
    value
  ) => {
    const current = getRule(target)

    setSavedTargets(previous => ({
      ...previous,
      [target.key]: false
    }))

    setLocalRules(previous => ({
      ...previous,

      [target.key]: {
        ...current,

        targetType: target.targetType,
        targetId: target.targetId,

        [field]:
          field === 'autoBlock'
            ? Boolean(value)
            : value === ''
              ? ''
              : Number(value)
      }
    }))
  }

  const saveRule = target => {
    const rule = getRule(target)

    const cleanRule = {
      targetType: target.targetType,
      targetId: target.targetId,

      maxDailyLoss: Number(
        rule.maxDailyLoss || 0
      ),

      maxDailyProfit: Number(
        rule.maxDailyProfit || 0
      ),

      drawdownAlertPercent: Number(
        rule.drawdownAlertPercent || 50
      ),

      autoBlock: Boolean(
        rule.autoBlock
      )
    }

    fetch(
      'http://localhost:3001/api/risk/rules/save',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify(cleanRule)
      }
    )
      .then(async response => {
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
            'No se pudo guardar la regla'
          )
        }

        return data
      })
      .then(data => {
        setRiskRules(
          Array.isArray(data.rules)
            ? data.rules
            : []
        )

        setSavedTargets(previous => ({
          ...previous,
          [target.key]: true
        }))

        setTimeout(() => {
          setSavedTargets(previous => ({
            ...previous,
            [target.key]: false
          }))
        }, 2000)
      })
      .catch(error => {
        console.error(
          'Error guardando regla:',
          error
        )

        alert(
          error.message ||
          'Error guardando regla'
        )
      })
  }

  return (
    <div className="panel accounts-table">
      <div className="panel-head">
        <div>
          <h3>Risk Rules</h3>

          <p className="muted">
            Configura límites por cuenta
            individual o por grupo.
          </p>
        </div>

        <span>
          {validAccounts.length} cuentas ·{' '}
          {groups.length} grupos
        </span>
      </div>

      {targets.length === 0 ? (
        <div className="empty-state">
          No hay cuentas ni grupos disponibles.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Aplicar a</th>
              <th>Tipo</th>
              <th>Max Loss Día</th>
              <th>Max Profit Día</th>
              <th>Alerta DD %</th>
              <th>Auto Block</th>
              <th>Guardar</th>
            </tr>
          </thead>

          <tbody>
            {targets.map(target => {
              const rule =
                getRule(target)

              return (
                <tr key={target.key}>
                  <td>
                    <strong>
                      {target.label}
                    </strong>

                    <div className="muted">
                      {target.subtitle}
                    </div>
                  </td>

                  <td>
                    <span
                      className={
                        target.targetType ===
                        'ACCOUNT'
                          ? 'status-badge connected'
                          : 'status-badge'
                      }
                    >
                      {target.targetType ===
                      'ACCOUNT'
                        ? 'Cuenta'
                        : 'Grupo'}
                    </span>
                  </td>

                  <td>
                    <input
                      type="number"
                      min="0"
                      value={
                        rule.maxDailyLoss
                      }
                      onChange={event =>
                        changeLocalRule(
                          target,
                          'maxDailyLoss',
                          event.target.value
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      min="0"
                      value={
                        rule.maxDailyProfit
                      }
                      onChange={event =>
                        changeLocalRule(
                          target,
                          'maxDailyProfit',
                          event.target.value
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={
                        rule
                          .drawdownAlertPercent
                      }
                      onChange={event =>
                        changeLocalRule(
                          target,
                          'drawdownAlertPercent',
                          event.target.value
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="checkbox"
                      checked={
                        Boolean(
                          rule.autoBlock
                        )
                      }
                      onChange={event =>
                        changeLocalRule(
                          target,
                          'autoBlock',
                          event.target.checked
                        )
                      }
                    />
                  </td>

                  <td>
                    <button
                      onClick={() =>
                        saveRule(target)
                      }
                    >
                      {savedTargets[
                        target.key
                      ]
                        ? 'Guardado ✓'
                        : 'Guardar'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
function AdvancedMetricsLocked({
  setActivePage
}) {
  return (
    <div className="elite-upgrade-page">
      <div className="advanced-locked-icon">
        🔒
      </div>

      <h1>Advanced Metrics</h1>

      <p>
        Desbloquea métricas profesionales,
        evaluaciones, payouts y análisis de
        riesgo para tus cuentas.
      </p>

      <div className="demo-metrics-blur">
        <div className="metric-card">
          <span>Expectancy</span>
          <h2>+$24.50</h2>
          <p>Promedio esperado por trade</p>
        </div>

        <div className="metric-card">
          <span>Risk Reward</span>
          <h2>2.10R</h2>
          <p>Relación riesgo beneficio</p>
        </div>

        <div className="metric-card">
          <span>Prop Firm Score</span>
          <h2>92/100</h2>
          <p>Puntuación profesional</p>
        </div>

        <div className="metric-card">
          <span>Consistency</span>
          <h2>87%</h2>
          <p>Estabilidad de resultados</p>
        </div>
      </div>

      <button
        className="elite-upgrade-btn"
        onClick={() =>
          setActivePage('Subscriptions')
        }
      >
        Ver planes disponibles
      </button>
    </div>
  )
}
function AdvancedMetrics({
  trades = [],
  accounts = [],
  plan = 'FREE',
  section = 'summary'
}) {
  const closedTrades = trades
    .filter(t => {
      const pnl = Number(t.pnl)
      return !isNaN(pnl) && pnl !== 0
    })
    .sort((a, b) => new Date(a.date || a.createdAt || a.time) - new Date(b.date || b.createdAt || b.time))

  const wins = closedTrades.filter(t => Number(t.pnl) > 0)
  const losses = closedTrades.filter(t => Number(t.pnl) < 0)
const isPro = plan === 'PRO'
const isElite = plan === 'ELITE'
  const totalPnL = closedTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0)
  const grossProfit = wins.reduce((sum, t) => sum + Number(t.pnl || 0), 0)
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + Number(t.pnl || 0), 0))

  const winRate = closedTrades.length ? wins.length / closedTrades.length : 0
  const lossRate = closedTrades.length ? losses.length / closedTrades.length : 0

  const avgWin = wins.length ? grossProfit / wins.length : 0
  const avgLoss = losses.length ? grossLoss / losses.length : 0

  const expectancy = (winRate * avgWin) - (lossRate * avgLoss)
  const riskReward = avgLoss > 0 ? avgWin / avgLoss : 0
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0

  let bestWinStreak = 0
  let bestLossStreak = 0
  let winStreak = 0
  let lossStreak = 0

  closedTrades.forEach(t => {
    const pnl = Number(t.pnl || 0)

    if (pnl > 0) {
      winStreak++
      lossStreak = 0
      bestWinStreak = Math.max(bestWinStreak, winStreak)
    }

    if (pnl < 0) {
      lossStreak++
      winStreak = 0
      bestLossStreak = Math.max(bestLossStreak, lossStreak)
    }
  })

  const groupBy = (keyFn) => {
    const map = {}

    closedTrades.forEach(t => {
      const key = keyFn(t) || 'Desconocido'
      if (!map[key]) {
        map[key] = {
          key,
          trades: 0,
          pnl: 0,
          wins: 0,
          losses: 0
        }
      }

      map[key].trades++
      map[key].pnl += Number(t.pnl || 0)

      if (Number(t.pnl || 0) > 0) map[key].wins++
      if (Number(t.pnl || 0) < 0) map[key].losses++
    })

    return Object.values(map).sort((a, b) => b.pnl - a.pnl)
  }

  const byInstrument = groupBy(t => t.symbol)
  const byAccount = groupBy(t => t.account)
  const byBroker = groupBy(t => {
    const acc = accounts.find(a => a.name === t.account)
    return acc?.broker || t.broker || 'Desconocido'
  })

  const byHour = groupBy(t => {
    const rawDate = t.date || t.createdAt || t.timestamp || t.time
    if (!rawDate) return 'Sin hora'

    const d = new Date(rawDate)
    const hour = d.getHours().toString().padStart(2, '0')
    return `${hour}:00`
  })

  const byDay = groupBy(t => {
    const rawDate = t.date || t.createdAt || t.timestamp || t.time
    if (!rawDate) return 'Sin día'

    return new Date(rawDate).toLocaleDateString('es-US', {
      weekday: 'long'
    })
  })

  const maxDrawdown = calculateMaxDrawdown(closedTrades)
  const recoveryFactor = maxDrawdown > 0 ? totalPnL / maxDrawdown : 0

  const bestDay = byDay[0]
  const bestHour = byHour[0]
  const bestInstrument = byInstrument[0]

  const biggestTrade = [...closedTrades].sort((a, b) => Number(b.pnl) - Number(a.pnl))[0]
  const worstTrade = [...closedTrades].sort((a, b) => Number(a.pnl) - Number(b.pnl))[0]

  const largestDayProfit = Math.max(...byDay.map(d => d.pnl), 0)
  const consistencyScore =
    totalPnL > 0 && largestDayProfit > 0
      ? Math.max(0, Math.min(100, 100 - ((largestDayProfit / totalPnL) * 100))).toFixed(1)
      : '0.0'

  const propFirmScore = calculatePropFirmScore({
    winRate,
    profitFactor,
    riskReward,
    recoveryFactor,
    consistencyScore: Number(consistencyScore)
  })

  const violationRisk = getViolationRisk(accounts)

 return (
  <div className="advanced-page">

    {section === 'summary' && (
      <>
        <AdvancedPageHeader
          title="Resumen"
          subtitle="Indicadores principales de tu rendimiento como trader."
        />

        <section className="advanced-stats">
          <MetricCard
            title="Expectancy"
            value={`$${expectancy.toFixed(2)}`}
            subtitle="Promedio esperado por trade"
          />

          <MetricCard
            title="Avg Winner"
            value={`$${avgWin.toFixed(2)}`}
            subtitle="Promedio trade ganador"
          />

          <MetricCard
            title="Avg Loser"
            value={`$${avgLoss.toFixed(2)}`}
            subtitle="Promedio trade perdedor"
          />

          <MetricCard
            title="Risk Reward"
            value={`${riskReward.toFixed(2)}R`}
            subtitle="Ganancia promedio / pérdida promedio"
          />

          <MetricCard
            title="Profit Factor"
            value={profitFactor.toFixed(2)}
            subtitle="Gross Profit / Gross Loss"
          />

          <MetricCard
            title="Best Win Streak"
            value={`${bestWinStreak} W`}
            subtitle="Mayor racha ganadora"
          />

          <MetricCard
            title="Best Loss Streak"
            value={`${bestLossStreak} L`}
            subtitle="Mayor racha perdedora"
          />

          <MetricCard
            title="Recovery Factor"
            value={recoveryFactor.toFixed(2)}
            subtitle="Profit neto / max drawdown"
          />

          <MetricCard
            title="Consistency"
            value={`${consistencyScore}%`}
            subtitle="Estabilidad de ganancias"
          />

          <MetricCard
            title="Prop Firm Score"
            value={`${propFirmScore}/100`}
            subtitle="Puntuación J&J"
          />
        </section>

        <section className="advanced-summary-grid">
          <div className="panel">
            <div className="panel-head">
              <h3>Resumen Profesional</h3>
            </div>

            <div className="advanced-summary">
              <div className="advanced-summary-row">
                <span>Mejor instrumento</span>
                <strong>
                  {bestInstrument?.key || '-'}
                </strong>
              </div>

              <div className="advanced-summary-row">
                <span>Mejor hora</span>
                <strong>
                  {bestHour?.key || '-'}
                </strong>
              </div>

              <div className="advanced-summary-row">
                <span>Mejor día</span>
                <strong>
                  {bestDay?.key || '-'}
                </strong>
              </div>

              <div className="advanced-summary-row">
                <span>Mejor trade</span>
                <strong className="green">
                  {biggestTrade
                    ? `${biggestTrade.symbol || '-'} +$${Number(
                        biggestTrade.pnl
                      ).toFixed(2)}`
                    : '-'}
                </strong>
              </div>

              <div className="advanced-summary-row">
                <span>Peor trade</span>
                <strong className="red">
                  {worstTrade
                    ? `${worstTrade.symbol || '-'} -$${Math.abs(
                        Number(worstTrade.pnl)
                      ).toFixed(2)}`
                    : '-'}
                </strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>Estado General</h3>
            </div>

            <div
              className={
                `risk-level ${
                  violationRisk.levelClass
                }`
              }
            >
              <h2>{violationRisk.level}</h2>
              <p>{violationRisk.message}</p>
            </div>
          </div>
        </section>
      </>
    )}

    {section === 'performance' && (
      <>
        <AdvancedPageHeader
          title="Rendimiento"
          subtitle="Resultados agrupados por cuenta, instrumento, broker y horario."
        />

        <section className="advanced-grid">
          <AdvancedTable
            title="Profit por Cuenta"
            rows={byAccount}
          />

          <AdvancedTable
            title="Profit por Instrumento"
            rows={byInstrument}
          />

          <AdvancedTable
            title="Profit por Broker"
            rows={byBroker}
          />

          <AdvancedTable
            title="Hora más rentable"
            rows={byHour}
          />

          <AdvancedTable
            title="Día más rentable"
            rows={byDay}
          />
        </section>
      </>
    )}

    {section === 'accounts' && (
      <>
        <AdvancedPageHeader
          title="Cuentas Prop"
          subtitle={`${accounts.length} cuentas detectadas en la plataforma.`}
        />

        <AdvancedAccountsTable
          accounts={accounts}
        />
      </>
    )}

    {section === 'payouts' && (
      <>
        <AdvancedPageHeader
          title="Payouts"
          subtitle="Seguimiento de cuentas financiadas, días válidos y retiros."
        />

        <PayoutSimulator
          accounts={accounts}
          trades={closedTrades}
        />
      </>
    )}

    {section === 'evaluations' && (
      <>
        <AdvancedPageHeader
          title="Evaluaciones"
          subtitle="Progreso de las cuentas pendientes de financiación."
        />

        <EvaluationTracker
          accounts={accounts}
        />
      </>
    )}

    {section === 'risk' && (
      <>
        <AdvancedPageHeader
          title="Riesgo"
          subtitle="Estado del drawdown y riesgo de violación de las cuentas."
        />

        <section className="advanced-risk-grid">
          <div className="panel">
            <div className="panel-head">
              <h3>Riesgo de Violación</h3>
            </div>

            <div
              className={
                `risk-level ${
                  violationRisk.levelClass
                }`
              }
            >
              <h2>{violationRisk.level}</h2>
              <p>{violationRisk.message}</p>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>MFE / MAE</h3>
            </div>

            <p className="muted">
              Pendiente de captura en vivo desde
              el AddOn.
            </p>

            <div className="advanced-placeholder-grid">
              <div>
                <span>MFE promedio</span>
                <strong>—</strong>
              </div>

              <div>
                <span>MAE promedio</span>
                <strong>—</strong>
              </div>

              <div>
                <span>Salidas anticipadas</span>
                <strong>—</strong>
              </div>

              <div>
                <span>Trades en riesgo</span>
                <strong>—</strong>
              </div>
            </div>
          </div>
        </section>
      </>
    )}

  </div>
)
}
function AdvancedPageHeader({
  title,
  subtitle
}) {
  return (
    <div className="advanced-page-header">
      <div>
        <span className="advanced-page-kicker">
          Advanced Metrics
        </span>

        <h1>{title}</h1>

        <p>{subtitle}</p>
      </div>
    </div>
  )
}

function AdvancedAccountsTable({
  accounts = []
}) {
  const normalizedAccounts = accounts.map(
    account => {
      const stage = String(
        account.accountStage ||
        account.stage ||
        account.type ||
        'Sin clasificar'
      ).toUpperCase()

      const balance = Number(
        account.balance ||
        account.cashValue ||
        account.netLiquidation ||
        0
      )

      const pnl = Number(
        account.pnl ||
        account.profit ||
        account.evaluationProfit ||
        0
      )

      const remainingDrawdown = Number(
        account.remainingDrawdown ||
        0
      )

      return {
        ...account,
        displayName:
          account.name ||
          account.account ||
          account.accountName ||
          'Cuenta',

        stage,
        balance,
        pnl,
        remainingDrawdown
      }
    }
  )

  return (
    <div className="panel advanced-accounts-panel">
      <div className="panel-head">
        <h3>Listado de cuentas</h3>

        <span>
          {normalizedAccounts.length} cuentas
        </span>
      </div>

      <div className="advanced-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Cuenta</th>
              <th>Broker</th>
              <th>Etapa</th>
              <th>Balance</th>
              <th>PnL</th>
              <th>Drawdown disponible</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            {normalizedAccounts.map(
              (account, index) => (
                <tr
                  key={
                    account.id ||
                    account.displayName ||
                    index
                  }
                >
                  <td>
                    <strong>
                      {account.displayName}
                    </strong>
                  </td>

                  <td>
                    {account.broker || '-'}
                  </td>

                  <td>
                    <span
                      className={
                        `account-stage-badge ${
                          account.stage === 'FUNDED'
                            ? 'funded'
                            : account.stage ===
                                'EVALUATION'
                              ? 'evaluation'
                              : ''
                        }`
                      }
                    >
                      {account.stage}
                    </span>
                  </td>

                  <td>
                    ${account.balance.toFixed(2)}
                  </td>

                  <td
                    className={
                      account.pnl >= 0
                        ? 'green'
                        : 'red'
                    }
                  >
                    {account.pnl >= 0 ? '+' : '-'}
                    ${Math.abs(
                      account.pnl
                    ).toFixed(2)}
                  </td>

                  <td>
                    ${account.remainingDrawdown.toFixed(
                      2
                    )}
                  </td>

                  <td>
                    <span
                      className={
                        account.active === false
                          ? 'status-badge offline'
                          : 'status-badge online'
                      }
                    >
                      {account.active === false
                        ? 'Inactiva'
                        : 'Activa'}
                    </span>
                  </td>
                </tr>
              )
            )}

            {normalizedAccounts.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  className="empty-table-message"
                >
                  No hay cuentas detectadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
function MetricCard({ title, value, subtitle }) {
  return (
    <div className="metric-card">
      <span>{title}</span>
      <h2>{value}</h2>
      <p>{subtitle}</p>
    </div>
  )
}

function AdvancedTable({ title, rows }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>{title}</h3>
      </div>

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Trades</th>
            <th>PnL</th>
            <th>Win Rate</th>
          </tr>
        </thead>

        <tbody>
          {rows.slice(0, 8).map(row => {
            const wr = row.trades > 0
              ? ((row.wins / row.trades) * 100).toFixed(1)
              : '0.0'

            return (
              <tr key={row.key}>
                <td>{row.key}</td>
                <td>{row.trades}</td>
                <td className={row.pnl >= 0 ? 'green' : 'red'}>
                  {row.pnl >= 0 ? '+' : '-'}${Math.abs(row.pnl).toFixed(2)}
                </td>
                <td>{wr}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function calculateMaxDrawdown(trades) {
  let equity = 0
  let peak = 0
  let maxDD = 0

  trades.forEach(t => {
    equity += Number(t.pnl || 0)

    if (equity > peak) peak = equity

    const dd = peak - equity
    if (dd > maxDD) maxDD = dd
  })

  return maxDD
}

function calculatePropFirmScore({
  winRate,
  profitFactor,
  riskReward,
  recoveryFactor,
  consistencyScore
}) {
  let score = 0

  score += Math.min(25, winRate * 25)
  score += Math.min(25, profitFactor * 10)
  score += Math.min(20, riskReward * 10)
  score += Math.min(15, recoveryFactor * 5)
  score += Math.min(15, consistencyScore * 0.15)

  return Math.round(Math.min(100, score))
}

function getViolationRisk(accounts) {
  const riskyAccounts = accounts.filter(acc => {
    const remaining = Number(acc.remainingDrawdown || 0)
    const maxDD = Number(acc.drawdown || acc.maxDrawdown || 1000)

    if (maxDD <= 0) return false

    return remaining / maxDD <= 0.25
  })

  if (riskyAccounts.length > 0) {
    return {
      level: 'CRÍTICO',
      levelClass: 'critical',
      message: 'Una o más cuentas tienen menos del 25% de drawdown disponible.'
    }
  }

  const moderateAccounts = accounts.filter(acc => {
    const remaining = Number(acc.remainingDrawdown || 0)
    const maxDD = Number(acc.drawdown || acc.maxDrawdown || 1000)

    if (maxDD <= 0) return false

    return remaining / maxDD <= 0.5
  })

  if (moderateAccounts.length > 0) {
    return {
      level: 'MODERADO',
      levelClass: 'moderate',
      message: 'Algunas cuentas están usando más del 50% del drawdown.'
    }
  }

  return {
    level: 'SEGURO',
    levelClass: 'safe',
    message: 'Las cuentas están dentro de un rango saludable.'
  }
}
function EvaluationTracker({ accounts = [] }) {
  const evaluations = accounts
    .filter(account => {
      const stage = String(
        account.accountStage || ''
      ).toUpperCase()

      return stage === 'EVALUATION'
    })
    .map(account => {
      const target = Number(
        account.evaluationProfitTarget ||
        account.profitTarget ||
        1500
      )

      const profit = Number(
        account.evaluationProfit ||
        0
      )

      const missing = Math.max(
        0,
        Number(
          account.evaluationProfitMissing ??
          target - profit
        )
      )

      const progress =
        target > 0
          ? Math.min(
              100,
              (profit / target) * 100
            )
          : 0

      return {
        name:
          account.name ||
          account.account ||
          account.accountName ||
          'Cuenta',

        target,
        profit,
        missing,
        progress,
        passed:
          account.evaluationPassed === true
      }
    })

  if (evaluations.length === 0) {
    return null
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Evaluaciones</h3>
          <p className="muted">
            Progreso de las cuentas pendientes
            de financiación.
          </p>
        </div>
      </div>

      <div className="payout-account-list">
        {evaluations.map(account => (
          <div
            key={account.name}
            className={
              `payout-account-card ${
                account.passed
                  ? 'eligible'
                  : 'progress'
              }`
            }
          >
            <div className="payout-account-header">
              <div>
                <strong>{account.name}</strong>
                <span>Evaluation</span>
              </div>

              <span
                className={
                  `payout-status ${
                    account.passed
                      ? 'eligible'
                      : 'progress'
                  }`
                }
              >
                {account.passed
                  ? 'Superada'
                  : 'En progreso'}
              </span>
            </div>

            <div className="payout-account-grid">
              <div>
                <span>Profit actual</span>
                <strong className="green">
                  ${account.profit.toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Objetivo</span>
                <strong>
                  ${account.target.toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Falta para pasar</span>
                <strong
                  className={
                    account.missing === 0
                      ? 'green'
                      : 'red'
                  }
                >
                  ${account.missing.toFixed(2)}
                </strong>
              </div>
            </div>

            <div className="payout-progress">
              <div
                className="payout-progress-fill"
                style={{
                  width:
                    `${account.progress}%`
                }}
              />
            </div>

            <div className="payout-progress-text">
              {account.progress.toFixed(0)}%
              {' '}del objetivo
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
function PayoutSimulator({ accounts = [], trades = [] }) {
  const normalizeText = value =>
    String(value || '').trim().toLowerCase()

  const getAccountName = account =>
    String(
      account.account ||
      account.accountName ||
      account.name ||
      account.displayName ||
      account.display_name ||
      account.id ||
      ''
    ).trim()

  const getTradeAccountName = trade =>
    String(
      trade.account ||
      trade.accountName ||
      trade.account_name ||
      trade.displayName ||
      trade.name ||
      ''
    ).trim()

  const detectFirm = account => {
    const text = normalizeText(
      `${getAccountName(account)} ${account.broker || ''} ${account.firm || ''}`
    )

    if (
      text.includes('lucid') ||
      text.includes('lff') ||
      text.includes('lfe') ||
      text.includes('lte')
    ) {
      return 'Lucid'
    }

    if (
      text.includes('mffu') ||
      text.includes('myfunded')
    ) {
      return 'MFFU'
    }

    if (
      text.includes('tradeify') ||
      text.includes('tradefy') ||
      text.includes('tdfy')
    ) {
      return 'Tradeify'
    }

    if (text.includes('apex')) {
      return 'Apex'
    }

    if (text.includes('topstep')) {
      return 'Topstep'
    }

    return (
      account.broker ||
      account.firm ||
      'No detectada'
    )
  }

  const getPayoutRules = account => {
    if (account.payoutRules) {
      return {
        requiredDays: Number(
          account.payoutRules.requiredDays ?? 5
        ),

        minimumDailyProfit: Number(
          account.payoutRules.minimumDailyProfit ?? 100
        ),

        payoutPercent: Number(
          account.payoutRules.payoutPercent ?? 1
        ),

        minimumPayout: Number(
          account.payoutRules.minimumPayout ?? 500
        ),

        maximumPayout: Number(
          account.payoutRules.maximumPayout ?? 1000
        )
      }
    }

    const firm = detectFirm(account)

    if (firm === 'Lucid') {
      return {
        requiredDays: 5,
        minimumDailyProfit: 100,
        payoutPercent: 0.5,
        minimumPayout: 500,
        maximumPayout: 1000
      }
    }

    return {
      requiredDays: 5,
      minimumDailyProfit: 100,
      payoutPercent: 1,
      minimumPayout: 500,
      maximumPayout: 1000
    }
  }

  const getAccountStartingBalance = account => {
    const explicitStarting = Number(
      account.startingBalance ??
      account.initialBalance ??
      account.accountSize ??
      account.startBalance
    )

    if (
      Number.isFinite(explicitStarting) &&
      explicitStarting > 0
    ) {
      return explicitStarting
    }

    const text = normalizeText(
      `${getAccountName(account)} ${account.plan || ''} ${account.type || ''}`
    )

    if (
      text.includes('150k') ||
      text.includes('150000')
    ) {
      return 150000
    }

    if (
      text.includes('100k') ||
      text.includes('100000')
    ) {
      return 100000
    }

    if (
      text.includes('50k') ||
      text.includes('50000')
    ) {
      return 50000
    }

    return 25000
  }

  const getAccountCurrentBalance = account => {
    const possibleBalances = [
      account.balance,
      account.cashValue,
      account.cash,
      account.netLiquidation,
      account.netLiq,
      account.accountValue
    ]

    for (const value of possibleBalances) {
      const number = Number(value)

      if (
        Number.isFinite(number) &&
        number > 0
      ) {
        return number
      }
    }

    return 0
  }

  const getMatchingTrades = account => {
    const accountName = normalizeText(
      getAccountName(account)
    )

    return trades.filter(trade => {
      const tradeAccount = normalizeText(
        getTradeAccountName(trade)
      )

      if (!accountName || !tradeAccount) {
        return false
      }

      return (
        tradeAccount === accountName ||
        tradeAccount.includes(accountName) ||
        accountName.includes(tradeAccount)
      )
    })
  }

  const getAccountProfit = account => {
    const cycleProfitFields = [
      account.cycleProfit,
      account.payoutCycleProfit,
      account.profitSincePayout
    ]

    for (const value of cycleProfitFields) {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        const number = Number(value)

        if (Number.isFinite(number)) {
          return number
        }
      }
    }

    const currentBalance =
      getAccountCurrentBalance(account)

    const startingBalance =
      getAccountStartingBalance(account)

    if (
      currentBalance > 0 &&
      startingBalance > 0
    ) {
      return currentBalance - startingBalance
    }

    return getMatchingTrades(account).reduce(
      (sum, trade) =>
        sum + Number(trade.pnl || 0),
      0
    )
  }

  const getTradingDay = trade => {
    const rawDate =
      trade.closedAt ||
      trade.exitTime ||
      trade.createdAt ||
      trade.date ||
      trade.time ||
      trade.timestamp ||
      ''

    if (!rawDate) {
      return ''
    }

    const parsedDate = new Date(rawDate)

    if (!Number.isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear()

      const month = String(
        parsedDate.getMonth() + 1
      ).padStart(2, '0')

      const day = String(
        parsedDate.getDate()
      ).padStart(2, '0')

      return `${year}-${month}-${day}`
    }

    return String(rawDate).slice(0, 10)
  }

  const getAccountDailyResults = account => {
    const dailyResults = {}

    getMatchingTrades(account).forEach(trade => {
      const tradingDay = getTradingDay(trade)

      if (!tradingDay) {
        return
      }

      dailyResults[tradingDay] =
        Number(dailyResults[tradingDay] || 0) +
        Number(trade.pnl || 0)
    })

    return dailyResults
  }

  const isValidAccount = account => {
  const name = normalizeText(
    getAccountName(account)
  )

  const status = normalizeText(
    account.status ||
    account.accountStatus ||
    ''
  )

  const stage = normalizeText(
    account.accountStage ||
    account.stage ||
    ''
  )

  const isSimulation =
    name === 'sim101' ||
    name.includes('playback') ||
    name.includes('backtest') ||
    name.includes('demo')

  const isFailed =
    stage === 'failed' ||
    status.includes('failed') ||
    status.includes('breached') ||
    status.includes('blown') ||
    status.includes('burned') ||
    status.includes('closed')

  const isFunded =
    stage === 'funded'

  return (
    Boolean(name) &&
    isFunded &&
    !isSimulation &&
    !isFailed
  )
}
 
  const payoutAccounts = accounts
    .filter(isValidAccount)
    .map(account => {
      const accountName =
        getAccountName(account)

      const firm =
        detectFirm(account)

      const rules =
        getPayoutRules(account)

      const rawCycleProfit =
        getAccountProfit(account)

      const cycleProfit = Math.max(
        0,
        Number(rawCycleProfit || 0)
      )

      const dailyResults =
        getAccountDailyResults(account)

      const calculatedValidDays =
        Object.values(dailyResults)
          .filter(dayProfit => {
            return (
              Number(dayProfit) >=
              rules.minimumDailyProfit
            )
          })
          .length

      /*
        Si en el futuro el backend envía los días
        oficiales de payout, tienen prioridad.
      */
      const officialValidDays = Number(
        account.validPayoutDays ??
        account.payoutDays ??
        account.validDays
      )

      const validDays =
        Number.isFinite(officialValidDays) &&
        officialValidDays >= 0
          ? officialValidDays
          : calculatedValidDays

      const payoutPercent =
        rules.payoutPercent > 0
          ? rules.payoutPercent
          : 1

      const requiredCycleProfit =
        rules.minimumPayout /
        payoutPercent

      const profitMissing = Math.max(
        0,
        requiredCycleProfit - cycleProfit
      )

      const daysMissing = Math.max(
        0,
        rules.requiredDays - validDays
      )

      const estimatedPayout = Math.max(
        0,
        Math.min(
          rules.maximumPayout,
          cycleProfit * payoutPercent
        )
      )

      const eligible =
        daysMissing === 0 &&
        profitMissing === 0

      const progressPercent =
        requiredCycleProfit > 0
          ? Math.min(
              100,
              (
                cycleProfit /
                requiredCycleProfit
              ) * 100
            )
          : 0

      let status = 'En progreso'
      let statusClass = 'progress'

      if (eligible) {
        status = 'Elegible'
        statusClass = 'eligible'
      } else if (
        daysMissing <= 2 ||
        profitMissing <= 300
      ) {
        status = 'Próxima'
        statusClass = 'near'
      }

      return {
        accountName,
        firm,
        cycleProfit,
        validDays,
        daysMissing,
        requiredCycleProfit,
        profitMissing,
        estimatedPayout,
        progressPercent,
        eligible,
        status,
        statusClass,
        rules
      }
    })
    .sort((a, b) => {
      if (a.eligible !== b.eligible) {
        return a.eligible ? -1 : 1
      }

      if (a.daysMissing !== b.daysMissing) {
        return a.daysMissing - b.daysMissing
      }

      return a.profitMissing - b.profitMissing
    })

  console.log(
    'CUENTAS CALCULADAS PARA PAYOUT:',
    payoutAccounts
  )

  if (payoutAccounts.length === 0) {
    return (
      <div className="payout-empty">
        No se detectaron cuentas funded activas
        con información suficiente para calcular
        el próximo payout.
      </div>
    )
  }

  return (
    <div className="payout-simulator">
      <div className="payout-list-header">
        <div>
          <strong>
            Cuentas próximas a payout
          </strong>

          <p className="muted">
            Ordenadas desde la más cercana hasta
            la más lejana.
          </p>
        </div>

        <span className="payout-count">
          {payoutAccounts.length}
        </span>
      </div>

      <div className="payout-account-list">
        {payoutAccounts.map(account => (
          <div
            key={account.accountName}
            className={
              `payout-account-card ${account.statusClass}`
            }
          >
            <div className="payout-account-header">
              <div>
                <strong>
                  {account.accountName}
                </strong>

                <span>{account.firm}</span>
              </div>

              <span
                className={
                  `payout-status ${account.statusClass}`
                }
              >
                {account.status}
              </span>
            </div>

            <div className="payout-account-grid">
              <div>
                <span>Profit del ciclo</span>

                <strong className="green">
                  ${account.cycleProfit.toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Días válidos</span>

                <strong>
                  {account.validDays} /{' '}
                  {account.rules.requiredDays}
                </strong>
              </div>

              <div>
                <span>Días faltantes</span>

                <strong>
                  {account.daysMissing}
                </strong>
              </div>

              <div>
                <span>
                  Falta para payout mínimo
                </span>

                <strong
                  className={
                    account.profitMissing === 0
                      ? 'green'
                      : 'red'
                  }
                >
                  ${account.profitMissing.toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Payout estimado</span>

                <strong>
                  ${account.estimatedPayout.toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Profit requerido</span>

                <strong>
                  ${account.requiredCycleProfit.toFixed(2)}
                </strong>
              </div>
            </div>

            <div className="payout-progress">
              <div
                className="payout-progress-fill"
                style={{
                  width:
                    `${account.progressPercent}%`
                }}
              />
            </div>

            <div className="payout-progress-text">
              {account.progressPercent.toFixed(0)}%
              {' '}del profit requerido
            </div>
          </div>
        ))}
      </div>

      <p className="muted payout-disclaimer">
        Los resultados dependen de las reglas
        configuradas para cada firma y del profit
        registrado desde el inicio del ciclo.
      </p>
    </div>
  )
}
function Subscriptions({ currentUser }) {
  const isEarlyAccess =
    currentUser?.plan === 'EARLY_ACCESS' ||
    currentUser?.isFounder === true

  return (
    <div className="subscriptions-page">
      <div className="early-access-hero">
        <span className="early-access-badge">
          EARLY ACCESS
        </span>

        <h2>J&J Company Bro es gratis durante esta etapa</h2>

        <p>
          No necesitas tarjeta. Queremos que pruebes la plataforma,
          nos ayudes a mejorarla y operes con confianza.
        </p>
      </div>

      <div className="plans-grid">
        <div className="plan-card early-access-plan">
          <span className="popular-badge">
            ⭐ Beneficio de fundador
          </span>

          <h3>EARLY ACCESS</h3>
          <h2>$0</h2>
          <p>Acceso gratuito durante la etapa de lanzamiento</p>

          <ul>
            <li>• Hasta 5 cuentas</li>
            <li>• Dashboard</li>
            <li>• Journal</li>
            <li>• Copy Trading</li>
            <li>• Drawdown Manager</li>
            <li>• Risk Rules</li>
            <li>• Advanced Metrics</li>
            <li>• Sin tarjeta de crédito</li>
          </ul>

          <button
            className="current-plan-btn"
            disabled
          >
            {isEarlyAccess
              ? 'Tu acceso está activo'
              : 'Disponible gratis'}
          </button>
        </div>
      </div>

      <div className="early-access-disclaimer">
        Los usuarios fundadores recibirán beneficios especiales
        cuando se habiliten los planes de pago.
      </div>
    </div>
  )
}

