import { Card, type CardBodyProps, type CardRootProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

type PanelProps = CardRootProps & {
  children: ReactNode
}

/** Flat bordered surface — radius from global UI config */
export function Panel({ children, ...props }: PanelProps) {
  return (
    <Card.Root
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-panel)"
      shadow="none"
      overflow="hidden"
      transition="border-color var(--motion-duration), box-shadow var(--motion-duration)"
      {...props}
    >
      {children}
    </Card.Root>
  )
}

export function PanelBody({ children, ...props }: CardBodyProps & { children: ReactNode }) {
  return (
    <Card.Body p="calc(var(--shell-padding) * 0.85)" {...props}>
      {children}
    </Card.Body>
  )
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <Card.Header
      px="calc(var(--shell-padding) * 0.85)"
      py={3}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      display="flex"
      flexWrap="wrap"
      alignItems="center"
      justifyContent="space-between"
      gap={2}
      bg="bg.panelHover"
      borderTopRadius="var(--radius-panel)"
    >
      <div>
        <Card.Title fontSize="sm" fontWeight="semibold" color="fg">
          {title}
        </Card.Title>
        {description ? (
          <Card.Description mt={0.5} fontSize="xs" color="fg.muted">
            {description}
          </Card.Description>
        ) : null}
      </div>
      {action}
    </Card.Header>
  )
}
