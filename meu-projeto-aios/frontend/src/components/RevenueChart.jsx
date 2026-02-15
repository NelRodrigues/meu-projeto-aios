import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function RevenueChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">Sem dados disponíveis</div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{payload[0].payload.date}</p>
          <p className="value monthly">
            Mensal: KZ {payload[0].value?.toLocaleString('pt-AO')}
          </p>
          {payload[1] && (
            <p className="value annual">
              Média Anual: KZ {payload[1].value?.toLocaleString('pt-AO')}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">📈 Receita ao Longo do Tempo</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="date"
            stroke="#666"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke="#666"
            tick={{ fontSize: 12 }}
            label={{ value: 'Valor (KZ)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="monthly"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Receita Mensal"
            isAnimationActive={true}
          />
          <Line
            type="monotone"
            dataKey="annual"
            stroke="#a855f7"
            strokeWidth={2}
            dot={{ fill: '#a855f7', r: 4 }}
            activeDot={{ r: 6 }}
            name="Média Anual"
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
