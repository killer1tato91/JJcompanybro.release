const {
  updateRulesFromGitHub,
  getRulesStatus,
  getFirmRules
} = require(
  './services/propFirmRulesService'
)

async function main() {
  console.log(
    'Descargando reglas desde GitHub...'
  )

  const result =
    await updateRulesFromGitHub()

  console.log(
    'RESULTADO:',
    {
      success: result.success,
      updated: result.updated,
      error: result.error,
      version:
        result.rules?.rulesVersion
    }
  )

  console.log(
    'ESTADO:',
    getRulesStatus()
  )

  console.log(
    'TRADEIFY:',
    Boolean(
      getFirmRules('TRADEIFY')
    )
  )
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})