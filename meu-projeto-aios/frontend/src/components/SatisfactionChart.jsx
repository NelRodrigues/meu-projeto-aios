import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function SatisfactionChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">Sem dados disponíveis</div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];

      return (
        <div className="custom-tooltip">
          <p className="label">{data.payload.week}</p>
          <p className="value">
            ⭐ Satisfação: {data.value}/10
          </p>
          <p className="extra">
            Entradas: {data.payload.entries}
          </p>
        </div>
      );
    }
    return null;
  };

  const getBarColor = (value) => {
    if (value >= 8) return '#10b981'; // Verde
    if (value >= 6) return '#eab308'; // Amarelo
    return '#ef4444'; // Vermelho
  };

  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">⭐ Satisfação Média por Semana</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="week"
            stroke="#666"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke="#666"
            tick={{ fontSize: 12 }}
            domain={[0, 10]}
            label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="satisfação"
            name="Satisfação"
            fill="#3b82f6"
            animationDuration={800}
            radius={[8, 8, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.satisfação)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Stats */}
      <div className="chart-stats">
        {(() => {
          const avgScore = (
            data.reduce((sum, d) => sum + d.satisfação, 0) / data.length
          ).toFixed(2);
          const maxScore = Math.max(...data.map((d) => d.satisfação)).toFixed(2);
          const minScore = Math.min(...data.map((d) => d.satisfação)).toFixed(2);

          return (
            <>
              <div className="stat-item">
                <p className="stat-name">Média Geral</p>
                <p className="stat-value">⭐ {avgScore}/10</p>
              </div>
              <div className="stat-item">
                <p className="stat-name">Máxima</p>
                <p className="stat-value">⭐ {maxScore}/10</p>
              </div>
              <div className="stat-item">
                <p className="stat-name">Mínima</p>
                <p className="stat-value">⭐ {minScore}/10</p>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
