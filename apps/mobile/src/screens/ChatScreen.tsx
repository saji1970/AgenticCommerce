import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, FAB } from 'react-native-paper';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { DemoModeIndicator } from './DemoModeIndicator';
import { ChatMessage as ChatMessageType } from '../types';
import { api } from '../services/api';
import { v4 as uuidv4 } from 'uuid';

export const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: 'Hello! I\'m your shopping agent. I can help you find products, compare prices, check availability, and set up price alerts. What would you like to search for?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    const userMessage: ChatMessageType = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await api.sendMessage(text, conversationId);
      
      if (!conversationId && response.metadata?.conversationId) {
        setConversationId(response.metadata.conversationId);
      }

      const assistantMessage: ChatMessageType = {
        id: response.id || uuidv4(),
        role: 'assistant',
        content: response.content || response.message || 'I received your message.',
        timestamp: response.timestamp || new Date().toISOString(),
        metadata: response.metadata || response.data,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessageType = {
        id: uuidv4(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DemoModeIndicator />
      <Appbar.Header>
        <Appbar.Content title="Shopping Agent" subtitle="AI-Powered Commerce" />
        <Appbar.Action icon="cart" onPress={() => {/* Navigate to cart */}} />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <ChatMessage message={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#6200EE" />
              </View>
            ) : null
          }
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 8,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
});

