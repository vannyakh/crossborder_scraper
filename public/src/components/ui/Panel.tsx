import { Card, type CardBodyProps, type CardRootProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

type PanelProps = CardRootProps & {
  children: ReactNode
}

/** Flat bordered surface (Alist file-manager cards) */
export function Panel({ children, ...props }: PanelProps) {
  return (
    <Card.Root
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="panel"
      shadow="none"
      overflow="hidden"
      {...props}
    >
      {children}
    </Card.Root>
  )
}

export function PanelBody({ children, ...props }: CardBodyProps & { children: ReactNode }) {
  return (
    <Card.Body p={{ base: 3, md: 4 }} {...props}>
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
      px={{ base: 3, md: 4 }}
      py={3}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      display="flex"
      flexWrap="wrap"
      alignItems="center"
      justifyContent="space-between"
      gap={2}
      bg="bg.panelHover"
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
