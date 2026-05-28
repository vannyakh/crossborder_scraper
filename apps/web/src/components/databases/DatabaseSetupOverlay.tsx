import { Box, Button, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { Download, Link2, Plus } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreCatalogItem } from '../../lib/api'
import { ROUTE_PATHS } from '../../routes/route-config'
import { pluginIcon } from '../store/store-utils'
import { Panel, PanelBody } from '../ui/Panel'
import type { DatabaseEngineSetupState } from './database-engine-setup'

export function DatabaseSetupOverlay({
  catalogItem,
  setup,
  installing,
  onInstall,
  onConnectExternal,
}: {
  catalogItem: StoreCatalogItem
  setup: DatabaseEngineSetupState
  installing: boolean
  onInstall: () => void
  onConnectExternal: () => void
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const Icon = pluginIcon(catalogItem.id)
  const showDockerLink = !setup.canInstall && catalogItem.supports_docker && !setup.canInstallDocker

  return (
    <Panel position="relative" overflow="hidden">
      <Box
        position="absolute"
        inset={0}
        bg="blackAlpha.600"
        backdropFilter="blur(3px)"
        zIndex={1}
        aria-hidden
      />
      <PanelBody position="relative" zIndex={2} py={{ base: 10, md: 12 }} px={{ base: 4, md: 8 }}>
        <VStack gap={4} maxW="28rem" mx="auto" textAlign="center">
          <Box p={3} borderRadius="full" bg="bg.elevated" color="fg.muted" boxShadow="md">
            <Icon size={32} strokeWidth={1.75} />
          </Box>
          <VStack gap={1}>
            <Text fontSize="lg" fontWeight="semibold" letterSpacing="-0.02em">
              {t('db.engine.setupTitle', { engine: catalogItem.name })}
            </Text>
            <Text fontSize="sm" color="fg.muted" lineHeight="tall">
              {catalogItem.description}
            </Text>
            <Text fontSize="sm" color="fg.muted" lineHeight="tall">
              {t(setup.setupHintKey)}
            </Text>
          </VStack>
          <HStack gap={2} flexWrap="wrap" justify="center" w="full">
            <Button
              size="sm"
              colorPalette={accentPalette}
              borderRadius="input"
              loading={installing}
              disabled={!setup.canInstall}
              onClick={onInstall}
            >
              {setup.canInstall ? <Plus size={14} /> : <Download size={14} />}
              {t('db.engine.installCta', { engine: catalogItem.name })}
            </Button>
            {catalogItem.supports_external ? (
              <Button
                size="sm"
                variant="outline"
                borderColor="border.subtle"
                borderRadius="input"
                onClick={onConnectExternal}
              >
                <Link2 size={14} />
                {t('db.install.connectExternal')}
              </Button>
            ) : null}
          </HStack>
          {showDockerLink ? (
            <Text fontSize="xs" color="fg.subtle">
              {t('db.engine.setupDockerLinkPrefix')}{' '}
              <Link asChild color="fg" fontWeight="medium">
                <RouterLink to={ROUTE_PATHS.docker}>{t('nav.docker')}</RouterLink>
              </Link>
            </Text>
          ) : null}
        </VStack>
      </PanelBody>
    </Panel>
  )
}
