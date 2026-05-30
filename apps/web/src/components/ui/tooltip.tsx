import { Tooltip as ChakraTooltip, Portal } from '@chakra-ui/react'
import * as React from 'react'

export interface TooltipProps extends ChakraTooltip.RootProps {
  showArrow?: boolean
  portalled?: boolean
  portalRef?: React.RefObject<HTMLElement | null>
  content: React.ReactNode
  contentProps?: ChakraTooltip.ContentProps
  disabled?: boolean
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(props, ref) {
  const {
    showArrow,
    children,
    disabled,
    portalled = true,
    content,
    contentProps,
    portalRef,
    ...rest
  } = props

  const { className: contentClassName, ...restContentProps } = contentProps ?? {}

  if (disabled) return children

  return (
    <ChakraTooltip.Root {...rest}>
      <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
      <Portal disabled={!portalled} container={portalRef}>
        <ChakraTooltip.Positioner className="panel-tooltip-positioner">
          <ChakraTooltip.Content
            ref={ref}
            className={['panel-tooltip', contentClassName].filter(Boolean).join(' ')}
            {...restContentProps}
          >
            {showArrow ? (
              <ChakraTooltip.Arrow className="panel-tooltip__arrow">
                <ChakraTooltip.ArrowTip className="panel-tooltip__arrow-tip" />
              </ChakraTooltip.Arrow>
            ) : null}
            {content}
          </ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </Portal>
    </ChakraTooltip.Root>
  )
})
