import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, PlusCircle, Sparkles, Loader2, BookOpen, Play, Video, ExternalLink, AlertCircle, Eye, Plus, X, Image as ImageIcon } from 'lucide-react';
import { storageService } from '../../services/storage/storageService';
import { chatService } from '../../services/api/chatService';
import { learnivoBackend } from '../../services/api/learnivoBackend';
import { chatHistoryService } from '../../services/chatHistoryService';
import { supabase } from '../../services/supabase';
import { ChatMessage, LearningMaterial } from '../../types';
import { Button } from '../ui/Button';
import { MagicViewRenderer } from '../magic-view/MagicViewRenderer';
import { Skeleton } from '../ui/Skeleton';

interface AiTutorChatProps {
  selectedMaterial?: LearningMaterial | null;
}

export const AiTutorChat: React.FC<AiTutorChatProps> = ({ selectedMaterial }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeMode, setActiveMode] = useState<'explain' | 'magic_view'>('explain');
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [dbError, setDbError] = useState<string | null>(null);

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<{
    file: File;
    previewUrl: string;
    base64: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
            const mapped: ChatMessage[] = rows.map((r, idx) => {
              let magicViewData: any = undefined;
              if (r.message && r.message.startsWith('MAGIC_VIEW_DATA:')) {
                try {
                  magicViewData = JSON.parse(r.message.replace('MAGIC_VIEW_DATA:', ''));
                } catch (e) {
                  console.warn('Failed to parse saved Magic View data:', e);
                }
              }

              return {
                id: r.id || `msg_db_${idx}_${Date.now()}`,
                sender: r.role === 'user' ? 'user' : 'ai',
                text: magicViewData ? (magicViewData.summary || `✨ Magic View: ${magicViewData.title || 'Visual Explanation'}`) : r.message,
                timestamp: r.created_at
                  ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                magicViewData
              };
            });

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Please select a valid image file (JPG, JPEG, PNG, or WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const previewUrl = URL.createObjectURL(file);
      setSelectedImage({ file, previewUrl, base64 });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
    setSelectedImage(null);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    const currentImage = selectedImage;

    if ((!text.trim() && !currentImage) || isThinking) return;

    setDbError(null);
    const userText = text.trim() || (currentImage ? 'Please explain this image and solve the question inside it.' : '');

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
      imageUrl: currentImage?.previewUrl || currentImage?.base64,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contextMaterialId: selectedMaterial?.id
    };

    const updated = [...messages, userMessage];
    setMessages(updated);
    storageService.saveChatMessage(userMessage);
    setInputText('');
    setSelectedImage(null);
    setIsThinking(true);

    // Save user message to Supabase
    if (user?.id) {
      await chatHistoryService.saveMessage({
        userId: user.id,
        sessionId: sessionId,
        role: 'user',
        message: userText
      });
    }

    try {
      if (activeMode === 'magic_view') {
        // Handle case where text is a retry request
        let cleanQuery = userText;
        if (cleanQuery.startsWith('Retry Magic View for "') && cleanQuery.endsWith('"')) {
          cleanQuery = cleanQuery.slice('Retry Magic View for "'.length, -1);
        }

        // MAGIC VIEW MODE: Call Master Webhook via learnivoBackend
        const magicResult = await learnivoBackend.generateMagicView(
          cleanQuery,
          user?.id || 'guest',
          sessionId
        );

        if (!magicResult.success || !magicResult.data) {
          const errorMessage: ChatMessage = {
            id: 'msg_err_' + Date.now(),
            sender: 'ai',
            text: magicResult.errorMessage || "Magic View is temporarily unavailable. Please try again.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedFollowups: [`Retry Magic View for "${cleanQuery}"`]
          };
          setMessages([...updated, errorMessage]);
          return;
        }


        const aiMessage: ChatMessage = {
          id: 'msg_magic_' + Date.now(),
          sender: 'ai',
          text: magicResult.data.summary || `✨ Magic View visual explanation for: ${cleanQuery}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          magicViewData: magicResult.data
        };

        setMessages([...updated, aiMessage]);
        storageService.saveChatMessage(aiMessage);

        if (user?.id) {
          await chatHistoryService.saveMessage({
            userId: user.id,
            sessionId: sessionId,
            role: 'assistant',
            message: `MAGIC_VIEW_DATA:${JSON.stringify(magicResult.data)}`
          });
        }
      } else {
        // EXPLAIN (NORMAL TEXT CHAT) MODE
        const response = await chatService.sendMessage(
          userText,
          selectedMaterial?.title,
          selectedMaterial?.rawText
        );

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

        setMessages([...updated, aiMessage]);
        storageService.saveChatMessage(aiMessage);

        if (user?.id) {
          await chatHistoryService.saveMessage({
            userId: user.id,
            sessionId: sessionId,
            role: 'assistant',
            message: response.text
          });
        }
      }
    } catch (err: any) {
      console.error('Error generating AI Tutor response:', err);

      if (activeMode === 'magic_view') {
        const errorMessage: ChatMessage = {
          id: 'msg_err_' + Date.now(),
          sender: 'ai',
          text: "Magic View couldn't generate the visualization right now. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedFollowups: [`Retry Magic View for "${userText}"`]
        };
        setMessages([...updated, errorMessage]);
      }
    } finally {
      setIsThinking(false);
    }

  };

  const handleNewChat = () => {
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    setMessages([]);
    storageService.clearChatHistory();
    setDbError(null);
  };

  return (
    <div className="surface-card border border-white/10 rounded-xl flex flex-col h-[720px] overflow-hidden">
      {/* Top Bar */}
      <div className="p-4 border-b border-white/10 bg-[#121118] flex flex-wrap items-center justify-between gap-3">
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

        {/* Mode Selector & Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Explain vs ✨ Magic View Control */}
          <div className="flex items-center p-1 rounded-lg bg-[#181620] border border-white/10">
            <button
              type="button"
              onClick={() => setActiveMode('explain')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeMode === 'explain'
                  ? 'bg-white/10 text-[#F7F5FA] shadow-sm'
                  : 'text-[#A6A1B2] hover:text-[#F7F5FA]'
              }`}
            >
              Explain
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('magic_view')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeMode === 'magic_view'
                  ? 'bg-[#C7FF4A] text-[#0B0A0F] font-bold shadow-[0_0_12px_rgba(199,255,74,0.35)]'
                  : 'text-[#C7FF4A] hover:bg-[#C7FF4A]/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>✨ Magic View</span>
            </button>
          </div>

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
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            {activeMode === 'magic_view' ? (
              <div className="max-w-md space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center mx-auto text-[#C7FF4A] shadow-[0_0_20px_rgba(199,255,74,0.2)]">
                  <Sparkles className="w-7 h-7 animate-pulse" />
                </div>
                <h4 className="text-lg font-bold text-[#F7F5FA]">
                  ✨ Magic View Mode Active
                </h4>
                <p className="text-xs text-[#A6A1B2] leading-relaxed">
                  Ask a concept and Magic View will turn it into a visual explanation.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-2 justify-center">
                  {[
                    'Explain photosynthesis',
                    'How does binary search work?',
                    'Explain the water cycle',
                    'How does a JOIN work in SQL?'
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="px-3 py-2 rounded-xl bg-[#181620] border border-white/10 hover:border-[#C7FF4A]/50 text-xs text-[#F7F5FA] hover:text-[#C7FF4A] text-left transition-all flex items-center justify-between gap-2 group"
                    >
                      <span>"{prompt}"</span>
                      <Sparkles className="w-3 h-3 text-[#C7FF4A] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-md space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#181620] border border-white/10 flex items-center justify-center mx-auto text-[#C7FF4A]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-base font-semibold text-[#F7F5FA]">
                  No previous conversations yet
                </h4>
                <p className="text-xs text-[#A6A1B2]">
                  Ask your first question to start learning with your AI tutor.
                </p>

                <div className="flex flex-wrap gap-2 justify-center">
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
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse max-w-2xl' : 'w-full'
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
                {/* Magic View Renderer if present */}
                {msg.magicViewData ? (
                  <MagicViewRenderer data={msg.magicViewData} />
                ) : (
                  <div
                    className={`p-4 rounded-xl text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#F7F5FA]'
                        : 'bg-[#181620] border border-white/10 text-[#F7F5FA]'
                    }`}
                  >
                    {msg.imageUrl && (
                      <div className="mb-3 rounded-lg overflow-hidden border border-white/20 max-w-xs bg-black/40">
                        <img src={msg.imageUrl} alt="Uploaded problem/doubt" className="w-full h-auto max-h-56 object-contain rounded-lg" />
                      </div>
                    )}
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* YouTube Embedded Player */}
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
                )}

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

        {/* Loading / Thinking indicator */}
        {isThinking && (
          <div className="surface-card p-4 rounded-xl border border-[#C7FF4A]/30 bg-[#121118] space-y-3 max-w-xl">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-[#C7FF4A]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {activeMode === 'magic_view'
                  ? 'Creating your visual explanation...'
                  : 'AI Tutor is communicating with SNS Agent Workbench...'}
              </span>
            </div>
            {activeMode === 'magic_view' && (
              <div className="space-y-2 pt-1">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-white/10 bg-[#121118] space-y-3">
        {/* Selected Image Thumbnail Preview Bar */}
        {selectedImage && (
          <div className="flex items-center gap-2">
            <div className="relative bg-[#181620] p-1.5 rounded-xl border border-white/10 flex items-center gap-2.5 pr-3 shadow-lg">
              <img
                src={selectedImage.previewUrl}
                alt="Doubt image preview"
                className="w-12 h-12 object-cover rounded-lg border border-white/10"
              />
              <div className="text-xs space-y-0.5 max-w-[150px] truncate">
                <p className="font-semibold text-[#F7F5FA] text-[11px] truncate">{selectedImage.file.name}</p>
                <p className="text-[10px] text-[#A6A1B2]">{(selectedImage.file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-600 text-white flex items-center justify-center text-xs ml-1 transition-all"
                title="Remove image"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2.5"
        >
          {/* '+' Image Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-lg bg-[#181620] border border-white/10 text-[#A6A1B2] hover:text-[#C7FF4A] hover:border-[#C7FF4A]/40 transition-all flex items-center justify-center flex-shrink-0"
            title="Upload image"
          >
            <Plus className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleImageSelect}
            className="hidden"
          />

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              activeMode === 'magic_view'
                ? 'Ask a concept for Magic View visual explanation...'
                : selectedMaterial
                ? `Ask about ${selectedMaterial.title}...`
                : selectedImage
                ? 'Ask a question about this image (optional)...'
                : 'Ask a math, algorithm, or technical question...'
            }
            className="flex-1 bg-[#181620] border border-white/10 rounded-lg px-4 py-3 text-sm text-[#F7F5FA] placeholder-[#6E6A78] focus:outline-none focus:border-[#C7FF4A]/50 transition-all"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={(!inputText.trim() && !selectedImage) || isThinking}
          >
            {activeMode === 'magic_view' ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};
