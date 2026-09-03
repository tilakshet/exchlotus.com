import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { Provider as ReduxProvider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { routeTree } from './routeTree.gen'
import { store } from '@/store'
import { queryClient } from '@/lib/query-client'

const router = createRouter({ routeTree })

// A route chunk's hash changes on every deploy, and the deploy replaces the
// whole static dir — so a tab left open across a deploy can try to fetch a
// chunk file that no longer exists. nginx's SPA fallback (try_files $uri
// /index.html) turns that missing-file request into a 200 text/html
// response instead of a 404, which the browser then refuses to run as a
// module (surfaces as "'text/html' is not a valid JavaScript MIME type" on
// Safari). Vite fires this event for exactly that case; reloading fetches
// the current index.html and resolves to the current chunk hashes.
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ReduxProvider>
  </StrictMode>,
)
