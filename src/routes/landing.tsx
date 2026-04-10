import { Link } from 'react-router-dom'
import {
  Zap,
  FileText,
  Shield,
  BarChart3,
  Clock,
  CheckCircle,
  ArrowRight,
  Star,
} from 'lucide-react'

const FEATURES = [
  {
    icon: FileText,
    title: 'Factures conformes',
    description: 'Mentions légales automatiques, numérotation séquentielle, format Factur-X.',
  },
  {
    icon: Shield,
    title: 'Fiscalité intégrée',
    description: 'TVA multi-taux, catégorisation PCG, export FEC pour votre comptable.',
  },
  {
    icon: BarChart3,
    title: 'Tableau de bord',
    description: 'CA temps réel, seuils micro-entreprise, ventilation services/marchandises.',
  },
  {
    icon: Clock,
    title: 'Devis en 30 secondes',
    description: 'Catalogue produits, conversion devis → facture en un clic.',
  },
]

const PLANS = [
  {
    name: 'Gratuit',
    price: '0',
    description: 'Pour démarrer',
    features: ['5 factures/mois', '1 client', 'Mentions légales auto', 'PDF conforme'],
    cta: 'Commencer gratuitement',
    popular: false,
  },
  {
    name: 'Solo',
    price: '9',
    description: 'Pour les indépendants',
    features: [
      'Factures illimitées',
      'Clients illimités',
      'Relances automatiques',
      'Export comptable FEC',
      'Devis + conversion',
      'Factur-X',
    ],
    cta: 'Essai gratuit 14 jours',
    popular: true,
  },
  {
    name: 'Pro',
    price: '29',
    description: 'Pour les TPE',
    features: [
      'Tout Solo +',
      'IA génération factures',
      'Multi-utilisateur',
      'Dashboard avancé',
      'Support prioritaire',
      'API accès',
    ],
    cta: 'Essai gratuit 14 jours',
    popular: false,
  },
]

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
      <header className="border-b border-surface-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-7 w-7 text-primary-600" />
              <span className="text-xl font-bold text-surface-900">
                Factur<span className="text-primary-600">IA</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-surface-600 hover:text-surface-900"
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Essai gratuit
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700 mb-6">
            <Star className="h-4 w-4" />
            Conforme facturation électronique 2026
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-surface-900 leading-tight">
            La facturation
            <br />
            <span className="text-primary-600">intelligente</span> pour les indépendants
          </h1>
          <p className="mt-6 text-lg text-surface-600 max-w-2xl mx-auto">
            Créez des factures conformes en 30 secondes. TVA automatique,
            Factur-X, export FEC, seuils micro-entreprise — tout est géré.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-base font-medium text-white hover:bg-primary-700"
            >
              Commencer gratuitement
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center rounded-lg border border-surface-300 px-6 py-3 text-base font-medium text-surface-700 hover:bg-surface-50"
            >
              Voir les tarifs
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-surface-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-surface-900 text-center mb-12">
            Tout ce qu'il faut pour facturer sereinement
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-xl border border-surface-200 p-6">
                <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary-600" />
                </div>
                <h3 className="font-semibold text-surface-900 mb-2">{f.title}</h3>
                <p className="text-sm text-surface-600">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-surface-900 text-center mb-4">
            Des tarifs simples et transparents
          </h2>
          <p className="text-center text-surface-600 mb-12">
            Commencez gratuitement, passez au supérieur quand vous êtes prêt.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 ${
                  plan.popular
                    ? 'border-primary-500 ring-2 ring-primary-500/20 relative'
                    : 'border-surface-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-3 py-0.5 text-xs font-medium text-white">
                    Populaire
                  </div>
                )}
                <h3 className="text-lg font-semibold text-surface-900">{plan.name}</h3>
                <p className="text-sm text-surface-600 mt-1">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-surface-900">{plan.price}€</span>
                  <span className="text-surface-600">/mois</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success-500 mt-0.5 shrink-0" />
                      <span className="text-surface-700">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`mt-6 block w-full rounded-lg px-4 py-2.5 text-sm font-medium text-center ${
                    plan.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'border border-surface-300 text-surface-700 hover:bg-surface-50'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-200 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary-600" />
              <span className="font-bold text-surface-900">
                Factur<span className="text-primary-600">IA</span>
              </span>
            </div>
            <p className="text-sm text-surface-500">
              &copy; {new Date().getFullYear()} FacturIA. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
