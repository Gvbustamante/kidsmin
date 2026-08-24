import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Spinner from './components/Spinner'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Landing from './pages/Landing'
import CompleteProfile from './pages/CompleteProfile'
import Tutorial from './pages/Tutorial'
import Devocionales from './pages/Devocionales'
import DevocionalDetalle from './pages/DevocionalDetalle'
import ActividadDetalle from './pages/ActividadDetalle'
import MiFamilia from './pages/MiFamilia'
import Foro from './pages/Foro'
import Drive from './pages/Drive'

import AdminHome from './pages/admin/AdminHome'
import Ninos from './pages/admin/Ninos'
import Docentes from './pages/admin/Docentes'
import AsistenciaAdmin from './pages/admin/AsistenciaAdmin'
import ActividadesAdmin from './pages/admin/ActividadesAdmin'
import AgendaAdmin from './pages/admin/AgendaAdmin'
import Ajustes from './pages/admin/Ajustes'
import BitacoraAdmin from './pages/admin/BitacoraAdmin'
import Planeacion from './pages/admin/Planeacion'

import DocenteHome from './pages/docente/DocenteHome'
import Asistencia from './pages/docente/Asistencia'
import Actividades from './pages/docente/Actividades'
import Agenda from './pages/docente/Agenda'
import Progreso from './pages/docente/Progreso'
import BitacoraDocente from './pages/docente/Bitacora'

import PadreHome from './pages/padre/PadreHome'
import PadreActividades from './pages/padre/PadreActividades'
import PadreAgenda from './pages/padre/PadreAgenda'
import PadreProgreso from './pages/padre/PadreProgreso'

const STAFF = ['admin', 'coordinador']

export default function App() {
  const { loading } = useAuth()
  if (loading) return <Spinner />

  return (
    <Routes>
      <Route path="/bienvenida" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/completar-perfil" element={<CompleteProfile />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<RoleSwitchHome />} />
        <Route path="/ayuda" element={<Tutorial />} />
        <Route path="/devocionales" element={<Devocionales />} />
        <Route path="/devocionales/:id" element={<DevocionalDetalle />} />
        <Route path="/foro" element={<Foro />} />
        <Route
          path="/mi-familia"
          element={
            <ProtectedRoute roles={[...STAFF, 'docente']}>
              <MiFamilia />
            </ProtectedRoute>
          }
        />
        <Route
          path="/drive"
          element={
            <ProtectedRoute roles={[...STAFF, 'docente']}>
              <Drive />
            </ProtectedRoute>
          }
        />

        {/* Admin / coordinador */}
        <Route
          path="/ninos"
          element={
            <ProtectedRoute roles={[...STAFF, 'docente']}>
              <Ninos />
            </ProtectedRoute>
          }
        />
        <Route path="/usuarios" element={<Navigate to="/docentes" replace />} />
        <Route path="/clases" element={<Navigate to="/ninos" replace />} />
        <Route
          path="/docentes"
          element={
            <ProtectedRoute roles={STAFF}>
              <Docentes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/asistencia"
          element={
            <ProtectedRoute roles={[...STAFF, 'docente']}>
              <RoleSwitchAsistencia />
            </ProtectedRoute>
          }
        />
        <Route path="/citas-biblicas" element={<Navigate to="/devocionales" replace />} />
        <Route
          path="/ajustes"
          element={
            <ProtectedRoute roles={STAFF}>
              <Ajustes />
            </ProtectedRoute>
          }
        />
        <Route path="/materiales" element={<Navigate to="/bitacora" replace />} />
        <Route path="/estrellas" element={<Navigate to="/ajustes" replace />} />
        <Route
          path="/planeacion"
          element={
            <ProtectedRoute roles={[...STAFF, 'docente']}>
              <Planeacion />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bitacora"
          element={
            <ProtectedRoute roles={[...STAFF, 'docente']}>
              <RoleSwitchBitacora />
            </ProtectedRoute>
          }
        />

        {/* Docente */}
        <Route
          path="/actividades"
          element={
            <ProtectedRoute roles={[...STAFF, 'docente', 'padre']}>
              <RoleSwitchActividades />
            </ProtectedRoute>
          }
        />
        <Route
          path="/actividades/:id"
          element={
            <ProtectedRoute roles={[...STAFF, 'docente', 'padre']}>
              <ActividadDetalle />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agenda"
          element={
            <ProtectedRoute roles={[...STAFF, 'docente', 'padre']}>
              <RoleSwitchAgenda />
            </ProtectedRoute>
          }
        />
        <Route
          path="/progreso"
          element={
            <ProtectedRoute roles={['docente', 'padre']}>
              <RoleSwitchProgreso />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

function RoleSwitchHome() {
  const { profile } = useAuth()
  if (profile.role === 'docente') return <DocenteHome />
  if (profile.role === 'padre') return <PadreHome />
  return <AdminHome />
}

function RoleSwitchAsistencia() {
  const { profile } = useAuth()
  return profile.role === 'docente' ? <Asistencia /> : <AsistenciaAdmin />
}

function RoleSwitchBitacora() {
  const { profile } = useAuth()
  return STAFF.includes(profile.role) ? <BitacoraAdmin /> : <BitacoraDocente />
}

function RoleSwitchActividades() {
  const { profile } = useAuth()
  if (STAFF.includes(profile.role)) return <ActividadesAdmin />
  return profile.role === 'docente' ? <Actividades /> : <PadreActividades />
}

function RoleSwitchAgenda() {
  const { profile } = useAuth()
  if (STAFF.includes(profile.role)) return <AgendaAdmin />
  return profile.role === 'docente' ? <Agenda /> : <PadreAgenda />
}

function RoleSwitchProgreso() {
  const { profile } = useAuth()
  return profile.role === 'docente' ? <Progreso /> : <PadreProgreso />
}
