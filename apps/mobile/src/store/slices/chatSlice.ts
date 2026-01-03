import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '../../types';

interface ChatState {
  messages: ChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
}

const initialState: ChatState = {
  messages: [],
  conversationId: null,
  isLoading: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    setMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      state.messages = action.payload;
    },
    setConversationId: (state, action: PayloadAction<string | null>) => {
      state.conversationId = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
      state.conversationId = null;
    },
  },
});

export const { addMessage, setMessages, setConversationId, setLoading, clearChat } = chatSlice.actions;
export default chatSlice.reducer;

