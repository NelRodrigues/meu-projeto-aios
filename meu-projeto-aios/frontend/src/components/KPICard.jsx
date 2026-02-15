import { TrendingUp, TrendingDown } from 'lucide-react';
import '../styles/kpi-card.css';

export default function KPICard({ title, value, change, trend, icon, color = 'blue' }) {
  const isPositive = trend === 'up';

  return (
    <div className={`kpi-card kpi-${color}`}>
      <div className="kpi-header">
        <h3 className="kpi-title">{title}</h3>
        <div className="kpi-icon">{icon}</div>
      </div>

      <div className="kpi-body">
        <div className="kpi-value">{value}</div>
        {change !== undefined && (
          <div className={`kpi-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{Math.abs(change)}%</span>
            <span className="change-period">vs. mês anterior</span>
          </div>
        )}
      </div>
    </div>
  );
}
