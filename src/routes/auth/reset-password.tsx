import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/components/common/Toast'
import { Zap, Mail, ArrowLeft } from 'lucide-react'

export function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { resetPassword } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) {
      toast(error, 'error')
    } else {
      setSent(true)
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
          <h1 className="text-2xl font-bold text-surface-900">Mot de passe oublié</h1>
          <p className="text-surface-600 mt-1">
            {sent ? 'Email envoyé !' : 'Entrez votre email pour réinitialiser'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-success-100 flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-success-600" />
              </div>
              <p className="text-surface-600 mb-6">
                Si un compte existe avec l'adresse <strong>{email}</strong>,
                vous recevrez un lien de réinitialisation.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
