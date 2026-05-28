import type { StoreCatalogItem, StoreEnvironment } from '../../lib/api'

export type DatabaseEngineSetupState = {
  /** Listed in the App Store catalog for this engine tab */
  inCatalog: boolean
  /** Host can run native driver install (Linux VPS scripts) */
  canInstallNative: boolean
  /** Host can install via Docker */
  canInstallDocker: boolean
  /** Either install path is ready */
  canInstall: boolean
  canConnectExternal: boolean
  statusLabelKey:
    | 'db.engine.notInstalled'
    | 'db.engine.readyToInstall'
    | 'db.engine.needsDocker'
    | 'db.engine.needsHostDriver'
    | 'db.engine.unavailableOnHost'
  setupHintKey:
    | 'db.engine.setupCanInstall'
    | 'db.engine.setupNeedDocker'
    | 'db.engine.setupNeedHostDriver'
    | 'db.engine.setupNeedDockerOrHost'
    | 'db.engine.setupUnavailable'
}

export function getDatabaseEngineSetupState(
  catalogItem: StoreCatalogItem | undefined,
  env: StoreEnvironment | undefined,
  installed: boolean,
): DatabaseEngineSetupState {
  if (!catalogItem) {
    return {
      inCatalog: false,
      canInstallNative: false,
      canInstallDocker: false,
      canInstall: false,
      canConnectExternal: false,
      statusLabelKey: 'db.engine.unavailableOnHost',
      setupHintKey: 'db.engine.setupUnavailable',
    }
  }

  const nativeReady = Boolean(env?.native_driver_available)
  const dockerReady = Boolean(env?.docker_available && env?.compose_available)
  const canInstallNative = Boolean(catalogItem.supports_native && nativeReady)
  const canInstallDocker = Boolean(catalogItem.supports_docker && dockerReady)
  const canInstall = !installed && (canInstallNative || canInstallDocker)
  const canConnectExternal = Boolean(catalogItem.supports_external && !installed)

  let statusLabelKey: DatabaseEngineSetupState['statusLabelKey'] = 'db.engine.notInstalled'
  if (!installed && canInstall) {
    statusLabelKey = 'db.engine.readyToInstall'
  } else if (!installed && catalogItem.supports_docker && !dockerReady) {
    statusLabelKey = 'db.engine.needsDocker'
  } else if (
    !installed &&
    catalogItem.supports_native &&
    !nativeReady &&
    !catalogItem.supports_docker
  ) {
    statusLabelKey = 'db.engine.needsHostDriver'
  } else if (!installed && !canInstall && !canConnectExternal) {
    statusLabelKey = 'db.engine.unavailableOnHost'
  }

  let setupHintKey: DatabaseEngineSetupState['setupHintKey'] = 'db.engine.setupCanInstall'
  if (canInstall) {
    setupHintKey = 'db.engine.setupCanInstall'
  } else if (
    catalogItem.supports_docker &&
    !dockerReady &&
    catalogItem.supports_native &&
    !nativeReady
  ) {
    setupHintKey = 'db.engine.setupNeedDockerOrHost'
  } else if (catalogItem.supports_docker && !dockerReady) {
    setupHintKey = 'db.engine.setupNeedDocker'
  } else if (catalogItem.supports_native && !nativeReady) {
    setupHintKey = 'db.engine.setupNeedHostDriver'
  } else {
    setupHintKey = 'db.engine.setupUnavailable'
  }

  return {
    inCatalog: true,
    canInstallNative,
    canInstallDocker,
    canInstall,
    canConnectExternal,
    statusLabelKey,
    setupHintKey,
  }
}
