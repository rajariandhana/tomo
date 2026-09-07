import { createBrowserRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Home } from './pages/Home'
import { TopicSelection } from './pages/TopicSelection'
import { Guide } from './pages/Guide'
import { Pro } from './pages/Pro'
import { Conversation } from './pages/Conversation'
import { ConversationEnded } from './pages/ConversationEnded'
import { DevEndedPreview } from './pages/DevEndedPreview'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/topics', element: <TopicSelection /> },
  { path: '/guide', element: <Guide /> },
  { path: '/pro', element: <Pro /> },
  { path: '/conversation/ended', element: <ConversationEnded /> },
  { path: '/conversation/ended-mock', element: <DevEndedPreview /> },
  { path: '/conversation', element: <Conversation /> },
  // TEMPORARY: dev-only preview route, see DevEndedPreview.tsx
])

const query_client = new QueryClient({
  defaultOptions: { mutations: { retry: false } },
})

export default function App() {
  return (
    <QueryClientProvider client={query_client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
