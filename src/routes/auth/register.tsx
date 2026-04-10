import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/components/common/Toast'
import { Zap, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

export function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast('Le mot de passe doit contenir au moins 6 caractères.', 'error')
      return
    }
    setLoading(true)
    const { error } = await signUp(email, password, firstName, lastName)
    setLoading(false)
    if (error) {
      toast(error, 'error')
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-50 px-4">
        <div className="w-full max-w-md text-center animate-slideUp">
          <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-success-100 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-success-600" />
            </div>
            <h2 className="text-xl font-bold text-surface-900 mb-2">Vérifiez votre email</h2>
            <p className="text-surface-600 mb-6">
              Un lien de confirmation a été envoyé à <strong>{email}</strong>.
              Cliquez dessus pour activer votre compte.
            </p>
            <Link
              to="/login"
              className="inline-block rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-md animate-slideUp">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-primary-600" />
            <span className="text-2xl font-bold text-surface-900">
              Factur<span className="text-primary-600">IA</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Créer un compte</h1>
          <p className="text-surface-600 mt-1">Commencez à facturer en 2 minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-surface-200 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Prénom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-surface-300 pl-10 pr-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="Jean"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Nom</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full rounded-lg border border-surface-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                placeholder="Dupont"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-surface-300 pl-10 pr-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                placeholder="jean@exemple.fr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-surface-300 pl-10 pr-10 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                placeholder="6 caractères minimum"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-surface-600 mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
