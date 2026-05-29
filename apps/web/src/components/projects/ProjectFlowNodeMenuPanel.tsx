import { HStack, Kbd, Menu, Text } from '@chakra-ui/react'
import { useLocale } from '../../hooks/use-locale'
import { useProjectFlowActions } from './project-flow-actions-context'

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

export function ProjectFlowNodeMenuPanel({ nodeId }: { nodeId: string }) {
  const { t } = useLocale()
  const actions = useProjectFlowActions()

  if (!actions) return null

  return (
    <Menu.Content minW="15.5rem" className="project-flow-node-menu__content">
      <MenuRow
        value="open"
        label={t('projects.nodeMenu.open')}
        shortcut={[t('projects.nodeMenu.keys.enter')]}
        onSelect={() => actions.openNodeConfig(nodeId)}
      />
      <MenuRow
        value="execute"
        label={t('projects.nodeMenu.executeStep')}
        disabled
        onSelect={() => actions.executeStep(nodeId)}
      />
      <MenuRow
        value="rename"
        label={t('projects.nodeMenu.rename')}
        shortcut={[t('projects.nodeMenu.keys.space')]}
        disabled
        onSelect={() => actions.previewNodeAction('rename')}
      />
      <MenuRow
        value="replace"
        label={t('projects.nodeMenu.replace')}
        shortcut={[t('projects.nodeMenu.keys.r')]}
        disabled
        onSelect={() => actions.previewNodeAction('replace')}
      />
      <MenuRow
        value="deactivate"
        label={t('projects.nodeMenu.deactivate')}
        shortcut={[t('projects.nodeMenu.keys.d')]}
        disabled
        onSelect={() => actions.previewNodeAction('deactivate')}
      />
      <MenuRow
        value="pin"
        label={t('projects.nodeMenu.pin')}
        shortcut={[t('projects.nodeMenu.keys.p')]}
        disabled
        onSelect={() => actions.previewNodeAction('pin')}
      />

      <Menu.Separator />

      <MenuRow
        value="copy"
        label={t('projects.nodeMenu.copy')}
        shortcut={[t('projects.nodeMenu.keys.mod'), 'C']}
        onSelect={() => actions.copyNode(nodeId)}
      />
      <MenuRow
        value="duplicate"
        label={t('projects.nodeMenu.duplicate')}
        shortcut={[t('projects.nodeMenu.keys.mod'), 'D']}
        onSelect={() => actions.duplicateNode(nodeId)}
      />

      <Menu.Separator />

      <MenuRow
        value="tidy"
        label={t('projects.nodeMenu.tidyWorkflow')}
        shortcut={[t('projects.nodeMenu.keys.shift'), t('projects.nodeMenu.keys.alt'), 'T']}
        onSelect={() => actions.tidyWorkflow()}
      />

      <Menu.Separator />

      <MenuRow
        value="subflow"
        label={t('projects.nodeMenu.convertSubflow')}
        shortcut={[t('projects.nodeMenu.keys.alt'), 'X']}
        disabled
        onSelect={() => actions.previewNodeAction('subflow')}
      />

      <Menu.Separator />

      <MenuRow
        value="select-all"
        label={t('projects.nodeMenu.selectAll')}
        shortcut={[t('projects.nodeMenu.keys.mod'), 'A']}
        onSelect={() => actions.selectAllNodes()}
      />
      <MenuRow
        value="clear-selection"
        label={t('projects.nodeMenu.clearSelection')}
        onSelect={() => actions.clearSelection()}
      />

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
    </Menu.Content>
  )
}
