const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const sourceBackend = path.join(projectRoot, 'backend')
const runtimeBackend = path.join(projectRoot, 'backend-runtime')

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true })

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name)

    // node_modules se copiará aparte con el nombre "modules"
    if (sourcePath === path.join(sourceBackend, 'node_modules')) {
      continue
    }

    const destinationPath = path.join(destination, entry.name)

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath)
    } else {
      fs.copyFileSync(sourcePath, destinationPath)
    }
  }
}

if (!fs.existsSync(sourceBackend)) {
  throw new Error(`No se encontró el backend: ${sourceBackend}`)
}

const sourceModules = path.join(sourceBackend, 'node_modules')

if (!fs.existsSync(sourceModules)) {
  throw new Error(
    'No existe backend/node_modules. Ejecuta primero: npm --prefix backend install'
  )
}

fs.rmSync(runtimeBackend, {
  recursive: true,
  force: true
})

copyDirectory(sourceBackend, runtimeBackend)

// Evita que electron-builder excluya la carpeta por llamarse node_modules
copyDirectory(
  sourceModules,
  path.join(runtimeBackend, 'modules')
)

console.log('Backend preparado correctamente:')
console.log(runtimeBackend)