import { Box, Button, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { motion } from 'motion/react'
import { Link as RouterLink } from 'react-router-dom'
import { FadeIn } from '../components/motion/FadeIn'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel, PanelBody } from '../components/ui/Panel'
import { useDeleteProductMutation, useProductsQuery } from '../hooks'

const MotionBox = motion.create(Box)

export function ProductsPage() {
  const { data, isLoading, error, refetch } = useProductsQuery()
  const deleteMutation = useDeleteProductMutation()

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const err = error ? String((error as Error).message || error) : ''

  async function remove(id: number) {
    if (!confirm('Delete this product from the database?')) return
    await deleteMutation.mutateAsync(id)
  }

  return (
    <VStack align="stretch" gap={5}>
      <PageHeader
        title="Products"
        description={`${total} scraped products in SQLite.`}
        action={
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            onClick={() => void refetch()}
            loading={isLoading}
          >
            Refresh
          </Button>
        }
      />

      <FadeIn>
        <Panel>
          <PanelBody>
            {err ? (
              <Text fontSize="sm" color="red.400" mb={3}>
                {err}
              </Text>
            ) : null}
            {isLoading ? (
              <Text fontSize="sm" color="fg.muted">
                Loading…
              </Text>
            ) : items.length === 0 ? (
              <Text fontSize="sm" color="fg.muted">
                No products yet. Run a scrape from the dashboard.
              </Text>
            ) : (
              <VStack align="stretch" gap={2}>
                {items.map((p, i) => (
                  <MotionBox
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025 }}
                    p={4}
                    borderRadius="card"
                    borderWidth="1px"
                    borderColor="border.subtle"
                    bg="bg.elevated"
                  >
                    <HStack justify="space-between" align="flex-start" gap={3}>
                      <Box flex={1} minW={0}>
                        <Text fontWeight="semibold">{p.title}</Text>
                        <Text mt={1} fontSize="xs" color="fg.muted" wordBreak="break-all">
                          {p.source_url}
                        </Text>
                        <Text mt={1} fontSize="xs" color="fg.subtle">
                          {p.source} · {p.source_product_id} ·{' '}
                          {new Date(p.updated_at).toLocaleString()}
                        </Text>
                      </Box>
                      <HStack gap={2} flexShrink={0}>
                        <Link asChild>
                          <RouterLink to={`/products/${p.id}`}>
                            <Button size="xs" variant="outline" colorPalette="purple">
                              View
                            </Button>
                          </RouterLink>
                        </Link>
                        <Button
                          size="xs"
                          variant="outline"
                          colorPalette="red"
                          loading={deleteMutation.isPending}
                          onClick={() => void remove(p.id)}
                        >
                          Delete
                        </Button>
                      </HStack>
                    </HStack>
                  </MotionBox>
                ))}
              </VStack>
            )}
          </PanelBody>
        </Panel>
      </FadeIn>
    </VStack>
  )
}
