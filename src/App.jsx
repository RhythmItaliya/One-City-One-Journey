import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './Layout.jsx'
import OneJourney from './features/one-journey/index.jsx'
import About from './features/one-journey/About.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OneJourney />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
