import { createBrowserRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TopicSelection } from './pages/TopicSelection'
import { Conversation } from './pages/Conversation'

const router = createBrowserRouter([
  { path: '/', element: <TopicSelection /> },
  { path: '/conversation/:topic_key', element: <Conversation /> },
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
