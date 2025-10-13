import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{error: Error; resetError: () => void}>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging (especially useful with Eruda on mobile)
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    
    // For mobile debugging - show alert if in development
    if (process.env.NODE_ENV === 'development') {
      const errorMessage = `JavaScript Error: ${error.message}\n\nStack: ${error.stack?.substring(0, 200)}...`;
      setTimeout(() => {
        alert(`Debug: ${errorMessage}`);
      }, 100);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
          <div className="max-w-md w-full bg-red-900/20 border border-red-500 rounded-xl p-6">
            <div className="text-center">
              <div className="text-red-400 text-5xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-white mb-4">Bir Hata Oluştu</h2>
              <div className="text-red-300 mb-6 text-left">
                <p className="mb-2">Uygulama beklenmedik bir hatayla karşılaştı.</p>
                <details className="mb-4">
                  <summary className="cursor-pointer text-red-400 hover:text-red-300">
                    Teknik Detaylar
                  </summary>
                  <div className="mt-2 p-3 bg-gray-800 rounded text-xs text-gray-300 font-mono break-words">
                    <div>Hata: {this.state.error?.message}</div>
                    <div className="mt-2 opacity-75">
                      Stack: {this.state.error?.stack?.substring(0, 300)}...
                    </div>
                  </div>
                </details>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={this.resetError}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Tekrar Dene
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Sayfayı Yenile
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full px-4 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  Ana Sayfaya Git
                </button>
              </div>
              
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600 rounded text-xs text-yellow-200">
                  <div className="font-bold mb-1">Geliştirme Modu</div>
                  <div>Bu hata geliştirme modunda görünmektedir. Mobil hata ayıklama için Eruda konsolunu kontrol edin.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;