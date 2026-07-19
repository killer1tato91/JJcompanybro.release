const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')
const {
  extractTradeifyRules
} = require(
  './extractors/tradeifyExtractor'
)

const projectRoot =
  path.resolve(__dirname, '..')

const rulesPath = path.join(
  projectRoot,
  'rules',
  'prop-firm-rules.json'
)

const sourcesPath = path.join(
  projectRoot,
  'rules',
  'sources.json'
)

const pendingPath = path.join(
  projectRoot,
  'rules',
  'pending-changes.json'
)

function readJson(filePath) {
  return JSON.parse(
    fs.readFileSync(filePath, 'utf8')
  )
}

function writeJson(filePath, data) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2) +
      '\n',
    'utf8'
  )
}

let browser = null

async function getBrowser() {
  if (browser) {
    return browser
  }

  browser = await chromium.launch({
    headless: true
  })

  return browser
}

async function downloadPage(url) {
  const currentBrowser =
    await getBrowser()

  const context =
    await currentBrowser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/130.0.0.0 Safari/537.36',

      locale: 'en-US',

      viewport: {
        width: 1440,
        height: 1000
      },

      extraHTTPHeaders: {
        Accept:
          'text/html,application/xhtml+xml,' +
          'application/xml;q=0.9,image/avif,' +
          'image/webp,*/*;q=0.8',

        'Accept-Language':
          'en-US,en;q=0.9'
      }
    })

  const page =
    await context.newPage()

  try {
    const response = await page.goto(
      url,
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }
    )

    const status =
      response?.status() || 0

    if (status >= 400) {
      throw new Error(
        `HTTP ${status} en ${url}`
      )
    }

    await page.waitForTimeout(3000)

    const title =
      await page.title()

    const html =
      await page.content()

    if (
      !html ||
      html.length < 500
    ) {
      throw new Error(
        `La página devolvió contenido insuficiente: ${url}`
      )
    }

    console.log(
      `Página abierta: ${title}`
    )

    return html
  } finally {
    await context.close()
  }
}

function createPendingChange({
  source,
  check
}) {
  return {
    id: [
      source.id,
      check.field,
      new Date()
        .toISOString()
        .slice(0, 10)
    ].join('__'),

    firmCode: 'TRADEIFY',
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.url,

    field: check.field,
    oldValue:
      check.expectedValue,
    newValue:
      check.detectedValue,

    confidence:
      check.confidence,

    evidence:
      check.evidence,

    detectedAt:
      new Date().toISOString(),

    status:
      check.detectedValue === null ||
      check.detectedValue ===
        'UNKNOWN'
        ? 'EXTRACTION_FAILED'
        : 'PENDING_REVIEW'
  }
}

async function checkTradeify({
  sourceConfig
}) {
  const changes = []
  const reports = []

  for (
    const source of
    sourceConfig.sources || []
  ) {
    if (!source.enabled) {
      continue
    }

    console.log(
      `Revisando: ${source.name}`
    )

    try {
      const html =
        await downloadPage(source.url)

      const checks =
        extractTradeifyRules({
          source,
          html
        })

      const sourceReport = {
        sourceId: source.id,
        sourceName: source.name,
        sourceUrl: source.url,
        checkedAt:
          new Date().toISOString(),
        success: true,
        checks
      }

      reports.push(sourceReport)

      for (const check of checks) {
        if (!check.matches) {
          changes.push(
            createPendingChange({
              source,
              check
            })
          )
        }
      }
    } catch (error) {
      console.error(
        `Error en ${source.name}:`,
        error.message
      )

      reports.push({
        sourceId: source.id,
        sourceName: source.name,
        sourceUrl: source.url,
        checkedAt:
          new Date().toISOString(),
        success: false,
		status:
  error.message.includes('403')
    ? 'ACCESS_BLOCKED'
    : 'DOWNLOAD_FAILED',
        error: error.message,
        checks: []
      })
    }
  }

  return {
    changes,
    reports
  }
}

async function main() {
  const rules = readJson(rulesPath)
  const sources = readJson(sourcesPath)

  console.log(
    `Catálogo actual: ${
      rules.rulesVersion
    }`
  )

  const tradeify =
    sources.firms.TRADEIFY

  const result =
    await checkTradeify({
      sourceConfig: tradeify
    })

  const pendingChanges = {
    schemaVersion: 1,

    generatedAt:
      new Date().toISOString(),

    rulesVersionChecked:
      rules.rulesVersion,

    firmsChecked: [
      'TRADEIFY'
    ],

    summary: {
      sourcesChecked:
        result.reports.length,

      successfulSources:
        result.reports.filter(
          report => report.success
        ).length,

      failedSources:
        result.reports.filter(
          report => !report.success
        ).length,

      detectedChanges:
        result.changes.length
    },

    changes:
      result.changes,

    reports:
      result.reports
  }

  writeJson(
    pendingPath,
    pendingChanges
  )

  console.log(
    `Fuentes revisadas: ${
      result.reports.length
    }`
  )

  console.log(
    `Cambios detectados: ${
      result.changes.length
    }`
  )
}

main()
  .catch(error => {
    console.error(
      'Error general:',
      error
    )

    process.exitCode = 1
  })
  .finally(async () => {
    if (browser) {
      await browser.close()
    }
  })