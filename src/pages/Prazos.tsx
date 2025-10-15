import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useState } from "react";

export default function Prazos() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 15)); // Oct 15, 2025

  const prazos = [
    { id: 1, dia: 17, titulo: "Petição Inicial", processo: "1234567-12.2025", tipo: "Judicial", prioridade: "high" },
    { id: 2, dia: 20, titulo: "Recurso", processo: "7654321-45.2025", tipo: "Judicial", prioridade: "medium" },
    { id: 3, dia: 22, titulo: "Audiência", processo: "9876543-78.2024", tipo: "Judicial", prioridade: "high" },
    { id: 4, dia: 25, titulo: "Protocolo", processo: "1111111-11.2025", tipo: "Administrativo", prioridade: "low" },
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getPrazosByDay = (day: number) => {
    return prazos.filter(p => p.dia === day);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prazos</h1>
            <p className="text-muted-foreground">Controle todos os seus prazos e compromissos</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Prazo
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold text-foreground">2</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CalendarIcon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Próximos 7 dias</p>
                <p className="text-2xl font-bold text-warning">7</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticos (&lt; 3 dias)</p>
                <p className="text-2xl font-bold text-destructive">3</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Clock className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </Card>
        </div>

        {/* Calendar */}
        <Card className="p-6 shadow-card">
          {/* Calendar Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold capitalize text-foreground">{monthName}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Week days */}
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground">
                {day}
              </div>
            ))}
            
            {/* Empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-24 rounded-lg bg-muted/30"></div>
            ))}
            
            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayPrazos = getPrazosByDay(day);
              const isToday = day === 15;
              
              return (
                <div
                  key={day}
                  className={`min-h-24 rounded-lg border p-2 transition-colors hover:border-primary ${
                    isToday ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className={`mb-1 text-sm font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayPrazos.map(prazo => (
                      <div
                        key={prazo.id}
                        className={`rounded px-1.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${
                          prazo.prioridade === 'high'
                            ? 'bg-destructive/20 text-destructive hover:bg-destructive/30'
                            : prazo.prioridade === 'medium'
                            ? 'bg-warning/20 text-warning hover:bg-warning/30'
                            : 'bg-success/20 text-success hover:bg-success/30'
                        }`}
                      >
                        {prazo.titulo}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Upcoming Deadlines List */}
        <Card className="p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Próximos Prazos</h2>
          <div className="space-y-3">
            {prazos.map(prazo => (
              <div
                key={prazo.id}
                className="flex items-center justify-between rounded-lg border border-border bg-gradient-card p-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 flex-col items-center justify-center rounded-lg font-semibold ${
                    prazo.prioridade === 'high'
                      ? 'bg-destructive/10 text-destructive'
                      : prazo.prioridade === 'medium'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-success/10 text-success'
                  }`}>
                    <span className="text-xs">OUT</span>
                    <span className="text-lg">{prazo.dia}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{prazo.titulo}</h3>
                    <p className="text-sm text-muted-foreground">Processo: {prazo.processo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={prazo.tipo === 'Judicial' ? 'default' : 'secondary'}>
                    {prazo.tipo}
                  </Badge>
                  <Button variant="outline" size="sm">Ver detalhes</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
