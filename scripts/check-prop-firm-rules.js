const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')

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
    JSON.stringify(data, null, 2) + '\n',
    'utf8'
  )
}

async function main() {
  const rules = readJson(rulesPath)
  const sources = readJson(sourcesPath)

  console.log(
    `Catálogo actual: ${rules.rulesVersion}`
  )

  const enabledFirms =
    Object.entries(sources.firms)
      .filter(([, firm]) =>
        firm.enabled === true
      )
      .map(([firmCode]) => firmCode)

  console.log(
    `Firmas habilitadas: ${
      enabledFirms.join(', ')
    }`
  )

  /*
    En la siguiente fase, cada extractor
    revisará sus páginas oficiales.

    Por ahora generamos un archivo pendiente
    válido sin modificar las reglas.
  */

  const pendingChanges = {
    schemaVersion: 1,
    generatedAt:
      new Date().toISOString(),
    rulesVersionChecked:
      rules.rulesVersion,
    firmsChecked:
      enabledFirms,
    changes: []
  }

  writeJson(
    pendingPath,
    pendingChanges
  )

  console.log(
    'Revisión terminada.'
  )

  console.log(
    'No se detectaron cambios.'
  )
}

main().catch(error => {
  console.error(
    'Error revisando reglas:',
    error
  )

  process.exit(1)
})