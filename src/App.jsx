import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'
import ComingSoon from './pages/ComingSoon'
import ListeningIndex from './pages/listening/ListeningIndex'
import MaterialsList from './pages/listening/MaterialsList'
import MaterialDetail from './pages/listening/MaterialDetail'
import AddMaterial from './pages/listening/AddMaterial'
import GenerateMaterial from './pages/listening/GenerateMaterial'
import ClassroomMode from './pages/listening/ClassroomMode'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Navigate to="/dashboard/listening" replace />} />
            <Route path="/dashboard/listening" element={<ListeningIndex />} />
            <Route path="/dashboard/listening/materials" element={<MaterialsList />} />
            <Route path="/dashboard/listening/materials/:id" element={<MaterialDetail />} />
            <Route path="/dashboard/listening/add" element={<AddMaterial />} />
            <Route path="/dashboard/listening/generate" element={<GenerateMaterial />} />
            <Route path="/dashboard/listening/classroom" element={<ClassroomMode />} />
            <Route path="/dashboard/listening/classroom/:id" element={<ClassroomMode />} />
            <Route path="/dashboard/speaking" element={<ComingSoon section="Speaking" color="emerald" />} />
            <Route path="/dashboard/reading" element={<ComingSoon section="Reading" color="amber" />} />
            <Route path="/dashboard/writing" element={<ComingSoon section="Writing" color="rose" />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
