import { createBrowserRouter, RouterProvider, Navigate } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Home } from './pages/Home'
import { TopicSelection } from './pages/TopicSelection'
import { Guide } from './pages/Guide'
import { Plus } from './pages/Plus'
import { Conversation } from './pages/Conversation'
import { ConversationEnded } from './pages/ConversationEnded'
import { DevEndedPreview } from './pages/DevEndedPreview'
import { KanjiModes } from './pages/KanjiModes'
import { KanjiLevels } from './pages/KanjiLevels'
import { KanjiMatching } from './pages/KanjiMatching'
import { KanjiFlashcards } from './pages/KanjiFlashcards'
import { NotFound } from './pages/NotFound'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/topics', element: <TopicSelection /> },
  { path: '/guide', element: <Guide /> },
  { path: '/kanji', element: <KanjiModes /> },
  { path: '/kanji/:mode/level', element: <KanjiLevels /> },
  { path: '/kanji/matching/play/:level', element: <KanjiMatching /> },
  { path: '/kanji/flashcards/play/:level', element: <KanjiFlashcards /> },
  { path: '/plus', element: <Plus /> },
  // Tomo Pro was renamed to Plus; keep old links working.
  { path: '/pro', element: <Navigate to="/plus" replace /> },
  { path: '/conversation/ended', element: <ConversationEnded /> },
  { path: '/conversation/ended-mock', element: <DevEndedPreview /> },
  { path: '/conversation', element: <Conversation /> },
  // TEMPORARY: dev-only preview route, see DevEndedPreview.tsx
  // Catch-all, so it has to stay last.
  { path: '*', element: <NotFound /> },
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
