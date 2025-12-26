import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AgentState {
  messages: Message[];
  isTyping: boolean;
  currentSessionId: string | null;
}

const initialState: AgentState = {
  messages: [],
  isTyping: false,
  currentSessionId: null,
};

const agentSlice = createSlice({
  name: 'agent',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    setSessionId: (state, action: PayloadAction<string>) => {
      state.currentSessionId = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
});

export const { addMessage, setTyping, setSessionId, clearMessages } = agentSlice.actions;
export default agentSlice.reducer;

