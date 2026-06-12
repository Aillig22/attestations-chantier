import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { apiError } from '@/lib/api'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('agent')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-axa-blue p-4">
      <div className="card-axa w-full max-w-sm card-pad">
        <div className="mb-6 text-center">
          <p className="text-3xl font-bold text-axa-blue">AXA</p>
          <p className="text-sm text-muted">Plateforme Attestations de chantier</p>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <label className="label-axa">Identifiant</label>
            <input
              className="input-axa"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-row">
            <label className="label-axa">Mot de passe</label>
            <input
              type="password"
              className="input-axa"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="error-text mb-3">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <div className="mt-4 rounded-lg bg-background p-3 text-xs text-muted">
          <p className="font-medium text-foreground">Comptes de démo :</p>
          <p>Distributeur — agent / demo1234</p>
          <p>Siège — siege / demo1234</p>
        </div>
      </div>
    </div>
  )
}
