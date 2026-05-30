import { Box, Text } from '@chakra-ui/react'
import { useLocale } from '../../hooks/use-locale'
import type { ConfigInputPort } from './project-flow-layout'

export function ProjectAgentToolsStrip({ ports }: { ports: ConfigInputPort[] }) {
  const { t } = useLocale()

  return (
    <Box className="project-agent-tools" aria-hidden>
      {ports.map((port) => {
        const slotLabel = port.labelKey ? t(port.labelKey) : port.label
        const valueLabel = port.occupied ? port.label : null

        return (
          <Box
            key={port.handleId}
            className={[
              'project-agent-tools__slot',
              port.occupied ? 'project-agent-tools__slot--occupied' : '',
              port.required && !port.occupied ? 'project-agent-tools__slot--required' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <Box className="project-agent-tools__connector">
              <Box className="project-agent-tools__diamond" />
              <Box className="project-agent-tools__stem" />
              <Text className="project-agent-tools__slot-name" lineClamp={1}>
                {slotLabel}
                {port.required ? (
                  <Text as="span" className="project-agent-tools__required">
                    {' *'}
                  </Text>
                ) : null}
              </Text>
            </Box>
            {valueLabel ? (
              <Text className="project-agent-tools__slot-value" lineClamp={1} title={valueLabel}>
                {valueLabel}
              </Text>
            ) : null}
          </Box>
        )
      })}
    </Box>
  )
}
