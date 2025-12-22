import React, { useState } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Card } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { addMessage, setTyping } from '../../store/slices/agentSlice';
import { agentService } from '../../services/agentService';

const AgentScreen: React.FC = () => {
  const [input, setInput] = useState('');
  const dispatch = useDispatch();
  const { messages, isTyping, currentSessionId } = useSelector((state: RootState) => state.agent);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      timestamp: Date.now(),
    };

    dispatch(addMessage(userMessage));
    setInput('');
    dispatch(setTyping(true));

    try {
      const response = await agentService.sendMessage({
        message: input,
        sessionId: currentSessionId || undefined,
      });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: response.response,
        timestamp: Date.now(),
      };

      dispatch(addMessage(assistantMessage));
    } catch (error) {
      console.error('Agent error:', error);
    } finally {
      dispatch(setTyping(false));
    }
  };

  const renderMessage = ({ item }: { item: typeof messages[0] }) => (
    <Card style={[styles.messageCard, item.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
      <Card.Content>
        <Text>{item.content}</Text>
      </Card.Content>
    </Card>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
      />
      {isTyping && <Text style={styles.typing}>Agent is typing...</Text>}
      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask me to find something..."
          mode="outlined"
          style={styles.input}
          multiline
        />
        <Button mode="contained" onPress={handleSend} disabled={!input.trim()}>
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    padding: 16,
  },
  messageCard: {
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#E3F2FD',
    maxWidth: '80%',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  typing: {
    paddingHorizontal: 16,
    fontStyle: 'italic',
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
  },
});

export default AgentScreen;
