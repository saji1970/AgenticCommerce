import React from 'react';
import { ChatMessage } from '../../types/chat';
import { UserMessageBubble } from './UserMessageBubble';
import { AITextBubble } from './AITextBubble';
import { AIProductsBubble } from './AIProductsBubble';
import { AISeeAllBubble } from './AISeeAllBubble';
import { AIMandateBubble } from './AIMandateBubble';
import { TypingIndicator } from './TypingIndicator';

interface Props {
  message: ChatMessage;
}

export const ChatBubble: React.FC<Props> = ({ message }) => {
  switch (message.type) {
    case 'user':
      return <UserMessageBubble message={message} />;
    case 'ai_text':
      return <AITextBubble message={message} />;
    case 'ai_products':
      return <AIProductsBubble message={message} />;
    case 'ai_see_all':
      return <AISeeAllBubble message={message} />;
    case 'ai_error':
      return <AITextBubble message={{ ...message, text: message.text || 'Something went wrong. Please try again.' }} />;
    case 'ai_mandate':
      return <AIMandateBubble message={message} />;
    case 'ai_typing':
      return <TypingIndicator />;
    default:
      return null;
  }
};
