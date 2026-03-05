import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MessageSquare, Users, TrendingUp, Activity } from "lucide-react";

const COLORS = ["hsl(210,85%,45%)", "hsl(195,75%,38%)", "hsl(180,65%,35%)", "hsl(165,70%,32%)", "hsl(150,60%,30%)"];

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery<{
    totalSessions: number;
    totalMessages: number;
    avgMessagesPerSession: number;
    topCategories: Array<{ category: string; count: number }>;
    topDomains: Array<{ domain: string; count: number }>;
    sessionsOverTime: Array<{ date: string; count: number }>;
  }>({ queryKey: ["/api/admin/analytics"] });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of chatbot performance and usage</p>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border border-border"><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Sessions", value: analytics?.totalSessions || 0, icon: Users, color: "text-chart-1" },
                { label: "Total Messages", value: analytics?.totalMessages || 0, icon: MessageSquare, color: "text-chart-2" },
                { label: "Avg Messages/Session", value: analytics?.avgMessagesPerSession || 0, icon: TrendingUp, color: "text-chart-3" },
                { label: "Active Topics", value: analytics?.topCategories?.length || 0, icon: Activity, color: "text-chart-4" },
              ].map((stat, i) => (
                <Card key={i} className="border border-border" data-testid={`card-stat-${i}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
                      <stat.icon className={`w-4 h-4 text-muted-foreground`} />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Sessions Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  {(analytics?.sessionsOverTime?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={analytics!.sessionsOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Line type="monotone" dataKey="count" stroke="hsl(210,85%,45%)" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">No session data yet</div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Top Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  {(analytics?.topCategories?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={analytics!.topCategories}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="count" fill="hsl(210,85%,45%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">No category data yet</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {(analytics?.topDomains?.length || 0) > 0 && (
              <Card className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Top Domains</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie data={analytics!.topDomains} dataKey="count" nameKey="domain" cx="50%" cy="50%" outerRadius={80}>
                          {analytics!.topDomains.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {analytics!.topDomains.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-foreground">{d.domain}</span>
                          <span className="text-muted-foreground">({d.count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
