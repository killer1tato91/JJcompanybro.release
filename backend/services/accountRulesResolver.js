const {
  getRules
} = require('./propFirmRulesService')

const {
  classifyAccount
} = require('./accountClassifier')

const normalizeStage = value => {
  const text = String(value || '')
    .trim()
    .toLowerCase()

  if (
    text === 'evaluation' ||
    text === 'eval'
  ) {
    return 'evaluation'
  }

  if (
    text === 'funded' ||
    text === 'performance' ||
    text === 'pa'
  ) {
    return 'funded'
  }

  if (text === 'live') {
    return 'live'
  }

  return null
}

const resolveAccountRules = account => {
  const catalog = getRules()

  if (!catalog) {
    return {
      success: false,
      reason: 'RULES_NOT_AVAILABLE',
      classification: null,
      rules: null
    }
  }

  const classification =
    classifyAccount(account)

  if (!classification.firmCode) {
    return {
      success: false,
      reason: 'FIRM_NOT_DETECTED',
      classification,
      rules: null
    }
  }

  const firmRules =
    catalog.firms?.[
      classification.firmCode
    ]

  if (!firmRules) {
    return {
      success: false,
      reason: 'FIRM_NOT_FOUND',
      classification,
      rules: null
    }
  }

  if (
    classification.requiresPlanConfirmation
  ) {
    return {
      success: false,
      reason: 'PLAN_CONFIRMATION_REQUIRED',
      classification,
      availablePlans:
        Object.entries(
          firmRules.plans || {}
        ).map(([code, plan]) => ({
          code,
          displayName:
            plan.displayName || code
        })),
      rules: null
    }
  }

  if (!classification.planCode) {
    return {
      success: false,
      reason: 'PLAN_NOT_AVAILABLE',
      classification,
      rules: null
    }
  }

  const planRules =
    firmRules.plans?.[
      classification.planCode
    ]

  if (!planRules) {
    return {
      success: false,
      reason: 'PLAN_NOT_FOUND',
      classification,
      rules: null
    }
  }

  if (!classification.accountSize) {
    return {
      success: false,
      reason: 'ACCOUNT_SIZE_NOT_DETECTED',
      classification,
      rules: null
    }
  }

  const sizeRules =
    planRules.sizes?.[
      String(classification.accountSize)
    ]

  if (!sizeRules) {
    return {
      success: false,
      reason: 'ACCOUNT_SIZE_NOT_SUPPORTED',
      classification,
      rules: null
    }
  }

  const stage =
    normalizeStage(
      account.accountStage ||
      account.stage ||
      account.fundingStage ||
      'evaluation'
    )

  if (!stage) {
    return {
      success: false,
      reason: 'STAGE_NOT_DETECTED',
      classification,
      rules: null
    }
  }

  const resolvedRules =
    sizeRules[stage]

  if (!resolvedRules) {
    return {
      success: false,
      reason: 'STAGE_RULES_NOT_AVAILABLE',
      classification,
      stage,
      rules: null
    }
  }

  return {
    success: true,
    reason: null,
    rulesVersion:
      catalog.rulesVersion,
    classification,
    stage,
    firm: {
      code:
        classification.firmCode,
      displayName:
        firmRules.displayName
    },
    plan: {
      code:
        classification.planCode,
      displayName:
        planRules.displayName
    },
    accountSize:
      classification.accountSize,
    rules:
      resolvedRules
  }
}

module.exports = {
  normalizeStage,
  resolveAccountRules
}