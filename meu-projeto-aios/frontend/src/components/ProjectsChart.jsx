import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f97316'];

export default function ProjectsChart({ data = [] }) {
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
      const percentage = ((data.value / payload[0].payload.total) * 100).toFixed(1);

      return (
        <div className="custom-tooltip">
          <p className="label">{data.name}</p>
          <p className="value">{data.value} projetos</p>
          <p className="percentage">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  // Calcular total para percentagem
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const dataWithTotal = data.map((d) => ({ ...d, total }));

  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">🎯 Projetos por Status</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={dataWithTotal}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, value, total }) =>
              `${name}: ${((value / total) * 100).toFixed(0)}%`
            }
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {dataWithTotal.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Stats abaixo do gráfico */}
      <div className="chart-stats">
        {dataWithTotal.map((item, index) => (
          <div key={item.name} className="stat-item">
            <div
              className="stat-color"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            ></div>
            <div className="stat-info">
              <p className="stat-name">{item.name}</p>
              <p className="stat-value">
                {item.value} ({((item.value / total) * 100).toFixed(1)}%)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
