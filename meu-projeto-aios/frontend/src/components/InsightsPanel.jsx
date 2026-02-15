import { AlertCircle, TrendingUp, Lightbulb, Brain } from 'lucide-react';
import '../styles/insights-panel.css';

export default function InsightsPanel({ insights = [] }) {
  const getIconForType = (type) => {
    switch (type) {
      case 'alert':
        return <AlertCircle size={20} />;
      case 'trend':
        return <TrendingUp size={20} />;
      case 'recommendation':
        return <Lightbulb size={20} />;
      case 'prediction':
        return <Brain size={20} />;
      default:
        return <Lightbulb size={20} />;
    }
  };

  const getSeverityClass = (severity) => {
    return `severity-${severity || 'medium'}`;
  };

  return (
    <div className="insights-panel">
      <div className="insights-header">
        <h2>🤖 Insights de IA</h2>
        <span className="insights-count">{insights.length} insights activos</span>
      </div>

      {insights.length === 0 ? (
        <div className="insights-empty">
          <Brain size={48} />
          <p>Sem insights no momento. A IA está a analisar os dados...</p>
        </div>
      ) : (
        <div className="insights-grid">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`insight-card ${getSeverityClass(insight.severity)}`}
            >
              <div className="insight-icon">
                {getIconForType(insight.type)}
              </div>
              <div className="insight-content">
                <h4 className="insight-title">{insight.title}</h4>
                <p className="insight-description">{insight.description}</p>
                {insight.action_items && insight.action_items.length > 0 && (
                  <ul className="insight-actions">
                    {insight.action_items.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="insight-badge">{insight.type}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
