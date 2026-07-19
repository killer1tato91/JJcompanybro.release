const {
  updateRulesFromGitHub
} = require(
  './services/propFirmRulesService'
)

const {
  classifyAccount
} = require(
  './services/accountClassifier'
)

async function main() {
  await updateRulesFromGitHub()

  const examples = [
    {
      name:
        'TRADEIFY SELECT 25K EVALUATION'
    },
    {
      name:
        'TDFY GROWTH 50K'
    },
    {
      name:
        'TRADEIFY-ACCOUNT-12345',
      startingBalance: 25000
    },
    {
      name:
        'LFE02568327680012',
      balance: 25307.5
    }
  ]

  examples.forEach(account => {
    console.log(
      '\nCUENTA:',
      account.name
    )

    console.log(
      classifyAccount(account)
    )
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})