import React, { useState } from 'react';
import { ChatMessage } from '../types/chess';
import { i18n } from '../i18n';
import { Send, MessageSquareQuote } from 'lucide-react';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, isPreset?: boolean) => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  onSendMessage
}) => {
  const [inputText, setInputText] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), false);
    setInputText('');
  };

  const handlePreset = (preset: string) => {
    onSendMessage(preset, true);
    setShowPresets(false);
  };

  return (
    <div className="flex flex-col h-full bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="px-4 py-2.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
        <span className="text-xs font-bold text-amber-400 font-serif-sc">
          对局互动
        </span>
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="text-xs text-stone-400 hover:text-amber-300 flex items-center gap-1 font-serif-sc cursor-pointer"
        >
          <MessageSquareQuote className="w-3.5 h-3.5" />
          {i18n.zh.quickChat}
        </button>
      </div>

      {showPresets && (
        <div className="p-2 bg-stone-950/90 border-b border-stone-800 grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto">
          {i18n.zh.presetMessages.map((msg, idx) => (
            <button
              key={idx}
              onClick={() => handlePreset(msg)}
              className="text-left text-xs py-1.5 px-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-200/90 hover:text-amber-300 font-serif-sc transition-colors cursor-pointer"
            >
              {msg}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 p-3 overflow-y-auto space-y-2 min-h-[120px] max-h-[160px] md:max-h-[220px]">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-stone-600 font-serif-sc py-4">
            暂无消息，发送快捷用语互动吧
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`text-xs p-2 rounded-xl font-serif-sc ${
                m.isPreset
                  ? 'bg-amber-950/40 border border-amber-600/30 text-amber-200'
                  : 'bg-stone-800/80 text-stone-200'
              }`}
            >
              <span className="text-stone-400 font-bold mr-1.5">
                {m.senderName}:
              </span>
              <span>{m.text}</span>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="p-2 bg-stone-950 border-t border-stone-800 flex gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={i18n.zh.chatPlaceholder}
          className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-serif-sc"
          maxLength={40}
        />
        <button
          type="submit"
          className="p-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold transition-transform active:scale-95 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
