'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { DollarSign, Users, ShoppingCart, Activity } from 'lucide-react';

const lineChartData = [
  { month: 'January', subscriptions: 400 },
  { month: 'February', subscriptions: 300 },
  { month: 'March', subscriptions: 600 },
  { month: 'April', subscriptions: 800 },
  { month: 'May', subscriptions: 500 },
  { month: 'June', subscriptions: 700 },
];

const barChartData = [
  { month: 'January', sales: 120 },
  { month: 'February', sales: 200 },
  { month: 'March', sales: 150 },
  { month: 'April', sales: 300 },
  { month: 'May', sales: 250 },
  { month: 'June', sales: 400 },
];

const chartConfig = {
  subscriptions: {
    label: 'Subscriptions',
    color: '#2563eb',
  },
  sales: {
    label: 'Sales',
    color: '#84cc16',
  },
};

export default function DashboardPage() {
  return (
    <div className="space-y-8 p-2">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2350</div>
            <p className="text-xs text-muted-foreground">+180.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground">+19% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">+201 since last hour</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions Over Time</CardTitle>
            <CardDescription>A line chart showing monthly subscriptions.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <LineChart data={lineChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="subscriptions" stroke="var(--color-subscriptions)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Month</CardTitle>
            <CardDescription>A bar chart showing monthly sales.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart data={barChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend content={<ChartLegendContent />} />
                <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}