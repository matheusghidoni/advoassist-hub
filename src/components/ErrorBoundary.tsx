import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { createLogger } from "@/lib/logger";

const log = createLogger("ErrorBoundary");

interface Props {
  children: ReactNode;
  /** Custom fallback UI. Receives a reset callback so the user can retry. */
  fallback?: (reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — catches render-phase errors in the subtree and
 * shows a recoverable fallback instead of crashing the whole page.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeFeature />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    log.error("Uncaught render error:", error, info.componentStack);
    // TODO: send to error-tracking service (e.g. Sentry.captureException(error))
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.reset);
      }

      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Algo deu errado
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {this.state.error?.message ?? "Ocorreu um erro inesperado nesta seção."}
            </p>
          </div>
          <Button variant="outline" onClick={this.reset}>
            Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
