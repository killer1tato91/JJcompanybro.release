const {
  getRules
} = require('./propFirmRulesService')

const normalizeText = value =>
  String(value || '')
    .trim()
    .toLowerCase()

const normalizeAccountSize = value => {
  const numericValue = Number(value)

  if (
    Number.isFinite(numericValue) &&
    numericValue > 0
  ) {
    if (numericValue >= 150000) return 150000
    if (numericValue >= 100000) return 100000
    if (numericValue >= 50000) return 50000
    if (numericValue >= 25000) return 25000
  }

  const text = normalizeText(value)
    .replace(/[$,\s]/g, '')

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

  if (
    text.includes('25k') ||
    text.includes('25000')
  ) {
    return 25000
  }

  return null
}

const getAccountSearchText = account =>
  normalizeText([
    account?.name,
    account?.account,
    account?.accountName,
    account?.displayName,
    account?.broker,
    account?.firm,
    account?.provider,
    account?.company,
    account?.plan,
    account?.program
  ].filter(Boolean).join(' '))

const detectFirmCode = account => {
  const rules = getRules()

  if (!rules?.firms) {
    return null
  }

  const explicitFirm = normalizeText(
    account?.firmCode ||
    account?.firm ||
    account?.propFirm
  )

  for (
    const [firmCode, firmRules]
    of Object.entries(rules.firms)
  ) {
    const aliases = [
      firmCode,
      firmRules.displayName,
      ...(firmRules.aliases || [])
    ]
      .map(normalizeText)
      .filter(Boolean)

    if (
      aliases.some(alias =>
        explicitFirm === alias ||
        explicitFirm.includes(alias)
      )
    ) {
      return firmCode
    }
  }

  const text = getAccountSearchText(account)

  for (
    const [firmCode, firmRules]
    of Object.entries(rules.firms)
  ) {
    const aliases = [
      firmCode,
      firmRules.displayName,
      ...(firmRules.aliases || [])
    ]
      .map(normalizeText)
      .filter(alias => alias.length >= 3)

    if (
      aliases.some(alias =>
        text.includes(alias)
      )
    ) {
      return firmCode
    }
  }

  return null
}

const detectPlanCode = (
  account,
  firmCode
) => {
  const rules = getRules()

  const firmRules =
    rules?.firms?.[firmCode]

  if (!firmRules?.plans) {
    return null
  }

  const explicitPlan = normalizeText(
    account?.planCode ||
    account?.plan ||
    account?.program
  )

  for (
    const [planCode, planRules]
    of Object.entries(firmRules.plans)
  ) {
    const aliases = [
      planCode,
      planRules.displayName,
      ...(planRules.aliases || [])
    ]
      .map(normalizeText)
      .filter(Boolean)

    if (
      aliases.some(alias =>
        explicitPlan === alias ||
        explicitPlan.includes(alias)
      )
    ) {
      return planCode
    }
  }

  const text = getAccountSearchText(account)

  for (
    const [planCode, planRules]
    of Object.entries(firmRules.plans)
  ) {
    const aliases = [
      planCode,
      planRules.displayName,
      ...(planRules.aliases || [])
    ]
      .map(normalizeText)
      .filter(Boolean)

    if (
      aliases.some(alias =>
        text.includes(alias)
      )
    ) {
      return planCode
    }
  }

  return null
}

const detectAccountSize = account => {
const directValues = [
  account?.accountSize,
  account?.startingBalance,
  account?.initialBalance,
  account?.size
]

  for (const value of directValues) {
    const detected =
      normalizeAccountSize(value)

    if (detected) {
      return detected
    }
  }

  return normalizeAccountSize(
    getAccountSearchText(account)
  )
}

const classifyAccount = account => {
  const searchText =
    getAccountSearchText(account)

  const isSimulation =
    searchText.includes('sim') ||
    searchText.includes('playback') ||
    searchText.includes('backtest') ||
    searchText.includes('demo')

  if (isSimulation) {
    return {
      firmCode: null,
      planCode: null,
      accountSize: null,
      requiresPlanConfirmation: false,
      isSimulation: true,
      classifiedAt:
        new Date().toISOString()
    }
  }

  const firmCode =
    detectFirmCode(account)

  const planCode =
    firmCode
      ? detectPlanCode(
          account,
          firmCode
        )
      : null

  const accountSize =
    detectAccountSize(account)

  return {
    firmCode,
    planCode,
    accountSize,
    isSimulation: false,

    requiresPlanConfirmation:
      Boolean(
        firmCode &&
        !planCode &&
        Object.keys(
          getRules()
            ?.firms?.[firmCode]
            ?.plans || {}
        ).length > 1
      ),

    classifiedAt:
      new Date().toISOString()
  }
}

module.exports = {
  normalizeAccountSize,
  getAccountSearchText,
  detectFirmCode,
  detectPlanCode,
  detectAccountSize,
  classifyAccount
}