import { HStack, Kbd, Menu, Text } from '@chakra-ui/react'
import { useLocale } from '../../hooks/use-locale'
import { useProjectWorkspace } from '../layout/project-shell/project-workspace-context'
import { useProjectFlowActions } from './project-flow-actions-context'
import type { ProjectNode } from './project-sample-data'
import { getSubNodeCapabilities } from './project-subnode-config'

type MenuRowProps = {
  value: string
  label: string
  shortcut?: string[]
  disabled?: boolean
  onSelect?: () => void
}

function MenuRow({ value, label, shortcut, disabled, onSelect }: MenuRowProps) {
  return (
    <Menu.Item
      value={value}
      disabled={disabled}
      className="project-flow-node-menu__row"
      onClick={disabled ? undefined : onSelect}
    >
      <Text flex={1} fontSize="sm">
        {label}
      </Text>
      {shortcut?.length ? (
        <HStack className="project-flow-node-menu__shortcut" gap={0.5} flexShrink={0}>
          {shortcut.map((key) => (
            <Kbd key={key} className="project-flow-node-menu__key" size="sm">
              {key}
            </Kbd>
          ))}
        </HStack>
      ) : null}
    </Menu.Item>
  )
}

export function ProjectFlowSubNodeMenuPanel({
  nodeId,
  node,
}: {
  nodeId: string
  node: ProjectNode
}) {
  const { t } = useLocale()
  const { project } = useProjectWorkspace()
  const actions = useProjectFlowActions()

  if (!actions) return null

  const { menu } = getSubNodeCapabilities(project, node)

  return (
    <Menu.Content minW="14rem" className="project-flow-node-menu__content">
      {menu.open ? (
        <MenuRow
          value="open"
          label={t('projects.nodeMenu.open')}
          onSelect={() => actions.openNodeConfig(nodeId)}
        />
      ) : null}
      {menu.replace ? (
        <MenuRow
          value="replace"
          label={t('projects.nodeMenu.replace')}
          disabled
          onSelect={() => actions.previewNodeAction('replace')}
        />
      ) : null}

      {menu.duplicate || menu.copy ? <Menu.Separator /> : null}

      {menu.duplicate ? (
        <MenuRow
          value="duplicate"
          label={t('projects.nodeMenu.duplicate')}
          onSelect={() => actions.duplicateNode(nodeId)}
        />
      ) : null}
      {menu.copy ? (
        <MenuRow
          value="copy"
          label={t('projects.nodeMenu.copy')}
          onSelect={() => actions.copyNode(nodeId)}
        />
      ) : null}

      {menu.remove ? (
        <>
          <Menu.Separator />
          <Menu.Item
            value="remove"
            color="fg.error"
            className="project-flow-node-menu__row"
            onClick={() => actions.removeNode(nodeId)}
          >
            <Text flex={1} fontSize="sm">
              {t('projects.nodeMenu.remove')}
            </Text>
          </Menu.Item>
        </>
      ) : null}
    </Menu.Content>
  )
}
