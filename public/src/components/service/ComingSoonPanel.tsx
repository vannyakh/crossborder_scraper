import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { Sparkles } from 'lucide-react'
import { Section, SectionCard } from '../ui/Section'
import { COMING_SOON_BLURB, SERVICE_SECTION_MAP, type ServiceSectionId } from './service-sections'

export function ComingSoonPanel({ section }: { section: ServiceSectionId }) {
  const item = SERVICE_SECTION_MAP[section]
  const Icon = item.icon

  return (
    <Section
      title={item.label}
      description={item.description}
      mt={0}
    >
      <SectionCard>
        <VStack align="center" textAlign="center" py={{ base: 6, md: 10 }} gap={4}>
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
          <Box maxW="md">
            <HStack justify="center" gap={2} mb={2}>
              <Sparkles size={16} strokeWidth={2} />
              <Text fontSize="sm" fontWeight="semibold" color="fg">
                Coming soon
              </Text>
            </HStack>
            <Text fontSize="sm" color="fg.muted" lineHeight="tall">
              {COMING_SOON_BLURB}
            </Text>
          </Box>
        </VStack>
      </SectionCard>
    </Section>
  )
}
