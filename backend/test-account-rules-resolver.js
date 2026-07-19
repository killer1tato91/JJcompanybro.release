const {
  updateRulesFromGitHub
} = require(
  './services/propFirmRulesService'
)

const {
  resolveAccountRules
} = require(
  './services/accountRulesResolver'
)

async function main() {
  await updateRulesFromGitHub()

  const examples = [
    {
      name:
        'TRADEIFY SELECT 25K EVALUATION',
      accountStage:
        'EVALUATION'
    },
    {
      name:
        'TDFY GROWTH 50K',
      accountStage:
        'EVALUATION'
    },
    {
      name:
        'TRADEIFY-ACCOUNT-12345',
      startingBalance:
        25000,
      accountStage:
        'EVALUATION'
    },
    {
      name:
        'LFE02568327680012',
      startingBalance:
        25000,
      accountStage:
        'EVALUATION'
    }
  ]

  examples.forEach(account => {
    console.log(
      '\nCUENTA:',
      account.name
    )

    console.dir(
      resolveAccountRules(account),
      {
        depth: 10
      }
    )
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})