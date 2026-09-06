import { createBrowserRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TopicSelection } from './pages/TopicSelection'
import { Conversation } from './pages/Conversation'
import { ConversationEnded } from './pages/ConversationEnded'
import { DevEndedPreview } from './pages/DevEndedPreview'

const router = createBrowserRouter([
  { path: '/', element: <TopicSelection /> },
  { path: '/conversation/ended', element: <ConversationEnded /> },
  { path: '/conversation/ended-mock', element: <DevEndedPreview /> },
  { path: '/conversation/:topic_key', element: <Conversation /> },
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
