import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

export default function Financeiro() {
  const recebimentos = [
    { id: 1, cliente: "João Silva", processo: "1234567-12.2025", valor: 15000, pago: 10000, status: "parcial" },
    { id: 2, cliente: "Maria Santos", processo: "7654321-45.2025", valor: 8000, pago: 8000, status: "pago" },
    { id: 3, cliente: "Pedro Costa", processo: "9876543-78.2024", valor: 12000, pago: 0, status: "pendente" },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Controle de honorários e receitas</p>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total a Receber</p>
                <p className="text-2xl font-bold text-foreground">R$ 35.000</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recebido este mês</p>
                <p className="text-2xl font-bold text-success">R$ 18.000</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold text-warning">R$ 17.000</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa Adimplência</p>
                <p className="text-2xl font-bold text-foreground">85%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Recebimentos */}
        <Card className="p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Honorários por Processo</h2>
          <div className="space-y-3">
            {recebimentos.map(rec => {
              const percentual = (rec.pago / rec.valor) * 100;
              return (
                <div
                  key={rec.id}
                  className="rounded-lg border border-border bg-gradient-card p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{rec.cliente}</h3>
                      <p className="text-sm text-muted-foreground">Processo: {rec.processo}</p>
                    </div>
                    <Badge variant={
                      rec.status === 'pago' ? 'default' :
                      rec.status === 'parcial' ? 'secondary' : 'destructive'
                    }>
                      {rec.status === 'pago' ? 'Quitado' :
                       rec.status === 'parcial' ? 'Parcial' : 'Pendente'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        R$ {rec.pago.toLocaleString('pt-BR')} / R$ {rec.valor.toLocaleString('pt-BR')}
                      </span>
                      <span className="font-medium text-foreground">{percentual.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full transition-all ${
                          rec.status === 'pago' ? 'bg-success' :
                          rec.status === 'parcial' ? 'bg-warning' : 'bg-destructive'
                        }`}
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
