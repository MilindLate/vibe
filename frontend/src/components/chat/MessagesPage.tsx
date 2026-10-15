// src/components/chat/MessagesPage.tsx
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageApi } from '../../services/api';
import { useAuthStore } from '../../context/AuthContext';
import { formatTimeAgo } from '../../utils/formatters';
import { Loading } from '../common/Loading';
import { FaPaperPlane, FaArrowLeft } from 'react-icons/fa';

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: convData, isLoading: convLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messageApi.getConversations().then((r) => r.data.data),
  });

  const { data: msgData } = useQuery({
    queryKey: ['messages', selectedConversation],
    queryFn: () => messageApi.getMessages(selectedConversation!).then((r) => r.data.data),
    enabled: !!selectedConversation,
    refetchInterval: 3000, // Poll every 3s when no WebSocket
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => messageApi.sendMessage(selectedConversation!, content),
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['messages', selectedConversation] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgData?.messages]);

  const conversations = convData?.conversations || [];
  const messages = msgData?.messages || [];

  const selectedConv = conversations.find((c: any) => c.id === selectedConversation);
  const otherParticipant = selectedConv?.participants.find((p: any) => p.userId !== user?.id)?.user;

  if (convLoading) return <Loading fullScreen />;

  return (
    <div className="h-full flex bg-black">
      {/* Conversation list */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-vibe-border`}>
        <div className="p-4 border-b border-vibe-border">
          <h1 className="text-white text-xl font-bold">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 p-8 text-center">
              <p>No messages yet. Follow someone to start chatting.</p>
            </div>
          ) : conversations.map((conv: any) => {
            const other = conv.participants.find((p: any) => p.userId !== user?.id)?.user;
            const lastMsg = conv.messages?.[0];
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-vibe-border/50 ${selectedConversation === conv.id ? 'bg-white/5' : ''}`}
              >
                <img
                  src={other?.avatarUrl || `https://ui-avatars.com/api/?name=${other?.displayName}&background=555&color=fff`}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white font-semibold truncate">{other?.displayName || conv.name || 'Group'}</p>
                  <p className="text-gray-500 text-sm truncate">{lastMsg?.content || 'Start a conversation'}</p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Message thread */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-vibe-border">
            <button onClick={() => setSelectedConversation(null)} className="md:hidden text-white">
              <FaArrowLeft />
            </button>
            <img
              src={otherParticipant?.avatarUrl || `https://ui-avatars.com/api/?name=${otherParticipant?.displayName}&background=555&color=fff`}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p className="text-white font-semibold">{otherParticipant?.displayName}</p>
              <p className="text-gray-500 text-xs">@{otherParticipant?.username}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((msg: any) => {
              const isMine = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${isMine ? 'bg-primary text-white rounded-br-sm' : 'bg-vibe-card text-white rounded-bl-sm'}`}>
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${isMine ? 'text-white/60' : 'text-gray-500'}`}>
                      {formatTimeAgo(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-vibe-border">
            <form
              onSubmit={(e) => { e.preventDefault(); if (message.trim()) sendMutation.mutate(message.trim()); }}
              className="flex gap-2"
            >
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Send a message..."
                className="input-field flex-1"
              />
              <button type="submit" disabled={!message.trim() || sendMutation.isPending} className="btn-primary px-4 disabled:opacity-50">
                <FaPaperPlane />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-gray-500">
          <p>Select a conversation to start messaging</p>
        </div>
      )}
    </div>
  );
}
