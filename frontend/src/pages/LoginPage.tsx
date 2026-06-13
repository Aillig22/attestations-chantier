import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import logoAxa from '@/assets/logo-axa.svg'
import { AxaSwitch } from '@/components/AxaSwitch'
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
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-axa-blue to-axa-blue-dark">
      {/* Hero Switch (52°) — un seul, centré sur tout le format de la page */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-[118/100] h-[68%] -translate-x-1/2 -translate-y-1/2">
        <AxaSwitch className="h-full w-full" />
      </div>

      {/* Marque — en haut à gauche, une seule fois */}
      <div className="absolute left-8 top-8 z-10 flex items-center gap-3 text-white">
        <img src={logoAxa} alt="AXA" className="h-12 w-12 rounded-lg bg-white p-1" />
        <span className="text-2xl font-bold tracking-tight">AXA France</span>
      </div>

      {/* Contenu : titre (gauche) + carte formulaire (droite) */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-between gap-10 px-8">
        <div className="hidden max-w-xs lg:block">
          <h1 className="text-4xl font-bold uppercase leading-tight text-white">
            Attestations
            <br />
            de chantier
          </h1>
          <p className="mt-4 text-sm text-white/75">
            La plateforme de gestion et de validation des attestations de chantier, du distributeur
            au siège.
          </p>
        </div>

        <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-2xl">
          <h2 className="mb-1.5 text-2xl font-bold text-foreground">Connexion</h2>
          <p className="mb-6 text-sm text-muted">Accédez à votre espace de travail.</p>

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
            <button type="submit" className="btn-primary mt-1 w-full" disabled={loading}>
              <LogIn size={16} />
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-border bg-background p-3 text-xs text-muted">
            <p className="mb-1 font-semibold text-foreground">Comptes de démonstration</p>
            <p>Distributeur — <span className="font-medium text-foreground">agent</span> / demo1234</p>
            <p>Siège — <span className="font-medium text-foreground">siege</span> / demo1234</p>
          </div>
        </div>
      </div>
    </div>
  )
}
