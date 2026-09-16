import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, PlusCircle, Sparkles, Loader2, BookOpen, Play, Video, ExternalLink, AlertCircle } from 'lucide-react';
import { storageService } from '../../services/storage/storageService';
import { chatService } from '../../services/api/chatService';
import { chatHistoryService } from '../../services/chatHistoryService';
import { supabase } from '../../services/supabase';
import { ChatMessage, LearningMaterial } from '../../types';
import { Button } from '../ui/Button';

interface AiTutorChatProps {
  selectedMaterial?: LearningMaterial | null;
}

export const AiTutorChat: React.FC<AiTutorChatProps> = ({ selectedMaterial }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [dbError, setDbError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHistoryFromSupabase() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.warn('User not authenticated with Supabase Auth.');
          if (isMounted) {
            setDbError('Please sign in to save your conversation history.');
          }
          return;
        }

        // Query real database records for authenticated user ordered by created_at ascending
        const rows = await chatHistoryService.getChatHistory(user.id);
        if (isMounted) {
          if (rows && rows.length > 0) {
            const mapped: ChatMessage[] = rows.map((r, idx) => ({
              id: r.id || `msg_db_${idx}_${Date.now()}`,
              sender: r.role === 'user' ? 'user' : 'ai',
              text: r.message,
              timestamp: r.created_at
                ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
            setMessages(mapped);

            // Use latest session ID if available
            const latestSession = rows[rows.length - 1]?.session_id;
            if (latestSession) {
              setSessionId(latestSession);
            }
          } else {
            setMessages([]);
          }
        }
      } catch (err) {
        console.error('Failed to load chat history from Supabase:', err);
        if (isMounted) {
          setDbError('Previous conversations could not be loaded.');
        }
      }
    }

    loadHistoryFromSupabase();

    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isThinking) return;

    setDbError(null);
    const userText = text.trim();

    // STEP 1: Get the currently authenticated Supabase user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('Cannot save chat message: No authenticated Supabase user.');
      setDbError('Please sign in to save your conversation history.');
    }

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contextMaterialId: selectedMaterial?.id
    };

    const updated = [...messages, userMessage];
    setMessages(updated);
    storageService.saveChatMessage(userMessage);
    setInputText('');
    setIsThinking(true);

    // STEP 2 & 3: Maintain current session_id and insert User message to Supabase public.chat_history
    if (user?.id) {
      console.log('Authenticated user:', user.id);
      console.log('Current session:', sessionId);
      console.log('Saving user message...');

      const resUser = await chatHistoryService.saveMessage({
        userId: user.id,
        sessionId: sessionId,
        role: 'user',
        message: userText
      });

      if (!resUser.success) {
        setDbError('Conversation could not be saved.');
      }
    }

    try {
      // STEP 4: Call EXISTING SNS Workbench chat webhook
      const response = await chatService.sendMessage(
        userText,
        selectedMaterial?.title,
        selectedMaterial?.rawText
      );

      // STEP 5: Extract REAL AI response
      const aiMessage: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        sender: 'ai',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        videoUrl: response.videoUrl,
        youtubeId: response.youtubeId,
        videos: response.videos,
        suggestedFollowups: response.suggestedFollowups
      };

      // STEP 7: Display response in existing chat UI
      setMessages([...updated, aiMessage]);
      storageService.saveChatMessage(aiMessage);

      // STEP 6: Insert REAL AI response into Supabase public.chat_history
      if (user?.id) {
        console.log('Saving assistant response...');
        const resAi = await chatHistoryService.saveMessage({
          userId: user.id,
          sessionId: sessionId,
          role: 'assistant',
          message: response.text
        });

        if (!resAi.success) {
          setDbError('Conversation could not be saved.');
        }
      }

    } catch (err) {
      console.error('Error in chat workflow:', err);
    } finally {
      setIsThinking(false);
    }
  };

  const handleNewChat = () => {
    // Generate new UUID session_id for the new conversation session
    const newSessionId = crypto.randomUUID();
    console.log('Starting new chat session:', newSessionId);
    setSessionId(newSessionId);
    setMessages([]);
    storageService.clearChatHistory();
    setDbError(null);
  };

  return (
    <div className="surface-card border border-white/10 rounded-xl flex flex-col h-[650px] overflow-hidden">
      {/* Top Bar */}
      <div className="p-4 border-b border-white/10 bg-[#121118] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center text-[#C7FF4A]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F7F5FA] flex items-center gap-2">
              AI Tutor Assistant
            </h3>
            {selectedMaterial ? (
              <p className="text-xs text-[#C7FF4A] flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Context: {selectedMaterial.title}
              </p>
            ) : (
              <p className="text-xs text-[#A6A1B2]">
                Mathematics & Technical Workspace Tutor
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dbError && (
            <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {dbError}
            </span>
          )}

          <Button variant="ghost" size="sm" onClick={handleNewChat}>
            <PlusCircle className="w-4 h-4 text-[#C7FF4A]" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-full bg-[#181620] border border-white/10 flex items-center justify-center mb-4 text-[#C7FF4A]">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-[#F7F5FA] mb-1">
              No previous conversations yet
            </h4>
            <p className="text-xs text-[#A6A1B2] max-w-sm mb-6">
              Ask your first question to start learning with your AI tutor.
            </p>

            {/* Quick Starter Suggestions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {(selectedMaterial?.topics && selectedMaterial.topics.length > 0
                ? selectedMaterial.topics.slice(0, 3).map(t => `Explain key concepts of ${t.name}`)
                : [
                    'How do I solve linear differential equations?',
                    'Explain time complexity of quicksort',
                    'Give me a calculus integration tip'
                  ]
              ).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(suggestion)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-[#C7FF4A]/40 text-xs text-[#F7F5FA] transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                  msg.sender === 'user'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'bg-[#C7FF4A] text-[#0B0A0F]'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className="space-y-3 flex-1 min-w-0">
                {/* Main Text Content */}
                <div
                  className={`p-4 rounded-xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#F7F5FA]'
                      : 'bg-[#181620] border border-white/10 text-[#F7F5FA]'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* YouTube Embedded Player if returned by webhook */}
                  {msg.youtubeId && (
                    <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#C7FF4A]">
                        <Video className="w-4 h-4 text-red-500" />
                        <span>Recommended Educational Video</span>
                      </div>
                      <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/10 bg-black">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${msg.youtubeId}`}
                          title="YouTube Video Recommendation"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}

                  {/* External Video Link fallback */}
                  {msg.videoUrl && !msg.youtubeId && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <a
                        href={msg.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Watch Educational Video</span>
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}

                  {/* Video List Grid if returned by webhook */}
                  {msg.videos && msg.videos.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                      <p className="text-xs font-semibold text-[#C7FF4A] flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-red-500" />
                        <span>Recommended Learning Resources ({msg.videos.length})</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.videos.map(v => (
                          <a
                            key={v.id}
                            href={v.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-xs flex items-center gap-2.5 transition-all group"
                          >
                            <div className="w-8 h-8 rounded bg-red-600/80 flex items-center justify-center text-white flex-shrink-0">
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            </div>
                            <span className="truncate text-[#F7F5FA] group-hover:text-[#C7FF4A]">
                              {v.title}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-[#A6A1B2] block px-1">
                  {msg.timestamp}
                </span>

                {/* Suggested followups */}
                {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggestedFollowups.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(f)}
                        className="px-2.5 py-1 rounded bg-white/5 border border-white/10 hover:border-white/20 text-[11px] text-[#A6A1B2] hover:text-[#F7F5FA] transition-all"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isThinking && (
          <div className="flex items-center gap-3 text-xs text-[#A6A1B2] p-3 rounded-lg bg-[#181620] w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-[#C7FF4A]" />
            <span>AI Tutor is communicating with SNS Agent Workbench...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-white/10 bg-[#121118]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              selectedMaterial
                ? `Ask about ${selectedMaterial.title}...`
                : 'Ask a math, algorithm, or technical question...'
            }
            className="flex-1 bg-[#181620] border border-white/10 rounded-lg px-4 py-3 text-sm text-[#F7F5FA] placeholder-[#6E6A78] focus:outline-none focus:border-[#C7FF4A]/50 transition-all"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!inputText.trim() || isThinking}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
