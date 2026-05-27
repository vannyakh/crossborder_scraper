import { Box, Code, Link, Text } from '@chakra-ui/react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { ExportProductPanel } from '../components/products/ExportProductPanel'
import { Toolbar } from '../components/layout/Toolbar'
import { Panel, PanelBody } from '../components/ui/Panel'
import { useProductQuery } from '../hooks'

export function ProductDetailPage() {
  const { id } = useParams()
  const productId = id ? Number(id) : undefined
  const { data: product, isLoading, error } = useProductQuery(productId)

  return (
    <>
      <Toolbar
        title={`Product #${id}`}
        actions={
          <Link asChild fontSize="sm" color="brand.emphasis">
            <RouterLink to="/artifact/products">← Back to product catalog</RouterLink>
          </Link>
        }
      />

      <Panel>
        <PanelBody>
          {error ? (
            <Text fontSize="sm" color="red.500">
              {String((error as Error).message || error)}
            </Text>
          ) : product ? (
            <Box
              as="pre"
              maxH="70vh"
              overflow="auto"
              p={3}
              borderRadius="input"
              borderWidth="1px"
              borderColor="border.subtle"
              bg="bg.input"
              fontSize="xs"
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

      {product && productId ? (
        <ExportProductPanel
          productId={productId}
          productTitle={typeof product.title === 'string' ? product.title : undefined}
        />
      ) : null}
    </>
  )
}
