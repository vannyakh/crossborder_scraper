import { Box, Button, Link, Text } from '@chakra-ui/react'
import { motion } from 'motion/react'
import { Link as RouterLink } from 'react-router-dom'
import { Panel, PanelBody } from '../components/ui/Panel'

export function NotFoundPage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Panel>
        <PanelBody py={12}>
          <Box textAlign="center">
          <Text fontFamily="heading" fontSize="4xl" fontWeight="extrabold" className="brand-gradient-text">
            404
          </Text>
          <Text mt={2} color="fg.muted">
            Page not found.
          </Text>
          <Link asChild mt={6} display="inline-block">
            <RouterLink to="/">
              <Button colorPalette="purple" borderRadius="input">
                Back to dashboard
              </Button>
            </RouterLink>
          </Link>
          </Box>
        </PanelBody>
      </Panel>
    </motion.div>
  )
}
