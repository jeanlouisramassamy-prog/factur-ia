import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-error-500 mb-4" />
          <h2 className="text-xl font-semibold text-surface-900 mb-2">
            Une erreur est survenue
          </h2>
          <p className="text-surface-600 mb-4 max-w-md">
            {this.state.error?.message || 'Erreur inconnue'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Recharger la page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
