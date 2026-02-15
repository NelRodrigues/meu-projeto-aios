import '../styles/chat-message.css';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const isLoading = message.isLoading;

  return (
    <div className={`chat-message-wrapper ${isUser ? 'user' : 'assistant'}`}>
      <div className={`chat-message ${isLoading ? 'loading' : ''}`}>
        {/* Avatar */}
        <div className="chat-message-avatar">
          {isUser ? '👤' : '🤖'}
        </div>

        {/* Conteúdo */}
        <div className="chat-message-content">
          {isLoading ? (
            <div className="message-loading">
              <span></span>
              <span></span>
              <span></span>
            </div>
          ) : (
            <p>{message.content}</p>
          )}
        </div>

        {/* Timestamp */}
        {message.timestamp && !isLoading && (
          <div className="chat-message-time">
            {new Date(message.timestamp).toLocaleTimeString('pt-AO', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  );
}
