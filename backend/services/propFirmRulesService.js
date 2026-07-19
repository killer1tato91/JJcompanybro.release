const fs = require('fs')
const path = require('path')
const https = require('https')

const RULES_URL =
  'https://raw.githubusercontent.com/killer1tato91/JJcompanybro.release/main/rules/prop-firm-rules.json'

const DATA_DIRECTORY = path.join(
  __dirname,
  '..',
  'data'
)

const LOCAL_RULES_PATH = path.join(
  DATA_DIRECTORY,
  'prop-firm-rules.json'
)

let cachedRules = null
let lastUpdateResult = {
  checkedAt: null,
  updated: false,
  success: false,
  error: null
}

function ensureDataDirectory() {
  fs.mkdirSync(DATA_DIRECTORY, {
    recursive: true
  })
}

function validateRulesCatalog(rules) {
  if (!rules || typeof rules !== 'object') {
    throw new Error(
      'El catálogo de reglas no es un objeto válido'
    )
  }

  if (rules.schemaVersion !== 1) {
    throw new Error(
      `schemaVersion no compatible: ${rules.schemaVersion}`
    )
  }

  if (
    !rules.rulesVersion ||
    typeof rules.rulesVersion !== 'string'
  ) {
    throw new Error(
      'El catálogo no contiene rulesVersion'
    )
  }

  if (
    !rules.firms ||
    typeof rules.firms !== 'object'
  ) {
    throw new Error(
      'El catálogo no contiene firmas'
    )
  }

  return true
}

function readLocalRules() {
  try {
    ensureDataDirectory()

    if (!fs.existsSync(LOCAL_RULES_PATH)) {
      return null
    }

    const raw = fs.readFileSync(
      LOCAL_RULES_PATH,
      'utf8'
    )

    const parsed = JSON.parse(raw)

    validateRulesCatalog(parsed)

    cachedRules = parsed

    return parsed
  } catch (error) {
    console.error(
      'ERROR LEYENDO REGLAS LOCALES:',
      error.message
    )

    return null
  }
}

function saveLocalRules(rules) {
  validateRulesCatalog(rules)
  ensureDataDirectory()

  const temporaryPath =
    `${LOCAL_RULES_PATH}.tmp`

  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(rules, null, 2),
    'utf8'
  )

  fs.renameSync(
    temporaryPath,
    LOCAL_RULES_PATH
  )

  cachedRules = rules
}

function downloadJson(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(
        new Error(
          'Demasiadas redirecciones descargando reglas'
        )
      )
      return
    }

    const request = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'J&J-Company-Bro/1.0',

          Accept:
            'application/json',

          'Cache-Control':
            'no-cache'
        },

        timeout: 20000
      },

      response => {
        const status =
          Number(response.statusCode || 0)

        if (
          status >= 300 &&
          status < 400 &&
          response.headers.location
        ) {
          response.resume()

          const redirectedUrl =
            new URL(
              response.headers.location,
              url
            ).toString()

          downloadJson(
            redirectedUrl,
            redirects + 1
          )
            .then(resolve)
            .catch(reject)

          return
        }

        if (status !== 200) {
          response.resume()

          reject(
            new Error(
              `GitHub respondió HTTP ${status}`
            )
          )

          return
        }

        let body = ''

        response.setEncoding('utf8')

        response.on('data', chunk => {
          body += chunk
        })

        response.on('end', () => {
          try {
            const parsed =
              JSON.parse(body)

            resolve(parsed)
          } catch (error) {
            reject(
              new Error(
                `GitHub devolvió un JSON inválido: ${error.message}`
              )
            )
          }
        })
      }
    )

    request.on('timeout', () => {
      request.destroy(
        new Error(
          'Tiempo agotado descargando reglas'
        )
      )
    })

    request.on('error', reject)
  })
}

async function updateRulesFromGitHub() {
  const checkedAt =
    new Date().toISOString()

  try {
    const remoteRules =
      await downloadJson(RULES_URL)

    validateRulesCatalog(remoteRules)

    const localRules =
      cachedRules || readLocalRules()

    const localVersion =
      localRules?.rulesVersion || null

    const remoteVersion =
      remoteRules.rulesVersion

    const versionChanged =
      localVersion !== remoteVersion

    if (versionChanged) {
      saveLocalRules(remoteRules)

      console.log(
        'REGLAS DE PROP FIRMS ACTUALIZADAS:',
        `${localVersion || 'sin versión'} → ${remoteVersion}`
      )
    } else {
      cachedRules = remoteRules

      console.log(
        'REGLAS DE PROP FIRMS AL DÍA:',
        remoteVersion
      )
    }

    lastUpdateResult = {
      checkedAt,
      updated: versionChanged,
      success: true,
      error: null,
      localVersion,
      remoteVersion
    }

    return {
      ...lastUpdateResult,
      rules: remoteRules
    }
  } catch (error) {
    console.error(
      'ERROR ACTUALIZANDO REGLAS:',
      error.message
    )

    const fallbackRules =
      cachedRules || readLocalRules()

    lastUpdateResult = {
      checkedAt,
      updated: false,
      success: false,
      error: error.message,
      localVersion:
        fallbackRules?.rulesVersion || null,
      remoteVersion: null
    }

    return {
      ...lastUpdateResult,
      rules: fallbackRules
    }
  }
}

function getRules() {
  if (cachedRules) {
    return cachedRules
  }

  return readLocalRules()
}

function getRulesStatus() {
  const rules = getRules()

  return {
    available: Boolean(rules),
    rulesVersion:
      rules?.rulesVersion || null,
    updatedAt:
      rules?.updatedAt || null,
    firmsCount:
      Object.keys(
        rules?.firms || {}
      ).length,
    localRulesPath:
      LOCAL_RULES_PATH,
    remoteRulesUrl:
      RULES_URL,
    lastUpdate:
      lastUpdateResult
  }
}

function getFirmRules(firmCode) {
  const rules = getRules()

  if (!rules) {
    return null
  }

  return (
    rules.firms?.[
      String(firmCode || '')
        .trim()
        .toUpperCase()
    ] || null
  )
}

module.exports = {
  RULES_URL,
  LOCAL_RULES_PATH,
  getRules,
  getRulesStatus,
  getFirmRules,
  readLocalRules,
  updateRulesFromGitHub,
  validateRulesCatalog
}