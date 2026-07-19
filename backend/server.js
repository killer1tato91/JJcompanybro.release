const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto')
const processedCommands = new Set();
const AdmZip = require('adm-zip');
const {
  getRules,
  getRulesStatus,
  updateRulesFromGitHub
} = require('./services/propFirmRulesService')
const {
  resolveAccountRules
} = require('./services/accountRulesResolver')
const app = express();
const PORT = 3001;
const dataDir = process.env.JJ_DATA_DIR || path.join(__dirname, 'data');
const accountsFile = path.join(dataDir, 'accounts.json');
const copierConfigFile = path.join(dataDir, 'copierConfig.json');
const copyLogsFile = path.join(dataDir, 'copyLogs.json');
const ninjaCopyConfigsFile = path.join(dataDir, 'ninjaCopyConfigs.json');
const closedTradesFile = path.join(dataDir, 'closedTrades.json');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
const Stripe = require('stripe')
const stripe = new Stripe('TU_STRIPE_SECRET_KEY')
const riskRulesFile = path.join(dataDir, 'riskRules.json');
const riskAlertsFile = path.join(dataDir, 'riskAlerts.json');
const settingsFile = path.join(dataDir, 'settings.json');
const journalNotesFile = path.join(dataDir, 'journalNotes.json');
const usersFile = path.join(dataDir, 'users.json');
const groupsFile = path.join(dataDir, 'groups.json')
const saveAccounts = () => {
  fs.writeFileSync(accountsFile, JSON.stringify(accounts, null, 2));
};
const saveGroups = () => {
  fs.writeFileSync(
    groupsFile,
    JSON.stringify(accountGroups, null, 2)
  );
};
let copierConfig = fs.existsSync(copierConfigFile)
  ? JSON.parse(fs.readFileSync(copierConfigFile, 'utf8'))
  : {
      master: 'Master Account 1',
      slaves: [],
      enabled: false,
      multiplier: 1
    };
const saveCopierConfig = () => {
  fs.writeFileSync(
    copierConfigFile,
    JSON.stringify(copierConfig, null, 2)
  );
};

let riskRules = fs.existsSync(riskRulesFile)
  ? JSON.parse(fs.readFileSync(riskRulesFile, 'utf8'))
  : [];
  let appSettings = fs.existsSync(settingsFile)
  ? JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
  : {
      platformName: 'J&J Company Bro',
      language: 'es',
      theme: 'dark',
      primaryColor: '#2563eb',
      soundsEnabled: true,
      alertsEnabled: true,
      alertSound: 'default'
    };

const saveAppSettings = () => {
  fs.writeFileSync(
    settingsFile,
    JSON.stringify(appSettings, null, 2)
  );
};

const saveRiskRules = () => {
  fs.writeFileSync(
    riskRulesFile,
    JSON.stringify(riskRules, null, 2)
  );
};
let riskAlertsHistory = fs.existsSync(riskAlertsFile)
  ? JSON.parse(fs.readFileSync(riskAlertsFile, 'utf8'))
  : [];

const saveRiskAlerts = () => {
  fs.writeFileSync(
    riskAlertsFile,
    JSON.stringify(riskAlertsHistory, null, 2)
  );
};

const saveCopyLogs = () => {
  fs.writeFileSync(copyLogsFile, JSON.stringify(copyLogs, null, 2));
};
// MIDDLEWARES
app.use(cors());
app.use(express.json());

// DATOS DE CUENTAS
let accounts = fs.existsSync(accountsFile)
  ? JSON.parse(fs.readFileSync(accountsFile, 'utf8'))
  : [
      {
        id: 1,
        name: 'Master Account 1',
        broker: 'NinjaTrader',
        balance: 152430.75,
        pnl: 2430.75,
        type: 'master',
        active: true
      }
    ];
	
	let ninjaCopyConfigs = fs.existsSync(ninjaCopyConfigsFile)
    ? JSON.parse(fs.readFileSync(ninjaCopyConfigsFile, "utf8"))
    : {};

function createDefaultCopyConfig()
{
    return {
        version: 2,

        activeGroupId: "",

        groups: []
    };
}
const saveNinjaCopyConfigs = () => {
  fs.writeFileSync(
    ninjaCopyConfigsFile,
    JSON.stringify(ninjaCopyConfigs, null, 2)
  );
};

let accountGroups = fs.existsSync(groupsFile)
  ? JSON.parse(fs.readFileSync(groupsFile, 'utf8'))
  : []
let journalNotes = fs.existsSync(journalNotesFile)
  ? JSON.parse(fs.readFileSync(journalNotesFile, 'utf8'))
  : {};
let users = fs.existsSync(usersFile)
  ? JSON.parse(fs.readFileSync(usersFile, 'utf8'))
  : [];

function addUserAlert(user, title, message, type = title) {
  if (!user.alerts) user.alerts = []

  const sessionKey = user.currentSessionKey || 'default'

  const alreadyExistsThisSession = user.alerts.some(alert =>
    alert.type === type &&
    alert.sessionKey === sessionKey
  )

  if (alreadyExistsThisSession) return

  user.alerts.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    type,
    title,
    message,
    sessionKey,
    createdAt: new Date().toISOString(),
    read: false,
    readAt: null,
    resolved: false
  })

  user.alerts = user.alerts.slice(0, 20)
}

const saveUsers = () => {
  fs.writeFileSync(
    usersFile,
    JSON.stringify(users, null, 2)
  );
};

function applyEarlyAccess(user) {
  user.plan = 'EARLY_ACCESS'
  user.subscriptionStatus = 'free'
  user.isFounder = true
  user.maxAccounts = 5
  user.features = [
    'dashboard',
    'journal',
    'copytrading',
    'drawdown',
    'riskrules',
    'advancedmetrics'
  ]
  user.subscriptionExpiresAt = null
  user.premiumLocked = false
}

let earlyAccessMigrationChanged = false

users.forEach(user => {
  if (
    !user.plan ||
    user.plan === 'FREE' ||
    user.subscriptionStatus === 'expired'
  ) {
    applyEarlyAccess(user)
    earlyAccessMigrationChanged = true
  }
})

if (earlyAccessMigrationChanged) {
  saveUsers()
}
function applyFreePlan(user) {
  user.plan = 'FREE'
  user.maxAccounts = 1
  user.features = ['dashboard', 'journal']
  user.subscriptionStatus = 'expired'
  user.downgradedAt = user.downgradedAt || new Date().toISOString()
}

function cleanupReadAlerts() {
  const now = Date.now()

  users.forEach(user => {
    if (!user.alerts) return

    user.alerts = user.alerts.filter(alert => {
      if (!alert.read) return true
      if (!alert.readAt) return true

      const readAt = new Date(alert.readAt).getTime()
      const hoursRead = (now - readAt) / (1000 * 60 * 60)

      return hoursRead < 24
    })
  })

  saveUsers()
}

function lockPremiumServices(user) {
  user.premiumLocked = true
  user.premiumLockedAt = user.premiumLockedAt || new Date().toISOString()

  user.features = ['dashboard', 'journal']
  user.maxAccounts = 1
}

function deletePremiumUserData(user) {
  accounts = accounts.filter(acc =>
    acc.ownerEmail !== user.email &&
    acc.userEmail !== user.email
  )

  copyLogs = copyLogs.filter(log =>
    log.ownerEmail !== user.email &&
    log.userEmail !== user.email
  )

  saveAccounts()
  saveCopyLogs()
}

function checkExpiredSubscriptions() {
  const now = Date.now()

  users.forEach(user => {
    if (!user.subscriptionExpiresAt) return

    const expiresAt = new Date(user.subscriptionExpiresAt).getTime()

    if (isNaN(expiresAt)) return

    const daysExpired =
      (now - expiresAt) / (1000 * 60 * 60 * 24)

    if (daysExpired < 0) return

if (daysExpired >= 1 && !user.paymentWarningSentAt) {
  addUserAlert(
  user,
  'Pago vencido',
  'Tu pago está vencido. Tus accesos premium serán revocados si no actualizas tu pago.',
  'PAYMENT_PAST_DUE'
)

  user.paymentWarningSentAt = new Date().toISOString()
}

    if (daysExpired >= 2 && user.plan !== 'FREE') {
      applyFreePlan(user)
    }

    if (daysExpired >= 7 && !user.premiumLockedAt) {
      lockPremiumServices(user)
    }

    if (daysExpired >= 30 && !user.premiumDataDeletedAt) {
      deletePremiumUserData(user)
      user.premiumDataDeletedAt = new Date().toISOString()
    }
  })

  saveUsers()
}
const saveJournalNotes = () => {
  fs.writeFileSync(
    journalNotesFile,
    JSON.stringify(journalNotes, null, 2)
  );
};
const getUserByApiKey = (apiKey) => {
  if (!apiKey) return null

  return users.find(
    u => u.apiKey === apiKey
  ) || null
}
const PLAN_LIMITS = {
  FREE: {
    copyTrading: false,
    maxAccounts: 1,
    maxGroups: 0,
    maxSlaves: 0,
    canUseRiskRules: false,
    canUseMultipliers: false
  },
  EARLY_ACCESS: {
    copyTrading: true,
    maxAccounts: 5,
    maxGroups: 5,
    maxSlaves: 10,
    canUseRiskRules: true,
    canUseMultipliers: true
  },
  PRO: {
    copyTrading: true,
    maxAccounts: 5,
    maxGroups: 5,
    maxSlaves: 10,
    canUseRiskRules: false,
    canUseMultipliers: true
  },
  ELITE: {
    copyTrading: true,
    maxAccounts: 50,
    maxGroups: 50,
    maxSlaves: 50,
    canUseRiskRules: true,
    canUseMultipliers: true
  }
};

