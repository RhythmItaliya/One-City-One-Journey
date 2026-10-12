import { Route, Info, PenTool } from 'lucide-react'

// Sidebar (desktop) and bottom tabs (mobile).
export const NAV = [
  { to: '/', label: 'Journey planner', icon: Route },
  { to: '/figma', label: 'Figma', icon: PenTool },
  { to: '/about', label: 'About + PPP', icon: Info },
]
