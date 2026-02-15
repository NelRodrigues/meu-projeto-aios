import { useState } from 'react';
import { X, AlertCircle, TrendingUp, Lightbulb, Zap } from 'lucide-react';
import '../styles/ai-insights-panel.css';

export default function AIInsightsPanel({ insights = [], onDismiss, loading = false }) {
  const [expanded, setExpanded] = useState(null);

  if (loading) {
    return (
      <div className="insights-panel loading">
        <div className="insights-skeleton">
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="insights-panel empty">
        <div className="insights-empty-state">
          <Lightbulb size={32} />
          <p>Sem insights disponíveis</p>
        </div>
      </div>
    );
  }

  // Ordenar por severidade (critical > high > medium > low)
  const sortedInsights = [...insights].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const getIconByType = (type) => {
    switch (type) {
      case 'alert':
        return <AlertCircle size={20} />;
      case 'trend':
        return <TrendingUp size={20} />;
      case 'prediction':
        return <Zap size={20} />;
      case 'recommendation':
      default:
        return <Lightbulb size={20} />;
    }
  };

  const getSeverityClass = (severity) => {
    return `insight-card severity-${severity}`;
  };

  return (
    <div className="insights-panel">
      <div className="insights-header">
        <h3>🤖 Insights de IA</h3>
        <span className="insights-count">{insights.length}</span>
      </div>

      <div className="insights-list">
        {sortedInsights.map((insight) => (
          <div
            key={insight.id}
            className={getSeverityClass(insight.severity)}
            onClick={() => setExpanded(expanded === insight.id ? null : insight.id)}
          >
            <div className="insight-header">
              <div className="insight-icon-wrapper">
                <div className={`insight-icon icon-${insight.type}`}>
                  {getIconByType(insight.type)}
                </div>
              </div>

              <div className="insight-content">
                <div className="insight-title-row">
                  <h4 className="insight-title">{insight.title}</h4>
                  <span className={`insight-badge badge-${insight.type}`}>
                    {insight.type === 'recommendation' && 'Recomendação'}
                    {insight.type === 'alert' && 'Alerta'}
                    {insight.type === 'trend' && 'Tendência'}
                    {insight.type === 'prediction' && 'Predição'}
                  </span>
                </div>
                <p className="insight-preview">
                  {insight.description.substring(0, 80)}
                  {insight.description.length > 80 ? '...' : ''}
                </p>
              </div>

              <button
                className="insight-dismiss"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(insight.id);
                }}
                title="Descartar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Secção expandida */}
            {expanded === insight.id && (
              <div className="insight-expanded">
                <div className="insight-description">
                  <p>{insight.description}</p>
                </div>

                {insight.action_items && insight.action_items.length > 0 && (
                  <div className="insight-actions">
                    <p className="actions-label">Acções Recomendadas:</p>
                    <ul>
                      {insight.action_items.map((action, idx) => (
                        <li key={idx}>
                          <span className="action-number">{idx + 1}</span>
                          <span className="action-text">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="insight-meta">
                  <small>
                    Válido até:{' '}
                    {new Date(insight.valid_until).toLocaleDateString('pt-AO')}
                  </small>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
