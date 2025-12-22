import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AgentState {
  currentSessionId: string | null;
  messages: Message[];
  isTyping: boolean;
  suggestions: string[];
}

const initialState: AgentState = {
  currentSessionId: null,
  messages: [],
  isTyping: false,
  suggestions: [],
};

const agentSlice = createSlice({
  name: 'agent',
  initialState,
  reducers: {
    setSessionId: (state, action: PayloadAction<string>) => {
      state.currentSessionId = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    setSuggestions: (state, action: PayloadAction<string[]>) => {
      state.suggestions = action.payload;
    },
    clearSession: (state) => {
      state.currentSessionId = null;
      state.messages = [];
      state.suggestions = [];
    },
  },
});

export const { setSessionId, addMessage, setMessages, setTyping, setSuggestions, clearSession } =
  agentSlice.actions;
export default agentSlice.reducer;
