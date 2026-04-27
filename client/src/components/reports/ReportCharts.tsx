import React from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip as RechartsTooltip, ResponsiveContainer, 
    Cell, PieChart, Pie, Legend 
} from 'recharts';
import { formatCurrency, formatShortCurrency } from '../../utils/format';

export const BarChartRow: React.FC<{ data: any[], nameKey: string, valueKey: string, label: string }> = ({ data, nameKey, valueKey, label }) => {
    if (!data?.length) return null;
    const maxVal = Math.max(...data.map((d: any) => d[valueKey] || 0), 1);
    return (
        <div className="space-y-2.5 mt-2">
            {data.slice(0, 8).map((item: any, i: number) => (
                <div key={item[nameKey] || item.id || i} className="group">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-surface-700 font-medium truncate mr-2 capitalize">
                            {item[nameKey] || 'N/A'}
                        </span>
                        <span className="text-surface-500 font-medium whitespace-nowrap">
                            {typeof item[valueKey] === 'number' && label.includes('₹')
                                ? formatCurrency(item[valueKey])
                                : item[valueKey]}
                        </span>
                    </div>
                    <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                                width: `${Math.max((item[valueKey] / maxVal) * 100, 2)}%`,
                                background: `linear-gradient(90deg, 
                                    hsl(${240 - i * 25}, 70%, 55%), 
                                    hsl(${240 - i * 25}, 70%, 65%))`,
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

export const CompanyBarChart: React.FC<{ data: any[], nameKey: string, valueKey: string, label?: string }> = ({ data, nameKey, valueKey, label = 'Premium' }) => {
    if (!data?.length) return null;

    const chartData = data.slice(0, 8).map(d => ({
        name: String(d[nameKey] || 'N/A'),
        value: Number(d[valueKey]) || 0,
    }));

    return (
        <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
                        tickFormatter={(val) => formatShortCurrency(val).replace('₹', '').trim()}
                        width={45}
                    />
                    <RechartsTooltip
                        cursor={{ fill: '#F9FAFB' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-white px-3 py-2 shadow-lg shadow-surface-900/5 rounded-xl border border-surface-100">
                                        <p className="text-xs font-bold text-surface-900 mb-1">{payload[0].payload.name}</p>
                                        <p className="text-sm font-semibold text-primary-600">
                                            {formatCurrency(payload[0].value as number)} {label}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {chartData.map((_, index) => (
                            <Cell key={index} fill={`hsl(${240 - index * 6}, 70%, 60%)`} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const PolicyPieChart: React.FC<{ data: any[], nameKey: string, valueKey: string }> = ({ data, nameKey, valueKey }) => {
    if (!data?.length) return null;

    const chartData = data.map(d => ({
        name: String(d[nameKey] || 'N/A'),
        value: Number(d[valueKey]) || 0,
    }));

    const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    return (
        <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <RechartsTooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-white px-3 py-2 shadow-lg rounded-xl border border-surface-100">
                                        <p className="text-xs font-bold text-surface-900 mb-1">{payload[0].payload.name}</p>
                                        <p className="text-sm font-semibold text-surface-600">
                                            {payload[0].value} Policies
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500, color: '#4B5563' }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
