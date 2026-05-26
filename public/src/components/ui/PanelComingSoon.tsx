import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { Sparkles, type LucideIcon } from 'lucide-react'
import { Section, SectionCard } from './Section'

export const DEFAULT_COMING_SOON_BLURB =
  'This capability is on the roadmap. Configure scrape, AI, and export in Settings while we ship new panel features.'

export function PanelComingSoon({
  title,
  description,
  icon: Icon,
  blurb = DEFAULT_COMING_SOON_BLURB,
  showHeader = false,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  blurb?: string
  /** When false, only the card is rendered (use with page Toolbar). */
  showHeader?: boolean
}) {
  const card = (
    <SectionCard>
      <VStack align="center" textAlign="center" py={{ base: 6, md: 10 }} gap={4}>
        {Icon ? (
          <Box
            p={4}
            borderRadius="full"
            bg="colorPalette.subtle"
            color="colorPalette.fg"
            colorPalette="gray"
            lineHeight={0}
          >
            <Icon size={32} strokeWidth={1.75} />
          </Box>
        ) : null}
        <Box maxW="md">
          <HStack justify="center" gap={2} mb={2}>
            <Sparkles size={16} strokeWidth={2} />
            <Text fontSize="sm" fontWeight="semibold" color="fg">
              Coming soon
            </Text>
          </HStack>
          <Text fontSize="sm" color="fg.muted" lineHeight="tall">
            {blurb}
          </Text>
        </Box>
      </VStack>
    </SectionCard>
  )

  if (!showHeader) return card

  return (
    <Section title={title} description={description} mt={0}>
      {card}
    </Section>
  )
}
