import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/components/common/Toast'
import { Zap, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast(error, 'error')
    } else {
      navigate('/app')
    }
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
          <h1 className="text-2xl font-bold text-surface-900">Connexion</h1>
          <p className="text-surface-600 mt-1">Accédez à votre espace de facturation</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-surface-200 p-6 space-y-4">
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
                placeholder="vous@exemple.fr"
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
                className="w-full rounded-lg border border-surface-300 pl-10 pr-10 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                placeholder="••••••••"
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

          <div className="flex justify-end">
            <Link to="/reset-password" className="text-sm text-primary-600 hover:text-primary-700">
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-surface-600 mt-6">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
