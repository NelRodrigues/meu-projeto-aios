import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useAIChat() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Inicializar conversa ao montar
  useEffect(() => {
    // Gerar ID única de conversa
    const newId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setConversationId(newId);
    setMessages([]);
  }, []);

  // Enviar mensagem
  const sendMessage = useCallback(
    async (userMessage) => {
      if (!userMessage.trim() || !conversationId) {
        return;
      }

      // Adicionar mensagem do utilizador ao UI imediatamente
      const userMsg = {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      try {
        // Enviar para backend
        const response = await axios.post(`${API_URL}/api/chat`, {
          conversationId,
          message: userMessage,
        });

        // Adicionar resposta da IA
        const assistantMsg = {
          role: 'assistant',
          content: response.data.assistantMessage,
          timestamp: response.data.timestamp,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Erro ao processar mensagem';
        setError(errorMessage);
        console.error('Erro ao enviar mensagem:', err);

        // Remover a última mensagem do utilizador se houve erro
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    },
    [conversationId]
  );

  // Limpar conversa
  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setConversationId(`conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  return {
    conversationId,
    messages,
    loading,
    error,
    sendMessage,
    clearConversation,
  };
}

export default useAIChat;
