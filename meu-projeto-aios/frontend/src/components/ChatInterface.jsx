import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Trash2 } from 'lucide-react';
import useAIChat from '../hooks/useAIChat';
import ChatMessage from './ChatMessage';
import '../styles/chat-interface.css';

export default function ChatInterface() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, loading, error, sendMessage, clearConversation } = useAIChat();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (inputValue.trim() && !loading) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleClearChat = () => {
    clearConversation();
  };

  return (
    <>
      {/* Floating Button */}
      <button
        className={`chat-floating-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Abrir Chatbot IA"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Modal de Chat */}
      {isOpen && (
        <div className="chat-modal">
          <div className="chat-header">
            <div className="chat-header-content">
              <h3>🤖 Gestor de Marketing IA</h3>
              <p className="chat-subtitle">Faça perguntas sobre o seu negócio</p>
            </div>
            <div className="chat-header-actions">
              <button
                className="chat-btn-icon"
                onClick={handleClearChat}
                title="Limpar conversa"
              >
                <Trash2 size={18} />
              </button>
              <button className="chat-btn-icon" onClick={() => setIsOpen(false)} title="Fechar">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <MessageCircle size={48} />
                <h4>Bem-vindo ao Chatbot IA</h4>
                <p>Faça perguntas sobre:</p>
                <ul>
                  <li>✅ Métricas de negócio</li>
                  <li>✅ Status de projectos</li>
                  <li>✅ Clientes e satisfação</li>
                  <li>✅ Recomendações estratégicas</li>
                </ul>
              </div>
            ) : (
              <>
                {messages.map((message, idx) => (
                  <ChatMessage key={idx} message={message} />
                ))}
                {loading && <ChatMessage message={{ role: 'assistant', content: 'Pensando...', isLoading: true }} />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Erro */}
          {error && (
            <div className="chat-error">
              <p>{error}</p>
            </div>
          )}

          {/* Input */}
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chat-input"
              placeholder="Digite sua pergunta..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={loading || !inputValue.trim()}
              title="Enviar"
            >
              {loading ? <div className="spinner-mini"></div> : <Send size={18} />}
            </button>
          </form>
        </div>
      )}

      {/* Badge de notificação */}
      {!isOpen && messages.length > 0 && (
        <div className="chat-notification-badge">{messages.length}</div>
      )}
    </>
  );
}
