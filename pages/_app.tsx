import { AnimatePresence, motion } from 'framer-motion'
import type { AppProps } from 'next/app'

export default function MyApp ({ Component, pageProps }: AppProps) {
  return (
    <AnimatePresence
      onExitComplete={() => window.scrollTo(0, 0)}
      mode='wait'
      initial={false}
    >
      <Component {...pageProps} />
    </AnimatePresence>
  )
}