function getUserPermissions(user) {
  const plan = user.plan || 'FREE';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;

  return {
    plan,
    subscriptionStatus: user.subscriptionStatus || 'active',
    premiumLocked: Boolean(user.premiumLocked),
    features: user.features || [],
    ...limits
  };
}
// ROUTES
// const authRoutes = require('./routes/auth.routes');
const tradesRoutes = require('./routes/trades.routes');

// app.use('/api/auth', authRoutes);
app.use('/api/trades', tradesRoutes);

app.get('/api/addon/download', (req, res) => {
  const { apiKey } = req.query;

  const user = users.find(u => u.apiKey === apiKey);

  if (!user) {
    return res.status(401).send('API Key inválida');
  }

  const addonZipPath = path.join(
    __dirname,
    'addon-template',
    'JJCompanyBroAddon.zip'
  );

  if (!fs.existsSync(addonZipPath)) {
    return res.status(404).send('Addon ZIP no encontrado');
  }

  const zip = new AdmZip(addonZipPath);

  const config = {
    apiKey: user.apiKey,
    username: user.username,
    email: user.email,
    serverUrl: 'http://localhost:3001'
  };

  zip.addFile(
    'config.json',
    Buffer.from(JSON.stringify(config, null, 2), 'utf8')
  );

  const zipBuffer = zip.toBuffer();

  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="JJCompanyBroAddon-${user.username}.zip"`
  });

  res.send(zipBuffer);
});
// TEST
app.get('/', (req, res) => {
  res.send('J&J Company Bro Backend Running');
});

app.post('/api/auth/login', (req, res) => {
  const { email, username, password } = req.body;

  const loginValue = email || username;

  const user = users.find(u =>
    (u.email === loginValue || u.username === loginValue) &&
    u.password === password
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario o contraseña incorrectos'
    });
  }
user.currentSessionKey = Date.now().toString()
saveUsers()

  res.json({
    success: true,
    message: 'Login correcto',
    user
  });
});
app.post('/api/addon/login', (req, res) => {
  const { username, email, password } = req.body;

  const loginValue = username || email;

  const user = users.find(u =>
    (u.username === loginValue || u.email === loginValue) &&
    u.password === password
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario o contraseña incorrectos'
    });
  }

  res.json({
    success: true,
    message: 'Addon conectado correctamente',
    apiKey: user.apiKey,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      plan: user.plan,
      maxAccounts: user.maxAccounts,
      features: user.features
    }
  });
});

// ======================================================
// MOTOR AUTOMÁTICO DE PAYOUT
// ======================================================

const normalizePayoutText = value =>
  String(value || '').trim().toLowerCase()

const getPayoutAccountName = account =>
  String(
    account.name ||
    account.account ||
    account.accountName ||
    account.displayName ||
    ''
  ).trim()

const detectPayoutFirm = account => {
  const text = normalizePayoutText(
    `${getPayoutAccountName(account)} ${account.firm || ''} ${account.broker || ''}`
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
    text.includes('tradefy')
  ) {
    return 'Tradeify'
  }

  if (text.includes('apex')) {
    return 'Apex'
  }

  if (text.includes('topstep')) {
    return 'Topstep'
  }

  return 'Generic'
}

const getBackendPayoutRules = account => {
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

  const firm = detectPayoutFirm(account)

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

/*
  Convierte una fecha al día de trading de Nueva York.

  Antes de las 5:00 p. m.:
  pertenece al día calendario actual.

  Después de las 5:00 p. m.:
  pertenece a la próxima sesión.
*/
const getNewYorkTradingDay = rawDate => {
  const date = new Date(rawDate)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const formatter = new Intl.DateTimeFormat(
    'en-US',
    {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false
    }
  )

  const parts = formatter.formatToParts(date)

  const getPart = type =>
    parts.find(part => part.type === type)?.value

  let year = Number(getPart('year'))
  let month = Number(getPart('month'))
  let day = Number(getPart('day'))
  const hour = Number(getPart('hour'))

  /*
    A partir de las 5:00 p. m. ET se considera
    la siguiente sesión de trading.
  */
  if (hour >= 17) {
    const nextDay = new Date(
      Date.UTC(year, month - 1, day)
    )

    nextDay.setUTCDate(
      nextDay.getUTCDate() + 1
    )

    year = nextDay.getUTCFullYear()
    month = nextDay.getUTCMonth() + 1
    day = nextDay.getUTCDate()
  }

  return [
    year,
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0')
  ].join('-')
}

const getTradesForPayoutAccount = account => {
  const accountName = normalizePayoutText(
    getPayoutAccountName(account)
  )

  const accountEmail = normalizePayoutText(
    account.ownerEmail ||
    account.userEmail ||
    ''
  )

  return closedTrades.filter(trade => {
    const tradeAccount = normalizePayoutText(
      trade.account ||
      trade.accountName ||
      ''
    )

    const tradeEmail = normalizePayoutText(
      trade.userEmail ||
      ''
    )

    const sameAccount =
      tradeAccount === accountName

    const sameUser =
      !accountEmail ||
      !tradeEmail ||
      tradeEmail === accountEmail

    return sameAccount && sameUser
  })
}

const calculateAccountPayoutStatus = account => {
  const rules =
    getBackendPayoutRules(account)

  const accountTrades =
    getTradesForPayoutAccount(account)

  const dailyResults = {}

  accountTrades.forEach(trade => {
    const day = getNewYorkTradingDay(
      trade.date ||
      trade.closedAt ||
      trade.createdAt ||
      trade.time
    )

    if (!day) {
      return
    }

    const cycleStart =
      account.payoutCycleStartedAt
        ? new Date(
            account.payoutCycleStartedAt
          ).getTime()
        : null

    const tradeTime = new Date(
      trade.date ||
      trade.closedAt ||
      trade.createdAt
    ).getTime()

    /*
      Ignorar operaciones anteriores al último
      reinicio del ciclo.
    */
    if (
      cycleStart &&
      Number.isFinite(tradeTime) &&
      tradeTime < cycleStart
    ) {
      return
    }

    dailyResults[day] =
      Number(dailyResults[day] || 0) +
      Number(trade.pnl || 0)
  })

  const validTradingDays = Object.entries(
    dailyResults
  )
    .filter(([, profit]) => {
      return (
        Number(profit) >=
        rules.minimumDailyProfit
      )
    })
    .map(([day, profit]) => ({
      day,
      profit: Number(profit)
    }))

  const tradeCycleProfit =
    Object.values(dailyResults)
      .reduce(
        (sum, profit) =>
          sum + Number(profit || 0),
        0
      )

  /*
    Usar el profit calculado desde trades.
    Si no hay trades, conservar el profit
    previamente guardado.
  */
  const cycleProfit =
    accountTrades.length > 0
      ? tradeCycleProfit
      : Number(account.cycleProfit || 0)

  const payoutPercent =
    rules.payoutPercent > 0
      ? rules.payoutPercent
      : 1

  const requiredCycleProfit =
    rules.minimumPayout /
    payoutPercent

  const validPayoutDays =
    validTradingDays.length

  const eligible =
    validPayoutDays >= rules.requiredDays &&
    cycleProfit >= requiredCycleProfit

  account.validPayoutDays =
    validPayoutDays

  account.payoutDays =
    validPayoutDays

  account.cycleProfit =
    cycleProfit

  account.payoutDailyResults =
    dailyResults

  account.validPayoutTradingDays =
    validTradingDays

  account.payoutEligible =
    eligible

  account.payoutRequiredProfit =
    requiredCycleProfit

  account.payoutEstimatedAmount =
    Math.max(
      0,
      Math.min(
        rules.maximumPayout,
        cycleProfit * payoutPercent
      )
    )

  account.payoutLastCalculatedAt =
    new Date().toISOString()

  /*
    Cuando se vuelve elegible, guardar el balance
    para detectar después una posible retirada.
  */
  if (
    eligible &&
    !account.payoutEligibleBalance
  ) {
    account.payoutEligibleBalance =
      Number(account.balance || 0)

    account.payoutEligibleAt =
      new Date().toISOString()
  }

  return {
    validPayoutDays,
    cycleProfit,
    eligible,
    dailyResults,
    rules
  }
}

const recalculateAllPayoutAccounts = () => {
  let changed = false

  accounts.forEach(account => {
    const accountStage =
      detectAccountStage(account)

    account.accountStage =
      accountStage

    if (accountStage === 'FUNDED') {
      calculateAccountPayoutStatus(
        account
      )

      changed = true
    }

    if (accountStage === 'EVALUATION') {
      evaluateAccountProgress(
        account
      )

      changed = true
    }
  })

  if (changed) {
    saveAccounts()
    saveUsers()
  }
}

const detectPossiblePayout = (
  account,
  previousBalance,
  currentBalance
) => {
  if (!account.payoutEligible) {
    return
  }

  if (
    !Number.isFinite(previousBalance) ||
    !Number.isFinite(currentBalance)
  ) {
    return
  }

  const balanceReduction =
    previousBalance - currentBalance

  const rules =
    getBackendPayoutRules(account)

  /*
    Solo preguntar cuando la reducción sea
    al menos igual al payout mínimo.
  */
  if (
    balanceReduction < rules.minimumPayout
  ) {
    return
  }

  account.pendingPayoutConfirmation = {
    detected: true,
    amount: Number(
      balanceReduction.toFixed(2)
    ),
    previousBalance,
    currentBalance,
    detectedAt: new Date().toISOString()
  }

  account.payoutConfirmationDismissed =
    false
}
// ======================================================
// CLASIFICACIÓN DE CUENTAS
// ======================================================

const normalizeAccountText = value =>
  String(value || '').trim().toLowerCase()

const getAccountDisplayName = account =>
  String(
    account.name ||
    account.account ||
    account.accountName ||
    account.displayName ||
    ''
  ).trim()

const detectAccountStage = account => {
  /*
    La configuración guardada manualmente
    siempre tiene prioridad.
  */
  const explicitStage = normalizeAccountText(
    account.accountStage ||
    account.stage ||
    account.fundingStage ||
    ''
  )

  if (
    explicitStage === 'evaluation' ||
    explicitStage === 'eval'
  ) {
    return 'EVALUATION'
  }

  if (
    explicitStage === 'funded' ||
    explicitStage === 'performance' ||
    explicitStage === 'pa'
  ) {
    return 'FUNDED'
  }

  if (explicitStage === 'live') {
    return 'LIVE'
  }

  if (
    explicitStage === 'simulation' ||
    explicitStage === 'sim'
  ) {
    return 'SIMULATION'
  }

  if (
    explicitStage === 'failed' ||
    explicitStage === 'breached'
  ) {
    return 'FAILED'
  }

  const name = normalizeAccountText(
    getAccountDisplayName(account)
  )

  const status = normalizeAccountText(
    account.status ||
    account.accountStatus ||
    account.type ||
    ''
  )

  if (
    name === 'sim101' ||
    name.includes('playback') ||
    name.includes('backtest') ||
    name.includes('demo')
  ) {
    return 'SIMULATION'
  }

  if (
    status.includes('failed') ||
    status.includes('breached') ||
    status.includes('blown') ||
    status.includes('burned') ||
    status.includes('closed')
  ) {
    return 'FAILED'
  }

  /*
    Prefijos conocidos de evaluaciones.
  */
  if (
    name.includes('eval') ||
    name.includes('evaluation') ||
    name.startsWith('mffuev') ||
    name.startsWith('lfe') ||
    name.startsWith('lte')
  ) {
    return 'EVALUATION'
  }

  /*
    Prefijos conocidos de funded.
  */
  if (
    name.startsWith('mffuf') ||
    name.startsWith('lff') ||
    name.includes('funded') ||
    name.includes('performance account')
  ) {
    return 'FUNDED'
  }

  /*
    Las cuentas que todavía no estén identificadas
    se dejan como UNKNOWN para no asumir mal.
  */
  return 'UNKNOWN'
}
const getEvaluationRules = account => {
  /*
    Regla confirmada manualmente o cargada
    desde el catálogo oficial.
  */
  if (account.evaluationRules) {
    return {
      verified: true,

      startingBalance: Number(
        account.evaluationRules.startingBalance ??
        account.startingBalance ??
        account.initialBalance ??
        0
      ),

      profitTarget: Number(
        account.evaluationRules.profitTarget ?? 0
      ),

      requiredDays: Number(
        account.evaluationRules.requiredDays ?? 0
      )
    }
  }

  /*
    La firma fue identificada, pero todavía
    no tiene reglas oficiales resueltas.
  */
  return {
    verified: false,
    startingBalance: null,
    profitTarget: null,
    requiredDays: null
  }
}
const evaluateAccountProgress = account => {
  const stage = detectAccountStage(account)

  account.accountStage = stage

  if (stage !== 'EVALUATION') {
    return
  }

  const rules = getEvaluationRules(account)
  if (
    !rules.verified ||
    !Number.isFinite(rules.startingBalance) ||
    !Number.isFinite(rules.profitTarget) ||
    rules.startingBalance <= 0 ||
    rules.profitTarget <= 0
  ) {
    account.evaluationRulesVerified = false
    account.evaluationStartingBalance = null
    account.evaluationProfitTarget = null
    account.evaluationProfit = null
    account.evaluationProfitMissing = null
    account.evaluationPassed = false
    account.evaluationLastCalculatedAt =
      new Date().toISOString()

    return
  }

  account.evaluationRulesVerified = true
  const currentBalance = Number(
    account.balance ||
    account.cashValue ||
    account.netLiquidation ||
    account.netLiq ||
    0
  )

  const evaluationProfit =
    currentBalance - rules.startingBalance

  const profitMissing = Math.max(
    0,
    rules.profitTarget - evaluationProfit
  )

  const passed =
    evaluationProfit >= rules.profitTarget

  account.evaluationStartingBalance =
    rules.startingBalance

  account.evaluationProfitTarget =
    rules.profitTarget

  account.evaluationProfit =
    evaluationProfit

  account.evaluationProfitMissing =
    profitMissing

  account.evaluationPassed =
    passed

  account.evaluationLastCalculatedAt =
    new Date().toISOString()

  /*
    Enviar la alerta una sola vez.
  */
  if (
    passed &&
    account.evaluationPassedNotified !== true
  ) {
    account.evaluationPassedAt =
      new Date().toISOString()

    account.evaluationPassedNotified =
      true

    const ownerEmail =
      account.ownerEmail ||
      account.userEmail ||
      ''

    const alertMessage =
      `${getAccountDisplayName(account)} alcanzó el objetivo ` +
      `de evaluación de $${rules.profitTarget.toFixed(2)}.`

    /*
      Usa el sistema de alertas existente cuando
      la función addUserAlert esté disponible.
    */
    if (
      typeof addUserAlert === 'function' &&
      ownerEmail
    ) {
      const user = users.find(userItem =>
        normalizeAccountText(userItem.email) ===
        normalizeAccountText(ownerEmail)
      )

   if (user) {
  addUserAlert(
    user,
    'Evaluación superada',
    alertMessage,
    `EVALUATION_PASSED_${getAccountDisplayName(account)}`
  )

  saveUsers()
}
    }

    console.log(
      'EVALUACIÓN SUPERADA:',
      alertMessage
    )
  }
}

const applyCatalogRulesToAccount = account => {
  const resolution = resolveAccountRules(account)

  account.rulesResolutionStatus =
    resolution.success
      ? 'RESOLVED'
      : resolution.reason

  account.rulesVersion =
    resolution.rulesVersion || null

  account.rulesLastResolvedAt =
    new Date().toISOString()

  if (resolution.classification) {
    account.firmCode =
      resolution.classification.firmCode ||
      account.firmCode ||
      null

    account.detectedPlanCode =
      resolution.classification.planCode ||
      null

    account.accountSize =
      resolution.classification.accountSize ||
      account.accountSize ||
      null

    account.requiresPlanConfirmation =
      Boolean(
        resolution.classification
          .requiresPlanConfirmation
      )
  }

  if (!resolution.success) {
    account.availablePlanOptions =
      resolution.availablePlans || []

    return resolution
  }

  account.planCode =
    resolution.plan.code

  account.planDisplayName =
    resolution.plan.displayName

  account.firmDisplayName =
    resolution.firm.displayName

  account.accountSize =
    resolution.accountSize

  account.requiresPlanConfirmation =
    false

  account.availablePlanOptions = []

  account.resolvedRules = {
    ...resolution.rules
  }

  /*
    Mantener compatibilidad con el motor actual
    de progreso de evaluaciones.
  */
  if (resolution.stage === 'evaluation') {
    account.evaluationRules = {
      startingBalance:
        Number(
          account.startingBalance ||
          account.initialBalance ||
          resolution.accountSize
        ),

      profitTarget:
        Number(
          resolution.rules.profitTarget || 0
        ),

      requiredDays:
        Number(
          resolution.rules.minimumTradingDays || 0
        ),

      maximumDrawdown:
        resolution.rules.maximumDrawdown ?? null,

      drawdownType:
        resolution.rules.drawdownType ?? null,

      dailyLossLimit:
        resolution.rules.dailyLossLimit ?? null,

      consistencyPercent:
        resolution.rules.consistencyPercent ?? null,

      maxMiniContracts:
        resolution.rules.maxMiniContracts ?? null,

      maxMicroContracts:
        resolution.rules.maxMicroContracts ?? null
    }
  }

  return resolution
}
// ACCOUNTS API
app.get('/api/accounts', (req, res) => {
  const email = req.query.email

  const filteredAccounts = accounts.filter(acc =>
    acc.name !== 'Backtest' &&
    acc.name !== 'Playback101' &&
    acc.name !== 'Sim101' &&
    acc.name !== 'SimAccount1'
  )

  if (!email) {
    return res.json(filteredAccounts)
  }

  res.json(
    filteredAccounts.filter(acc =>
      acc.ownerEmail === email ||
      acc.userEmail === email ||
      !acc.ownerEmail
    )
  )
})
app.post('/api/accounts/update', (req, res) => {
  try {
    const updates =
      req.body.accounts || []

    updates.forEach(update => {
      const account = accounts.find(acc => {
        return (
          normalizePayoutText(
            getPayoutAccountName(acc)
          ) ===
          normalizePayoutText(
            update.name ||
            update.account ||
            update.accountName
          )
        )
      })

      if (!account) {
        return
      }

      const previousBalance =
        Number(account.balance || 0)

      const newBalance =
        update.balance !== undefined
          ? Number(update.balance)
          : previousBalance

      account.balance =
        Number.isFinite(newBalance)
          ? newBalance
          : previousBalance

      account.pnl =
        update.pnl ??
        account.pnl

      account.unrealizedPnl =
        update.unrealizedPnl ??
        account.unrealizedPnl

      account.remainingDrawdown =
        update.remainingDrawdown ??
        account.remainingDrawdown

      account.active =
        update.active ??
        account.active

      account.updatedAt =
        new Date().toISOString()

     const accountStage =
  detectAccountStage(account)

account.accountStage =
  accountStage

if (accountStage === 'FUNDED') {
  detectPossiblePayout(
    account,
    previousBalance,
    account.balance
  )

  calculateAccountPayoutStatus(
    account
  )
}

if (accountStage === 'EVALUATION') {
  evaluateAccountProgress(
    account
  )
}
    })

    saveAccounts()

    res.json({
      success: true,
      accounts
    })
  } catch (error) {
    console.error(
      'Error actualizando cuentas:',
      error
    )

    res.status(500).json({
      success: false,
      message:
        'Error actualizando las cuentas'
    })
  }
})
// ======================================================
// CONFIGURACIÓN DE PAYOUT POR CUENTA
// ======================================================
app.post(
  '/api/accounts/payout-confirm',
  (req, res) => {
    try {
      const {
        email,
        accountName
      } = req.body || {}

      const account = accounts.find(acc => {
        const sameName =
          normalizePayoutText(
            getPayoutAccountName(acc)
          ) ===
          normalizePayoutText(accountName)

        const storedEmail =
          normalizePayoutText(
            acc.ownerEmail ||
            acc.userEmail ||
            ''
          )

        const requestedEmail =
          normalizePayoutText(email)

        return (
          sameName &&
          (
            !storedEmail ||
            storedEmail === requestedEmail
          )
        )
      })

      if (!account) {
        return res.status(404).json({
          success: false,
          message:
            'Cuenta no encontrada'
        })
      }

      const detectedAmount =
        Number(
          account
            .pendingPayoutConfirmation
            ?.amount || 0
        )

      account.lastPayoutAmount =
        detectedAmount

      account.lastPayoutAt =
        new Date().toISOString()

      account.payoutCycleStartedAt =
        new Date().toISOString()

      account.validPayoutDays = 0
      account.payoutDays = 0
      account.cycleProfit = 0

      account.payoutDailyResults = {}
      account.validPayoutTradingDays = []

      account.payoutEligible = false
      account.payoutEligibleAt = null
      account.payoutEligibleBalance = null

      account.pendingPayoutConfirmation =
        null

      account.payoutConfirmationDismissed =
        false

      saveAccounts()

      return res.json({
        success: true,
        message:
          'Payout confirmado. Nuevo ciclo iniciado.',
        account
      })
    } catch (error) {
      console.error(
        'Error confirmando payout:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Error confirmando payout'
      })
    }
  }
)

app.post(
  '/api/accounts/payout-dismiss',
  (req, res) => {
    try {
      const {
        email,
        accountName
      } = req.body || {}

      const account = accounts.find(acc => {
        const sameName =
          normalizePayoutText(
            getPayoutAccountName(acc)
          ) ===
          normalizePayoutText(accountName)

        const storedEmail =
          normalizePayoutText(
            acc.ownerEmail ||
            acc.userEmail ||
            ''
          )

        const requestedEmail =
          normalizePayoutText(email)

        return (
          sameName &&
          (
            !storedEmail ||
            storedEmail === requestedEmail
          )
        )
      })

      if (!account) {
        return res.status(404).json({
          success: false,
          message:
            'Cuenta no encontrada'
        })
      }

      account.pendingPayoutConfirmation =
        null

      account.payoutConfirmationDismissed =
        true

      account.payoutDismissedAt =
        new Date().toISOString()

      saveAccounts()

      return res.json({
        success: true,
        message:
          'La reducción no fue registrada como payout.',
        account
      })
    } catch (error) {
      console.error(
        'Error descartando payout:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Error descartando payout'
      })
    }
  }
)
app.post('/api/accounts/payout-status', (req, res) => {
  try {
    const {
      email,
      accountName,
      validPayoutDays,
      cycleProfit,
      payoutCycleStartedAt,
      lastPayoutAt
    } = req.body || {}

    if (!email || !accountName) {
      return res.status(400).json({
        success: false,
        message:
          'email y accountName son requeridos'
      })
    }

    const account = accounts.find(acc => {
      const sameAccount =
        String(acc.name || '').trim().toLowerCase() ===
        String(accountName || '').trim().toLowerCase()

      const accountEmail =
        String(
          acc.ownerEmail ||
          acc.userEmail ||
          ''
        ).trim().toLowerCase()

      const requestedEmail =
        String(email)
          .trim()
          .toLowerCase()

      return (
        sameAccount &&
        (
          accountEmail === requestedEmail ||
          !accountEmail
        )
      )
    })

    if (!account) {
      return res.status(404).json({
        success: false,
        message:
          'No se encontró la cuenta para este usuario'
      })
    }

    /*
      Asignar el propietario si todavía no estaba
      vinculado a ningún usuario.
    */
    if (!account.ownerEmail) {
      account.ownerEmail = email
    }

    if (!account.userEmail) {
      account.userEmail = email
    }

    if (
      validPayoutDays !== undefined &&
      validPayoutDays !== null
    ) {
      const days = Number(validPayoutDays)

      if (
        !Number.isInteger(days) ||
        days < 0 ||
        days > 365
      ) {
        return res.status(400).json({
          success: false,
          message:
            'validPayoutDays debe ser un número entero válido'
        })
      }

      account.validPayoutDays = days
    }

    if (
      cycleProfit !== undefined &&
      cycleProfit !== null &&
      cycleProfit !== ''
    ) {
      const profit = Number(cycleProfit)

      if (!Number.isFinite(profit)) {
        return res.status(400).json({
          success: false,
          message:
            'cycleProfit debe ser un número válido'
        })
      }

      account.cycleProfit = profit
    }

    if (payoutCycleStartedAt !== undefined) {
      account.payoutCycleStartedAt =
        payoutCycleStartedAt || null
    }

    if (lastPayoutAt !== undefined) {
      account.lastPayoutAt =
        lastPayoutAt || null
    }

    account.payoutUpdatedAt =
      new Date().toISOString()

    saveAccounts()

    return res.json({
      success: true,
      message:
        'Estado de payout actualizado correctamente',
      account
    })
  } catch (error) {
    console.error(
      'Error actualizando payout:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'Error interno actualizando el payout'
    })
  }
})

app.post('/api/accounts/payout-reset', (req, res) => {
  try {
    const {
      email,
      accountName,
      payoutAmount
    } = req.body || {}

    if (!email || !accountName) {
      return res.status(400).json({
        success: false,
        message:
          'email y accountName son requeridos'
      })
    }

    const account = accounts.find(acc => {
      const sameAccount =
        String(acc.name || '').trim().toLowerCase() ===
        String(accountName || '').trim().toLowerCase()

      const accountEmail =
        String(
          acc.ownerEmail ||
          acc.userEmail ||
          ''
        ).trim().toLowerCase()

      const requestedEmail =
        String(email)
          .trim()
          .toLowerCase()

      return (
        sameAccount &&
        accountEmail === requestedEmail
      )
    })

    if (!account) {
      return res.status(404).json({
        success: false,
        message:
          'Cuenta no encontrada'
      })
    }

    account.validPayoutDays = 0
    account.cycleProfit = 0

    account.lastPayoutAmount =
      Number(payoutAmount || 0)

    account.lastPayoutAt =
      new Date().toISOString()

    account.payoutCycleStartedAt =
      new Date().toISOString()

    account.payoutUpdatedAt =
      new Date().toISOString()

    saveAccounts()

    return res.json({
      success: true,
      message:
        'Nuevo ciclo de payout iniciado',
      account
    })
  } catch (error) {
    console.error(
      'Error reiniciando payout:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'Error interno reiniciando payout'
    })
  }
})

// LIVE TRADES API
app.get('/api/live-trades', (req, res) => {
  res.json(copyLogs || [])
})

// CONFIGURACIÓN COPY TRADING


app.get('/api/copier/config', (req, res) => {
  res.json(copierConfig);
});

app.post('/api/copier/config', (req, res) => {
  copierConfig = {
    ...copierConfig,
    ...req.body
  };

  saveCopierConfig();

  res.json({
    success: true,
    config: copierConfig
  });
});
app.post('/api/accounts/master', (req, res) => {
  const { name } = req.body;

  accounts = accounts.map(acc => ({
    ...acc,
    type: acc.name === name ? 'master' : 'slave'
  }));

  // Actualizar configuración de la copiadora
  copierConfig.master = name;

  copierConfig.slaves = accounts
    .filter(a => a.type === 'slave' && a.active)
    .map(a => a.name);

  saveAccounts();
  saveCopierConfig();

  res.json({
    success: true,
    message: `Cuenta master actualizada: ${name}`,
    accounts
  });
});
app.post('/api/accounts/:id/toggle', (req, res) => {
  const id = parseInt(req.params.id)

  const account = accounts.find(a => a.id === id)

  if (!account) {
    return res.status(404).json({
      success: false,
      message: 'Cuenta no encontrada'
    })
  }

 account.active = !account.active

copierConfig.slaves = accounts
  .filter(a => a.type === 'slave' && a.active)
  .map(a => a.name)

saveAccounts();
saveCopierConfig();

res.json({
  success: true,
  active: account.active
})
})

let copyLogs = fs.existsSync(copyLogsFile)
  ? JSON.parse(fs.readFileSync(copyLogsFile, 'utf8'))
  : [];
let closedTrades = fs.existsSync(closedTradesFile)
  ? JSON.parse(fs.readFileSync(closedTradesFile, 'utf8'))
  : [];

const saveClosedTrades = () => {
  fs.writeFileSync(
    closedTradesFile,
    JSON.stringify(closedTrades, null, 2)
  );
};
const recentTrades = new Map();

app.post('/api/copier/execute', (req, res) => {
  const trade = req.body;

  const symbol = trade.symbol || 'MGC';
  const action = trade.action || trade.side || 'Buy';
  const quantity = trade.quantity || 1;

  const tradeKey = `${copierConfig.master}|${symbol}|${action}|${quantity}`;
  const now = Date.now();

  const lastTime = recentTrades.get(tradeKey);

  if (lastTime && now - lastTime < 500) {
    console.log('Trade duplicado bloqueado:', tradeKey);

    return res.json({
      success: false,
      message: 'Trade duplicado ignorado',
      executions: []
    });
  }

  recentTrades.set(tradeKey, now);

  if (!copierConfig.enabled) {
    return res.status(400).json({
      success: false,
      message: 'La copiadora está pausada'
    });
  }

  const activeSlaves = accounts.filter(
    a =>
      a.type === 'slave' &&
      a.active &&
      a.name !== copierConfig.master
  );

  const finalQuantity = Number(quantity) || 1;

  const executions = activeSlaves.map(slave => ({
   id: `${Date.now()}_${slave.name}_${symbol}_${action}_${finalQuantity}_${Math.random()}`,
    time: new Date().toLocaleTimeString(),
    master: copierConfig.master,
    slave: slave.name,
    symbol,
    action,
    side: action,
    quantity: finalQuantity,
    status: 'Copiado'
  }));

  executions.forEach(exec => {
    pendingCommands.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: 'COPY_TRADE',
      account: exec.slave,
      symbol: exec.symbol,
      action: exec.action,
      quantity: exec.quantity,
      createdAt: new Date().toISOString()
    });
  });

  copyLogs = [...executions, ...copyLogs].slice(0, 50);
  saveCopyLogs();

  res.json({
    success: true,
    message: 'Orden copiada correctamente',
    executions
  });
});

app.get('/api/copier/logs', (req, res) => {
  res.json(copyLogs);
});
app.post('/api/accounts/activate-broker', (req, res) => {
  const { broker } = req.body;

  accounts = accounts.map(acc => {
    if (acc.type === 'master') return acc;

    return {
      ...acc,
      active:
  broker === 'ALL'
    ? true
    : broker === 'NONE'
      ? false
      : acc.broker === broker
    };
  });

  copierConfig.slaves = accounts
    .filter(a => a.type === 'slave' && a.active)
    .map(a => a.name);

  saveAccounts();
  saveCopierConfig();

  res.json({
    success: true,
    broker,
    accounts,
    copierConfig
  });
});
let pendingCommands = []
app.post('/api/copier/panic-close', (req, res) => {
  const activeAccounts = accounts
    .filter(a => a.type === 'slave' && a.active)
    .map(a => a.name);

  const command = {
    id: Date.now(),
    type: 'PANIC_CLOSE',
    accounts: activeAccounts,
    createdAt: new Date().toISOString()
  };

  pendingCommands.push(command);

  res.json({
    success: true,
    message: 'Panic Close enviado a NinjaTrader',
    command
  });
});

app.get('/api/ninja/commands', (req, res) => {
  const nextCommand = pendingCommands.shift();

  if (!nextCommand) {
    return res.json([]);
  }

  console.log("Comando enviado a Ninja:", nextCommand);
  console.log("Comandos pendientes:", pendingCommands.length);

  res.json([nextCommand]);
});

app.post('/api/ninja/commands/clear', (req, res) => {
  pendingCommands = [];

  res.json({
    success: true,
    message: 'Comandos limpiados'
  });
});
app.post('/api/accounts/detect', (req, res) => {
  const detectedAccounts = req.body.accounts || []
const apiKey = req.body.apiKey
const apiUser = getUserByApiKey(apiKey)

if (!apiUser) {
  return res.status(401).json({
    success: false,
    message: 'API KEY inválida'
  })
}
apiUser.lastSeen = new Date().toISOString()
saveUsers()
  const validAccounts = detectedAccounts.filter(acc =>
    Number(acc.balance || 0) > 0 ||
    Number(acc.remainingDrawdown || 0) > 0
  )

  console.log(
    'DRAWDOWN RECIBIDO:',
    JSON.stringify(validAccounts, null, 2)
  )

  console.log("Cuentas válidas recibidas de Ninja:", validAccounts.length)

const maxAccounts = Number(apiUser.maxAccounts || 1)

const sortedAccounts = [...validAccounts].sort((a, b) => {
  const aName = String(a.name || '').toUpperCase()
  const bName = String(b.name || '').toUpperCase()

  const isSim = (name) =>
    name.includes('SIM') ||
    name.includes('DEMO') ||
    name.includes('PLAYBACK') ||
    name.includes('BACKTEST')

  const isFunded = (name) =>
    name.includes('LFE') ||
    name.includes('LTE') ||
    name.includes('LFF') ||
    name.includes('APEX') ||
    name.includes('PA-') ||
    name.includes('MFFU') ||
    name.includes('TDFY') ||
    name.includes('TRADEFY') ||
    name.includes('TOPSTEP')

  const aScore =
    isFunded(aName) ? 0 :
    isSim(aName) ? 2 :
    1

  const bScore =
    isFunded(bName) ? 0 :
    isSim(bName) ? 2 :
    1

  return aScore - bScore
})

const limitedAccounts = sortedAccounts.slice(0, maxAccounts)

if (validAccounts.length > maxAccounts) {
  const alertKey = `ACCOUNT_LIMIT_${apiUser.plan}_${maxAccounts}`

  const alreadyHasLimitAlert = (apiUser.alerts || []).some(alert =>
    alert.type === alertKey &&
    alert.read !== true
  )

  if (!alreadyHasLimitAlert) {
  addUserAlert(
    apiUser,
    'Límite de cuentas',
    `Tu plan ${apiUser.plan} permite hasta ${maxAccounts} cuentas. Se sincronizaron únicamente las primeras ${maxAccounts}.`,
    alertKey
  )

  saveUsers()
}
}
  const detectBroker = (acc) => {
    const name = (acc.name || '').toUpperCase()
    const broker = acc.broker || ''

    if (broker && broker !== 'NinjaTrader') return broker

    if (name.includes('LFE') || name.includes('LTE') || name.includes('LFF')) return 'Lucid'
    if (name.includes('APEX')) return 'Apex'
    if (name.includes('MFFU')) return 'MyFundedFutures'
    if (name.includes('TDFY') || name.includes('TRADEFY')) return 'Tradefy'
    if (name.includes('TOPSTEP')) return 'Topstep'
    if (name.includes('TAKEPROFIT')) return 'TakeProfitTrader'
    if (name.includes('E8')) return 'E8'
    if (name.includes('BULENOX')) return 'Bulenox'
    if (name.includes('EARN2TRADE')) return 'Earn2Trade'

    return broker || 'Desconocida'
  }

const detectedNames = limitedAccounts.map(a => a.name)

const previousUserAccounts = accounts.filter(acc =>
  acc.ownerEmail === apiUser.email
)

const removedAccounts = previousUserAccounts.filter(acc =>
  !detectedNames.includes(acc.name)
)

if (removedAccounts.length > 0 && limitedAccounts.length > 0) {
  const newAccountNames = limitedAccounts.map(a => a.name).join(', ')
  const oldAccountNames = removedAccounts.map(a => a.name).join(', ')

  addUserAlert(
    apiUser,
    'Cuenta reemplazada',
    `La cuenta ${oldAccountNames} ya no está disponible. Se sincronizó automáticamente ${newAccountNames}.`
  )

  saveUsers()
}

accounts = accounts.filter(acc =>
  acc.ownerEmail !== apiUser.email ||
  detectedNames.includes(acc.name)
)

  limitedAccounts.forEach(acc => {
    const exists = accounts.find(a => a.name === acc.name)

    const broker = detectBroker(acc)

const temporaryAccount = {
  ...exists,
  ...acc,
  name: acc.name,
  broker,

  /*
    Volver a detectar usando el nombre
    cuando Ninja no envíe una etapa explícita.
  */
  accountStage:
    acc.accountStage ||
    acc.stage ||
    acc.fundingStage ||
    ''
}

const accountStage =
  detectAccountStage(temporaryAccount)

const updatedAccount = {
  ...(exists || {}),

  id: exists
    ? exists.id
    : Date.now() +
      Math.floor(Math.random() * 1000),

  name: acc.name,
  broker,

  balance: Number(acc.balance || 0),
  pnl: Number(acc.pnl || 0),

  unrealizedPnl: Number(
    acc.unrealizedPnl || 0
  ),

  contracts: Number(
    acc.contracts || 0
  ),

  positions: acc.positions || '',

  remainingDrawdown: Number(
    acc.remainingDrawdown ||
    acc.drawdown ||
    0
  ),

  drawdown: Number(
    acc.drawdown ||
    acc.remainingDrawdown ||
    0
  ),

  ownerEmail: apiUser.email,
  userEmail: apiUser.email,
  apiKey: apiUser.apiKey,

  type: acc.type || exists?.type || 'slave',

  active:
    exists?.active ??
    false,

  connected: true,

  accountStage
}
if (!exists) {
  accounts.push(updatedAccount)
} else {
  Object.assign(exists, updatedAccount)
}

const finalAccount =
  exists || updatedAccount

applyCatalogRulesToAccount(
  finalAccount
)

if (accountStage === 'FUNDED') {
  calculateAccountPayoutStatus(
    finalAccount
  )
}

if (accountStage === 'EVALUATION') {
  evaluateAccountProgress(
    finalAccount
  )
}
})
const normalizedUserEmail = String(
  apiUser.email || ''
).trim().toLowerCase()

const userAccounts = accounts.filter(acc => {
  const accountEmail = String(
    acc.ownerEmail || acc.userEmail || ''
  ).trim().toLowerCase()

  return accountEmail === normalizedUserEmail
})

const totals = {
  totalBalance: userAccounts.reduce(
    (sum, acc) => sum + Number(acc.balance || 0),
    0
  ),

  totalPnl: userAccounts.reduce(
    (sum, acc) => sum + Number(acc.pnl || 0),
    0
  ),

  totalUnrealizedPnl: userAccounts.reduce(
    (sum, acc) =>
      sum + Number(acc.unrealizedPnl || 0),
    0
  ),

  activeAccounts: userAccounts.length
}

const today = new Date().toISOString().slice(0, 10)

const todayPnl = userAccounts.reduce(
  (sum, acc) => sum + Number(acc.pnl || 0),
  0
)

const existingDay = performanceHistory.find(item =>
  item.day === today &&
  String(item.userEmail || '')
    .trim()
    .toLowerCase() === normalizedUserEmail
)

if (existingDay) {
  existingDay.pnl = todayPnl
  existingDay.updatedAt = new Date().toISOString()
} else {
  performanceHistory.push({
    userEmail: normalizedUserEmail,
    day: today,

    label: new Date().toLocaleDateString('es-US', {
      month: 'short',
      day: 'numeric'
    }),

    pnl: todayPnl,
    updatedAt: new Date().toISOString()
  })
}

const otherUsersPerformance =
  performanceHistory.filter(item =>
    String(item.userEmail || '')
      .trim()
      .toLowerCase() !== normalizedUserEmail
  )

const currentUserPerformance =
  performanceHistory
    .filter(item =>
      String(item.userEmail || '')
        .trim()
        .toLowerCase() === normalizedUserEmail
    )
    .sort((a, b) =>
      String(a.day).localeCompare(String(b.day))
    )
    .slice(-365)

performanceHistory = [
  ...otherUsersPerformance,
  ...currentUserPerformance
]
 const riskAlerts = []

riskRules.forEach(rule => {
  const targetType =
    String(
      rule.targetType ||
      (
        rule.groupId !== undefined &&
        rule.groupId !== null
          ? 'GROUP'
          : ''
      )
    )
      .trim()
      .toUpperCase()

  const targetId =
    String(
      rule.targetId ??
      rule.groupId ??
      ''
    ).trim()

  let targetAccounts = []
  let targetLabel = ''

  if (targetType === 'ACCOUNT') {
    const account = accounts.find(
      item =>
        String(item.name) === targetId
    )

    if (account) {
      targetAccounts = [account]
      targetLabel = account.name
    }
  }

  if (targetType === 'GROUP') {
    const group = accountGroups.find(
      item =>
        String(item.id) === targetId
    )

    if (!group) {
      return
    }

    const accountNames =
      Array.isArray(group.accounts)
        ? group.accounts
        : []

    /*
      El master también puede recibir
      la regla del grupo.
    */
    if (
      group.master &&
      !accountNames.includes(
        group.master
      )
    ) {
      accountNames.push(
        group.master
      )
    }

    targetAccounts = accounts.filter(
      account =>
        accountNames.includes(
          account.name
        )
    )

    targetLabel = group.name
  }

  targetAccounts.forEach(account => {
    const pnl = Number(
      account.pnl || 0
    )

    const remainingDrawdown =
      Number(
        account.remainingDrawdown ||
        0
      )

    const maxDrawdown =
      Number(
        account.maxDrawdown ||
        account.drawdown ||
        1000
      )

    const drawdownUsedPercent =
      maxDrawdown > 0
        ? Math.max(
            0,
            Math.min(
              100,
              (
                (
                  maxDrawdown -
                  remainingDrawdown
                ) /
                maxDrawdown
              ) * 100
            )
          )
        : 0

    let shouldBlock = false
    let reason = ''

    const maxDailyLoss =
      Number(
        rule.maxDailyLoss || 0
      )

    const maxDailyProfit =
      Number(
        rule.maxDailyProfit || 0
      )

    const alertPercent =
      Number(
        rule.drawdownAlertPercent ||
        50
      )

    if (
      maxDailyLoss > 0 &&
      pnl <= -maxDailyLoss
    ) {
      shouldBlock = true
      reason =
        `Pérdida máxima alcanzada: ` +
        `$${Math.abs(pnl).toFixed(2)}`
    }

    if (
      maxDailyProfit > 0 &&
      pnl >= maxDailyProfit
    ) {
      shouldBlock = true
      reason =
        `Profit máximo alcanzado: ` +
        `$${pnl.toFixed(2)}`
    }

    if (
      alertPercent > 0 &&
      drawdownUsedPercent >=
        alertPercent
    ) {
      riskAlerts.push({
        account: account.name,

        group:
          targetType === 'GROUP'
            ? targetLabel
            : null,

        targetType,

        type:
          'DRAWDOWN_ALERT',

        message:
          `${account.name} alcanzó ` +
          `${drawdownUsedPercent.toFixed(1)}% ` +
          `de drawdown usado.`,

        drawdownUsedPercent:
          Number(
            drawdownUsedPercent
              .toFixed(1)
          )
      })
    }

    if (
      shouldBlock &&
      rule.autoBlock
    ) {
      account.active = false

      riskAlerts.push({
        account: account.name,

        group:
          targetType === 'GROUP'
            ? targetLabel
            : null,

        targetType,

        type:
          'ACCOUNT_BLOCKED',

        message: reason
      })
    }
  })
})

if (riskAlerts.length > 0) {
  riskAlertsHistory = [
    ...riskAlerts.map(alert => ({
      id:
        Date.now() +
        Math.floor(Math.random() * 1000),

      time:
        new Date().toLocaleTimeString(),

      date:
        new Date().toISOString(),

      ...alert
    })),

    ...riskAlertsHistory
  ].slice(0, 50)

  saveRiskAlerts()
  saveAccounts()
}

savePerformance()

return res.json({
  success: true,
  message:
    'Cuentas sincronizadas desde NinjaTrader',
  totals,
  riskAlerts,
  accounts
})
})
app.post('/api/accounts/assign-user', (req, res) => {
  const { accountName, email } = req.body

  if (!accountName || !email) {
    return res.status(400).json({
      success: false,
      message: 'accountName y email son requeridos'
    })
  }

  const account = accounts.find(a => a.name === accountName)

  if (!account) {
    return res.status(404).json({
      success: false,
      message: 'Cuenta no encontrada'
    })
  }

  account.ownerEmail = email
  account.userEmail = email

  saveAccounts()

  res.json({
    success: true,
    account
  })
})
app.post('/api/accounts/position-update', (req, res) => {
	console.log("POSITION UPDATE RECIBIDO:", req.body);
  const { account, symbol, action, quantity } = req.body;

  const acc = accounts.find(a => a.name === account);

  if (!acc) {
    return res.json({ success: false, message: 'Cuenta no encontrada' });
  }

  const qty = Number(quantity) || 0;

  if (action === 'BUY') {
    acc.contracts = (Number(acc.contracts) || 0) + qty;
    acc.positions = `${symbol} Long x${acc.contracts}|`;
  }

  if (action === 'SELL') {
    acc.contracts = (Number(acc.contracts) || 0) + qty;
    acc.positions = `${symbol} Short x${acc.contracts}|`;
  }

  if (action === 'CLOSE') {
    acc.contracts = 0;
    acc.positions = '';
  }

  saveAccounts();

  res.json({
    success: true,
    account: acc
  });
});
// ======================================================
// REGISTRO EARLY ACCESS GRATUITO
// ======================================================

app.post('/api/auth/register', (req, res) => {
  const {
    name,
    username,
    email,
    password,
    confirmPassword
  } = req.body

  const cleanName = String(name || '').trim()
  const cleanUsername = String(username || '').trim()
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPassword = String(password || '')

  if (
    !cleanName ||
    !cleanUsername ||
    !cleanEmail ||
    !cleanPassword
  ) {
    return res.status(400).json({
      success: false,
      error: 'Completa todos los campos obligatorios'
    })
  }

  if (confirmPassword && cleanPassword !== String(confirmPassword)) {
    return res.status(400).json({
      success: false,
      error: 'Las contraseñas no coinciden'
    })
  }

  const emailExists = users.some(
    user => String(user.email || '').trim().toLowerCase() === cleanEmail
  )

  if (emailExists) {
    return res.status(409).json({
      success: false,
      error: 'Ya existe una cuenta con este correo'
    })
  }

  const usernameExists = users.some(
    user =>
      String(user.username || '').trim().toLowerCase() ===
      cleanUsername.toLowerCase()
  )

  if (usernameExists) {
    return res.status(409).json({
      success: false,
      error: 'Este nombre de usuario ya está registrado'
    })
  }

  const now = new Date().toISOString()

  const user = {
    id: Date.now(),
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    password: cleanPassword,
    apiKey: 'JJ-' + crypto.randomBytes(16).toString('hex'),

    plan: 'EARLY_ACCESS',
    subscriptionStatus: 'free',
    isFounder: true,
    maxAccounts: 5,
    features: [
      'dashboard',
      'journal',
      'copytrading',
      'drawdown',
      'riskrules',
      'advancedmetrics'
    ],
    subscriptionStartedAt: now,
    subscriptionExpiresAt: null,
    createdAt: now
  }

  users.push(user)
  saveUsers()

  res.status(201).json({
    success: true,
    message: 'Cuenta Early Access creada correctamente',
    user
  })
})

app.post('/api/groups/create', (req, res) => {

  const { name } = req.body

  const group = {
    id: Date.now(),
    name,
    accounts: []
  }

  accountGroups.push(group)

  saveGroups()

  res.json({
    success: true,
    groups: accountGroups
  })
})
app.get('/api/groups', (req, res) => {
  res.json(accountGroups)
})
app.post('/api/groups/rename', (req, res) => {

  const { id, name } = req.body

  const group = accountGroups.find(
    g => g.id === id
  )

  if (group) {
    group.name = name
    saveGroups()
  }

  res.json({
    success: true,
    groups: accountGroups
  })
})
app.post('/api/groups/delete', (req, res) => {

  const { id } = req.body

  accountGroups = accountGroups.filter(
    g => g.id !== id
  )

  saveGroups()

  res.json({
    success: true,
    groups: accountGroups
  })
})
app.post('/api/groups/add-account', (req, res) => {
  const { groupId, accountName } = req.body

  const group = accountGroups.find(g => g.id === groupId)

  if (group && !group.accounts.includes(accountName)) {
    group.accounts.push(accountName)
    saveGroups()
  }

  res.json({
    success: true,
    groups: accountGroups
  })
})
app.post('/api/groups/remove-account', (req, res) => {
  const { groupId, accountName } = req.body

  const group = accountGroups.find(g => g.id === groupId)

  if (group) {
    group.accounts = group.accounts.filter(name => name !== accountName)
    saveGroups()
  }

  res.json({
    success: true,
    groups: accountGroups
  })
})
app.get('/api/performance', (req, res) => {
  const email = String(
    req.query.email || ''
  ).trim().toLowerCase()

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Correo requerido'
    })
  }

  const userPerformance = performanceHistory
    .filter(item =>
      String(item.userEmail || '')
        .trim()
        .toLowerCase() === email
    )
    .sort((a, b) =>
      String(a.day).localeCompare(String(b.day))
    )

  res.json(userPerformance)
})
const performanceFile = path.join(dataDir, 'performance.json')

let performanceHistory = fs.existsSync(performanceFile)
  ? JSON.parse(fs.readFileSync(performanceFile, 'utf8'))
  : []

const savePerformance = () => {
  fs.writeFileSync(performanceFile, JSON.stringify(performanceHistory, null, 2))
}
app.get('/api/risk/rules', (req, res) => {
  res.json(riskRules)
})

app.post(
  '/api/risk/rules/save',
  (req, res) => {
    try {
      const {
        targetType,
        targetId,
        groupId,

        maxDailyLoss,
        maxDailyProfit,
        drawdownAlertPercent,
        autoBlock
      } = req.body || {}

      /*
        Compatibilidad con reglas antiguas:
        si solo llega groupId, se interpreta
        como una regla de grupo.
      */
      const cleanTargetType =
        String(
          targetType ||
          (groupId !== undefined
            ? 'GROUP'
            : '')
        )
          .trim()
          .toUpperCase()

      const cleanTargetId =
        String(
          targetId ??
          groupId ??
          ''
        ).trim()

      if (
        !['ACCOUNT', 'GROUP'].includes(
          cleanTargetType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'targetType debe ser ACCOUNT o GROUP'
        })
      }

      if (!cleanTargetId) {
        return res.status(400).json({
          success: false,
          message:
            'Debes seleccionar una cuenta o grupo'
        })
      }

      const existing =
        riskRules.find(rule => {
          const storedType =
            String(
              rule.targetType ||
              (
                rule.groupId !== undefined
                  ? 'GROUP'
                  : ''
              )
            )
              .trim()
              .toUpperCase()

          const storedId =
            String(
              rule.targetId ??
              rule.groupId ??
              ''
            ).trim()

          return (
            storedType ===
              cleanTargetType &&
            storedId ===
              cleanTargetId
          )
        })

      const rule = {
        id:
          existing?.id ||
          Date.now() +
            Math.floor(
              Math.random() * 1000
            ),

        targetType:
          cleanTargetType,

        targetId:
          cleanTargetId,

        /*
          Se conserva groupId para compatibilidad
          cuando la regla sea de grupo.
        */
        groupId:
          cleanTargetType === 'GROUP'
            ? cleanTargetId
            : null,

        maxDailyLoss: Math.max(
          0,
          Number(maxDailyLoss || 0)
        ),

        maxDailyProfit: Math.max(
          0,
          Number(maxDailyProfit || 0)
        ),

        drawdownAlertPercent:
          Math.max(
            1,
            Math.min(
              100,
              Number(
                drawdownAlertPercent ||
                50
              )
            )
          ),

        autoBlock:
          Boolean(autoBlock),

        updatedAt:
          new Date().toISOString()
      }

      if (existing) {
        Object.assign(
          existing,
          rule
        )
      } else {
        riskRules.push(rule)
      }

      saveRiskRules()

      return res.json({
        success: true,
        message:
          'Regla de riesgo guardada',
        rules: riskRules
      })
    } catch (error) {
      console.error(
        'Error guardando risk rule:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Error guardando la regla de riesgo'
      })
    }
  }
)
app.get('/api/risk/alerts', (req, res) => {
  res.json(riskAlertsHistory);
});
app.get('/api/settings', (req, res) => {
  res.json(appSettings);
});

app.post('/api/settings', (req, res) => {
  appSettings = {
    ...appSettings,
    ...req.body
  };

  saveAppSettings();

  res.json({
    success: true,
    settings: appSettings
  });
});
app.post('/api/groups/set-master', (req, res) => {
  const { groupId, masterName } = req.body

  const group = accountGroups.find(g => g.id === groupId)

  if (!group) {
    return res.json({
      success: false,
      message: 'Grupo no encontrado'
    })
  }

  group.master = masterName

  saveGroups()

  res.json({
    success: true,
    groups: accountGroups
  })
})
app.get('/api/trades/closed', (req, res) => {
  const email = req.query.email

  if (!email) {
    return res.json([])
  }

  const userAccounts = accounts
    .filter(a => a.ownerEmail === email || a.userEmail === email)
    .map(a => a.name)

  const userTrades = closedTrades.filter(t =>
    t.userEmail === email ||
    userAccounts.includes(t.account)
  )

  res.json(userTrades)
})
app.post('/api/trades/record', (req, res) => {
  const apiKey = req.body.apiKey
  const apiUser = getUserByApiKey(apiKey)

  if (!apiUser) {
    return res.status(401).json({
      success: false,
      message: 'API KEY inválida'
    })
  }

  res.json({
    success: true,
    trade: req.body,
    user: apiUser.email
  })
})
app.post('/api/trades/closed/send', (req, res) => {
  const trade = req.body
const apiKey = trade.apiKey || req.body.apiKey
const apiUser = getUserByApiKey(apiKey)

if (!apiUser) {
  return res.status(401).json({
    success: false,
    message: 'API KEY inválida'
  })
}
  const accountFound = accounts.find(a => a.name === trade.account)

const closedTrade = {
  id: Date.now(),
  userEmail: apiUser.email,
  apiKey: apiUser.apiKey,
  time: new Date().toLocaleTimeString(),
  date: new Date().toISOString(),
  account: trade.account || '',
  symbol: trade.symbol || '',
  side: trade.side || trade.action || '',
  quantity: Number(trade.quantity || 0),
  entryPrice: Number(trade.entryPrice || trade.entry || 0),
  exitPrice: Number(trade.exitPrice || trade.exit || trade.price || 0),
  pnl: Number(trade.pnl || 0),
  status: 'Closed'
}

  closedTrades = [
    closedTrade,
    ...closedTrades
  ].slice(0, 500)

  saveClosedTrades()
const payoutAccount = accounts.find(account => {
  return (
    normalizePayoutText(
      getPayoutAccountName(account)
    ) ===
    normalizePayoutText(
      closedTrade.account
    )
  )
})

if (payoutAccount) {
  const accountStage =
    detectAccountStage(payoutAccount)

  payoutAccount.accountStage =
    accountStage

  if (accountStage === 'FUNDED') {
    calculateAccountPayoutStatus(
      payoutAccount
    )
  }

  if (accountStage === 'EVALUATION') {
    evaluateAccountProgress(
      payoutAccount
    )
  }

  saveAccounts()
}
  res.json({
    success: true,
    trade: closedTrade,
    closedTrades
  })
})
app.get('/api/journal/notes/:day', (req, res) => {
  const day = req.params.day;

  const saved = journalNotes[day] || {};

  res.json({
    day,
    data: {
      notes: Array.isArray(saved.notes)
        ? saved.notes
        : saved.note
          ? [{ text: saved.note, time: '' }]
          : [],

      emotion: saved.emotion || '',

      screenshots: Array.isArray(saved.screenshots)
        ? saved.screenshots
        : saved.screenshot
          ? [saved.screenshot]
          : [],

      checklist: saved.checklist || {}
    }
  });
});

app.post('/api/journal/notes/save', (req, res) => {
  const {
    day,
    notes,
    emotion,
    screenshots,
    checklist
  } = req.body;

  if (!day) {
    return res.json({
      success: false,
      message: 'Dia requerido'
    });
  }

  journalNotes[day] = {
    notes: Array.isArray(notes) ? notes : [],
    emotion: emotion || '',
    screenshots: Array.isArray(screenshots) ? screenshots : [],
    checklist: checklist || {}
  };

  saveJournalNotes();

  res.json({
    success: true,
    day,
    data: journalNotes[day]
  });
});
console.log('SERVER VERSION JUN20 SMTP TEST');
app.get('/api/admin/users', (req, res) => {
  const usersList = fs.existsSync(usersFile)
    ? JSON.parse(fs.readFileSync(usersFile, 'utf8'))
    : [];

  const result = usersList.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    plan: user.plan,
    apiKey: user.apiKey,
    createdAt: user.createdAt,
	lastSeen: user.lastSeen
  }));

  res.json(result);
});
app.post('/api/admin/change-plan', (req, res) => {
  const { userId, plan } = req.body;

  const allowedPlans = ['FREE', 'EARLY_ACCESS', 'PRO', 'ELITE'];

  if (!userId || !allowedPlans.includes(plan)) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos'
    });
  }

  const user = users.find(u => String(u.id) === String(userId));

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    });
  }

  user.plan = plan;

 if (plan === 'FREE') {
  user.maxAccounts = 1
  user.monthlyPrice = 0

  user.features = ['dashboard', 'journal']
}

if (plan === 'PRO') {
  user.maxAccounts = 5
  user.monthlyPrice = 5.99

  user.features = [
    'dashboard',
    'journal',
    'copytrading',
    'drawdown'
  ]
}

if (plan === 'ELITE') {
  user.maxAccounts = 50
  user.monthlyPrice = 15.99

  user.features = [
    'dashboard',
    'journal',
    'copytrading',
    'drawdown',
    'riskrules'
  ]
}
  saveUsers();

  res.json({
    success: true,
    user
  });
});
app.post('/api/admin/delete-user', (req, res) => {
  const { userId } = req.body;

  const userExists = users.some(u => String(u.id) === String(userId));

  if (!userExists) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    });
  }

  users = users.filter(u => String(u.id) !== String(userId));

  saveUsers();

  res.json({
    success: true,
    users
  });
});
app.get('/api/user/alerts', (req, res) => {
  const email = req.query.email

  const user = users.find(u =>
    u.email?.toLowerCase() === email?.toLowerCase()
  )

  if (!user) {
    return res.json([])
  }

  if (!user.alerts) user.alerts = []

  const hasPastDue =
    user.subscriptionStatus === 'past_due' ||
    user.subscriptionStatus === 'expired'

  if (hasPastDue && user.subscriptionExpiresAt) {
  const sessionKey = user.currentSessionKey || 'default'

const existsPastDueThisSession = user.alerts.some(alert =>
  alert.type === 'PAYMENT_PAST_DUE' &&
  alert.sessionKey === sessionKey
)

  if (!existsPastDueThisSession) {
  user.alerts.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    type: 'PAYMENT_PAST_DUE',
    title: 'Pago vencido',
    message: 'Tu pago está vencido. Tus accesos premium serán revocados si no actualizas tu pago.',
    sessionKey,
    createdAt: new Date().toISOString(),
    read: false,
    readAt: null,
    resolved: false
  })

  saveUsers()
}
  }

  res.json(user.alerts.filter(alert => !alert.read))
})

setInterval(checkExpiredSubscriptions, 60 * 60 * 1000)
checkExpiredSubscriptions()

setInterval(cleanupReadAlerts, 60 * 60 * 1000)
cleanupReadAlerts()
app.post('/api/user/alerts/read', (req, res) => {
  const { email, alertId } = req.body

  const user = users.find(u =>
    u.email?.toLowerCase() === email?.toLowerCase()
  )

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    })
  }

  if (!user.alerts) user.alerts = []

  user.alerts = user.alerts.map(alert =>
    String(alert.id) === String(alertId)
      ? {
          ...alert,
          read: true,
          readAt: new Date().toISOString()
        }
      : alert
  )

  saveUsers()

  res.json({
    success: true,
    alerts: user.alerts.filter(alert => !alert.read)
  })
})
app.post('/api/payments/create-checkout-session', async (req, res) => {
  try {
    const { userId, plan } = req.body

    const user = users.find(u => String(u.id) === String(userId))

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    const priceIds = {
      PRO: 'price_ID_PRO_599',
      ELITE: 'price_ID_ELITE_1599'
    }

    if (!priceIds[plan]) {
      return res.status(400).json({
        success: false,
        message: 'Plan inválido'
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [
        {
          price: priceIds[plan],
          quantity: 1
        }
      ],
      success_url: 'http://localhost:5173/subscription-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:5173/subscriptions',
      metadata: {
        userId: String(user.id),
        plan
      }
    })

    res.json({
      success: true,
      url: session.url
    })
  } catch (err) {
    console.error('STRIPE CHECKOUT ERROR:', err)
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
})
setInterval(cleanupReadAlerts, 60 * 60 * 1000)
cleanupReadAlerts()

app.get('/api/user/permissions', (req, res) => {
  const { apiKey } = req.query;

  const user = getUserByApiKey(apiKey);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'API KEY inválida'
    });
  }

  const permissions = getUserPermissions(user);

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email
    },
    permissions
  });
});

app.get('/api/addon/copy-config', (req, res) =>
{
    const { apiKey } = req.query;

    const user = getUserByApiKey(apiKey);

    if (!user)
    {
        return res.status(401).json({
            success: false,
            message: "API KEY inválida"
        });
    }

    if (!ninjaCopyConfigs[user.email])
    {
        ninjaCopyConfigs[user.email] = createDefaultCopyConfig();
        saveNinjaCopyConfigs();
    }

    res.json({
        success: true,
        config: ninjaCopyConfigs[user.email]
    });
});

app.post('/api/addon/copy-config/save', (req, res) =>
{
    const { apiKey, config } = req.body;

    const user = getUserByApiKey(apiKey);

    if (!user)
    {
        return res.status(401).json({
            success: false,
            message: "API KEY inválida"
        });
    }

    if (!ninjaCopyConfigs[user.email])
    {
        ninjaCopyConfigs[user.email] = createDefaultCopyConfig();
    }

    ninjaCopyConfigs[user.email] = {

        version: 2,

        activeGroupId: config.activeGroupId || "",

        groups: Array.isArray(config.groups)
            ? config.groups
            : [],

        updatedAt: new Date().toISOString()
    };

    saveNinjaCopyConfigs();

    res.json({
        success: true,
        config: ninjaCopyConfigs[user.email]
    });
});

app.post('/api/addon/copy-log', (req, res) => {
  const { apiKey, log } = req.body;

  const user = getUserByApiKey(apiKey);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'API KEY inválida'
    });
  }

  const item = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    userEmail: user.email,
    apiKey: user.apiKey,
    time: new Date().toLocaleTimeString(),
    date: new Date().toISOString(),
    ...log
  };

  copyLogs = [item, ...copyLogs].slice(0, 200);
  saveCopyLogs();

  res.json({
    success: true,
    log: item
  });
});

app.get(
  '/api/prop-firm-rules',
  (req, res) => {
    const rules = getRules()

    if (!rules) {
      return res.status(503).json({
        success: false,
        message:
          'No hay catálogo de reglas disponible'
      })
    }

    res.json({
      success: true,
      schemaVersion:
        rules.schemaVersion,
      rulesVersion:
        rules.rulesVersion,
      updatedAt:
        rules.updatedAt,
      firms:
        rules.firms
    })
  }
)
app.get(
  '/api/prop-firm-rules/status',
  (req, res) => {
    res.json({
      success: true,
      ...getRulesStatus()
    })
  }
)
app.post(
  '/api/prop-firm-rules/update',
  async (req, res) => {
    const result =
      await updateRulesFromGitHub()

    res.status(
      result.rules ? 200 : 503
    ).json(result)
  }
)

const PROP_RULES_UPDATE_INTERVAL =
  6 * 60 * 60 * 1000

setInterval(async () => {
  const result =
    await updateRulesFromGitHub()

  if (result.success && result.updated) {
    console.log(
      'Nueva versión de reglas instalada:',
      result.rules?.rulesVersion
    )
  }
}, PROP_RULES_UPDATE_INTERVAL)

app.post(
  '/api/accounts/confirm-plan',
  (req, res) => {
    try {
      const {
        email,
        accountName,
        planCode
      } = req.body || {}

      if (
        !accountName ||
        !planCode
      ) {
        return res.status(400).json({
          success: false,
          message:
            'accountName y planCode son requeridos'
        })
      }

      const normalizedAccountName =
        String(accountName)
          .trim()
          .toLowerCase()

      const normalizedEmail =
        String(email || '')
          .trim()
          .toLowerCase()

      const account = accounts.find(item => {
        const itemName =
          String(
            item.name ||
            item.accountName ||
            ''
          )
            .trim()
            .toLowerCase()

        const itemEmail =
          String(
            item.ownerEmail ||
            item.userEmail ||
            ''
          )
            .trim()
            .toLowerCase()

        return (
          itemName === normalizedAccountName &&
          (
            !normalizedEmail ||
            !itemEmail ||
            itemEmail === normalizedEmail
          )
        )
      })

      if (!account) {
        return res.status(404).json({
          success: false,
          message:
            'Cuenta no encontrada'
        })
      }

      const normalizedPlanCode =
        String(planCode)
          .trim()
          .toUpperCase()

      const validPlans = [
        'SELECT',
        'GROWTH'
      ]

      if (
        !validPlans.includes(
          normalizedPlanCode
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Plan no válido para Tradeify'
        })
      }

      account.planCode =
        normalizedPlanCode

      account.plan =
        normalizedPlanCode

      account.planConfirmedManually =
        true

      account.planConfirmedAt =
        new Date().toISOString()

      const resolution =
        applyCatalogRulesToAccount(account)

      if (!resolution.success) {
        return res.status(400).json({
          success: false,
          message:
            'No fue posible resolver las reglas',
          reason:
            resolution.reason,
          account
        })
      }

      if (
        account.accountStage === 'EVALUATION'
      ) {
        evaluateAccountProgress(account)
      }

      saveAccounts()

      return res.json({
        success: true,
        message:
          'Plan confirmado y reglas aplicadas',
        account,
        resolution
      })
    } catch (error) {
      console.error(
        'Error confirmando plan:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Error interno confirmando el plan'
      })
    }
  }
)
// START SERVER
const server = app.listen(PORT, async () => {
  console.log(
    `Servidor funcionando en puerto ${PORT}`
  )

  const rulesResult =
    await updateRulesFromGitHub()

  if (rulesResult.success) {
    console.log(
      'Catálogo de Prop Firms listo:',
      rulesResult.rules?.rulesVersion
    )
  } else if (rulesResult.rules) {
    console.log(
      'Usando catálogo local de respaldo:',
      rulesResult.rules.rulesVersion
    )
  } else {
    console.log(
      'No hay catálogo de Prop Firms disponible'
    )
  }
})

module.exports = { app, server };
