function normalizeText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasAny(text, values) {
  return values.some(value =>
    text.toLowerCase().includes(
      String(value).toLowerCase()
    )
  )
}

function createCheck({
  field,
  expectedValue,
  detectedValue,
  confidence,
  evidence
}) {
  return {
    field,
    expectedValue,
    detectedValue,
    matches:
      expectedValue === detectedValue,
    confidence,
    evidence
  }
}

function extractSelectRules(text) {
  const checks = []

  checks.push(
    createCheck({
      field: 'SELECT.minimumTradingDays',
      expectedValue: 3,
      detectedValue: hasAny(text, [
        'minimum trading days 3 days',
        'minimum 3 trading days',
        'requires a minimum of 3 trading days'
      ])
        ? 3
        : null,
      confidence: 0.95,
      evidence:
        'Select minimum trading days'
    })
  )

  checks.push(
    createCheck({
      field: 'SELECT.consistencyPercent',
      expectedValue: 40,
      detectedValue: hasAny(text, [
        'consistency requirement 40%',
        '40% consistency rule',
        '40% consistency requirement'
      ])
        ? 40
        : null,
      confidence: 0.98,
      evidence:
        'Select consistency rule'
    })
  )

  checks.push(
    createCheck({
      field: 'SELECT.25000.profitTarget',
      expectedValue: 1500,
      detectedValue: hasAny(text, [
        'profit target: $1,500',
        'profit target $1,500'
      ])
        ? 1500
        : null,
      confidence: 0.98,
      evidence:
        'Select 25K profit target'
    })
  )

  checks.push(
    createCheck({
      field: 'SELECT.50000.profitTarget',
      expectedValue: 3000,
      detectedValue: hasAny(text, [
        'profit target: $3,000',
        'profit target $3,000'
      ])
        ? 3000
        : null,
      confidence: 0.98,
      evidence:
        'Select 50K profit target'
    })
  )

  checks.push(
    createCheck({
      field: 'SELECT.100000.profitTarget',
      expectedValue: 6000,
      detectedValue: hasAny(text, [
        'profit target: $6,000',
        'profit target $6,000'
      ])
        ? 6000
        : null,
      confidence: 0.98,
      evidence:
        'Select 100K profit target'
    })
  )

  checks.push(
    createCheck({
      field: 'SELECT.150000.profitTarget',
      expectedValue: 9000,
      detectedValue: hasAny(text, [
        'profit target: $9,000',
        'profit target $9,000'
      ])
        ? 9000
        : null,
      confidence: 0.98,
      evidence:
        'Select 150K profit target'
    })
  )

  return checks
}

function extractGrowthRules(text) {
  const checks = []

  checks.push(
    createCheck({
      field: 'GROWTH.minimumTradingDays',
      expectedValue: 1,
      detectedValue: hasAny(text, [
        'minimum trading days 1 day',
        'can pass immediately',
        'passed in just 1 trading day'
      ])
        ? 1
        : null,
      confidence: 0.95,
      evidence:
        'Growth minimum trading days'
    })
  )

  checks.push(
    createCheck({
      field: 'GROWTH.consistencyPercent',
      expectedValue: null,
      detectedValue: hasAny(text, [
        'no consistency requirement',
        'consistency rule none',
        'does not have a consistency rule'
      ])
        ? null
        : 'UNKNOWN',
      confidence: 0.9,
      evidence:
        'Growth evaluation consistency'
    })
  )

  const sizes = [
    {
      size: 25000,
      target: 1500,
      dailyLoss: 600,
      drawdown: 1000
    },
    {
      size: 50000,
      target: 3000,
      dailyLoss: 1250,
      drawdown: 2000
    },
    {
      size: 100000,
      target: 6000,
      dailyLoss: 2500,
      drawdown: 3500
    },
    {
      size: 150000,
      target: 9000,
      dailyLoss: 3750,
      drawdown: 5000
    }
  ]

  for (const rule of sizes) {
    checks.push(
      createCheck({
        field:
          `GROWTH.${rule.size}.profitTarget`,
        expectedValue: rule.target,
        detectedValue: hasAny(text, [
          `$${rule.target.toLocaleString(
            'en-US'
          )}`
        ])
          ? rule.target
          : null,
        confidence: 0.9,
        evidence:
          `Growth ${rule.size} profit target`
      })
    )

    checks.push(
      createCheck({
        field:
          `GROWTH.${rule.size}.dailyLossLimit`,
        expectedValue: rule.dailyLoss,
        detectedValue: hasAny(text, [
          `$${rule.dailyLoss.toLocaleString(
            'en-US'
          )}`
        ])
          ? rule.dailyLoss
          : null,
        confidence: 0.85,
        evidence:
          `Growth ${rule.size} daily loss`
      })
    )

    checks.push(
      createCheck({
        field:
          `GROWTH.${rule.size}.maximumDrawdown`,
        expectedValue: rule.drawdown,
        detectedValue: hasAny(text, [
          `$${rule.drawdown.toLocaleString(
            'en-US'
          )}`
        ])
          ? rule.drawdown
          : null,
        confidence: 0.85,
        evidence:
          `Growth ${rule.size} drawdown`
      })
    )
  }

  return checks
}

function extractTradeifyRules({
  source,
  html
}) {
  const text = normalizeText(html)

  if (
    source.planCode === 'SELECT'
  ) {
    return extractSelectRules(text)
  }

  if (
    source.planCode === 'GROWTH'
  ) {
    return extractGrowthRules(text)
  }

  if (
    source.category ===
    'GENERAL_RULES'
  ) {
    return [
      createCheck({
        field:
          'SELECT.consistencyPercent',
        expectedValue: 40,
        detectedValue: hasAny(text, [
          'select evaluation accounts must follow a 40% consistency rule',
          '40% for select evaluation'
        ])
          ? 40
          : null,
        confidence: 0.98,
        evidence:
          'General consistency article'
      })
    ]
  }

  return []
}

module.exports = {
  extractTradeifyRules
}