import { Box, Code, Link, Text, VStack } from '@chakra-ui/react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { FadeIn } from '../components/motion/FadeIn'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel, PanelBody } from '../components/ui/Panel'
import { useProductQuery } from '../hooks'

export function ProductDetailPage() {
  const { id } = useParams()
  const productId = id ? Number(id) : undefined
  const { data: product, isLoading, error } = useProductQuery(productId)

  return (
    <VStack align="stretch" gap={5}>
      <PageHeader
        title={`Product #${id}`}
        action={
          <Link asChild fontSize="sm" color="brand.emphasis">
            <RouterLink to="/products">← Products</RouterLink>
          </Link>
        }
      />

      <FadeIn>
        <Panel>
          <PanelBody>
            {error ? (
              <Text fontSize="sm" color="red.400">
                {String((error as Error).message || error)}
              </Text>
            ) : product ? (
              <Box
                as="pre"
                maxH="70vh"
                overflow="auto"
                p={4}
                borderRadius="card"
                borderWidth="1px"
                borderColor="border.subtle"
                bg="bg.input"
                fontSize="xs"
                fontFamily="mono"
              >
                <Code display="block" whiteSpace="pre-wrap" color="fg.muted" bg="transparent">
                  {JSON.stringify(product, null, 2)}
                </Code>
              </Box>
            ) : (
              <Text fontSize="sm" color="fg.muted">
                {isLoading ? 'Loading…' : 'Not found'}
              </Text>
            )}
          </PanelBody>
        </Panel>
      </FadeIn>
    </VStack>
  )
}
