import { Card, type CardBodyProps, type CardRootProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

type PanelProps = CardRootProps & {
  children: ReactNode
}

export function Panel({ children, ...props }: PanelProps) {
  return (
    <Card.Root
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="panel"
      boxShadow={{
        base: '0 16px 40px rgba(15, 23, 42, 0.08)',
        _dark: '0 20px 50px rgba(0, 0, 0, 0.38)',
      }}
      overflow="hidden"
      {...props}
    >
      {children}
    </Card.Root>
  )
}

export function PanelBody({ children, ...props }: CardBodyProps & { children: ReactNode }) {
  return (
    <Card.Body p={{ base: 4, md: 5 }} {...props}>
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
      px={{ base: 4, md: 5 }}
      pt={{ base: 4, md: 5 }}
      pb={2}
      display="flex"
      flexWrap="wrap"
      alignItems="flex-start"
      justifyContent="space-between"
      gap={3}
    >
      <div>
        <Card.Title fontSize="md" fontWeight="bold" color="fg">
          {title}
        </Card.Title>
        {description ? (
          <Card.Description mt={1} fontSize="xs" color="fg.muted">
            {description}
          </Card.Description>
        ) : null}
      </div>
      {action}
    </Card.Header>
  )
}
