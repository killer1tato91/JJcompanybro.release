const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')

const files = {
  rules: path.join(
    projectRoot,
    'rules',
    'prop-firm-rules.json'
  ),

  sources: path.join(
    projectRoot,
    'rules',
    'sources.json'
  ),

  pending: path.join(
    projectRoot,
    'rules',
    'pending-changes.json'
  ),

  history: path.join(
    projectRoot,
    'rules',
    'rules-history.json'
  )
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No existe el archivo: ${filePath}`
    )
  }

  const raw = fs.readFileSync(
    filePath,
    'utf8'
  )

  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(
      `JSON inválido en ${filePath}: ${error.message}`
    )
  }
}

function validateRules(rules) {
  if (rules.schemaVersion !== 1) {
    throw new Error(
      'schemaVersion de reglas debe ser 1'
    )
  }

  if (
    !rules.rulesVersion ||
    typeof rules.rulesVersion !== 'string'
  ) {
    throw new Error(
      'rulesVersion no es válido'
    )
  }

  if (
    !rules.firms ||
    typeof rules.firms !== 'object'
  ) {
    throw new Error(
      'No existe el catálogo de firmas'
    )
  }

  const requiredFirms = [
    'TRADEIFY',
    'LUCID',
    'MFFU',
    'APEX',
    'TOPSTEP',
    'TPT'
  ]

  for (const firmCode of requiredFirms) {
    if (!rules.firms[firmCode]) {
      throw new Error(
        `Falta la firma ${firmCode}`
      )
    }
  }
}

function validateSources(sources) {
  if (sources.schemaVersion !== 1) {
    throw new Error(
      'schemaVersion de fuentes debe ser 1'
    )
  }

  if (
    !sources.firms ||
    typeof sources.firms !== 'object'
  ) {
    throw new Error(
      'No existe la lista de fuentes'
    )
  }
}

function validatePending(pending) {
  if (!Array.isArray(pending.changes)) {
    throw new Error(
      'pending-changes.json debe contener un arreglo changes'
    )
  }
}

function validateHistory(history) {
  if (!Array.isArray(history.entries)) {
    throw new Error(
      'rules-history.json debe contener un arreglo entries'
    )
  }
}

function main() {
  console.log(
    'Validando catálogo de reglas...'
  )

  const rules = readJson(files.rules)
  const sources = readJson(files.sources)
  const pending = readJson(files.pending)
  const history = readJson(files.history)

  validateRules(rules)
  validateSources(sources)
  validatePending(pending)
  validateHistory(history)

  console.log(
    `Reglas válidas: ${rules.rulesVersion}`
  )

  console.log(
    `Firmas configuradas: ${
      Object.keys(rules.firms).length
    }`
  )

  console.log(
    'Todos los archivos son válidos.'
  )
}

try {
  main()
} catch (error) {
  console.error(
    `ERROR: ${error.message}`
  )

  process.exit(1)
}