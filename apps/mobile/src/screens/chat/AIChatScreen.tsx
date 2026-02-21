import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ChatMessage } from '../../types/chat';
import { ChatBubble } from '../../components/chat/ChatBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { useProduct } from '../../hooks/useProduct';

const EXAMPLE_QUERIES = [
  'Flights from New York to Delhi in March',
  'Hotels in Paris under $200/night',
  'Ergonomic office chair under $500',
  'Car rental in Los Angeles for a week',
];

let messageCounter = 0;
const generateId = () => `msg_${Date.now()}_${++messageCounter}`;

export const AIChatScreen = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { performNLPSearch } = useProduct();

  const addMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...newMessages]);
  }, []);

  const removeTypingIndicator = useCallback(() => {
    setMessages((prev) => prev.filter((m) => m.type !== 'ai_typing'));
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (isSearching) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        type: 'user',
        text,
        timestamp: new Date(),
      };

      const typingMessage: ChatMessage = {
        id: generateId(),
        type: 'ai_typing',
        timestamp: new Date(),
      };

      addMessages([userMessage, typingMessage]);
      setIsSearching(true);

      try {
        const result = await performNLPSearch(text);
        removeTypingIndicator();

        const { searchResponse, parsedQuery } = result;
        const products = searchResponse.products || [];
        const totalResults = searchResponse.metadata?.totalResults || products.length;

        // Build summary text
        let summaryText = '';
        if (parsedQuery?.type && parsedQuery.type !== 'product') {
          const origin = parsedQuery.origin || '';
          const destination = parsedQuery.destination || '';
          if (origin && destination) {
            summaryText = `Found ${totalResults} ${parsedQuery.type} option${totalResults !== 1 ? 's' : ''} from ${origin} to ${destination}`;
          } else {
            summaryText = `Found ${totalResults} ${parsedQuery.type} result${totalResults !== 1 ? 's' : ''}`;
          }
          if (parsedQuery.departureDate) {
            summaryText += ` for ${parsedQuery.departureDate}`;
            if (parsedQuery.returnDate) {
              summaryText += ` – ${parsedQuery.returnDate}`;
            }
          }
        } else {
          summaryText = `Found ${totalResults} product${totalResults !== 1 ? 's' : ''} for "${text}"`;
        }

        const responseMsgs: ChatMessage[] = [];

        // AI text summary
        responseMsgs.push({
          id: generateId(),
          type: 'ai_text',
          text: summaryText,
          parsedQuery: parsedQuery
            ? {
                type: parsedQuery.type,
                origin: parsedQuery.origin,
                destination: parsedQuery.destination,
                departureDate: parsedQuery.departureDate,
                returnDate: parsedQuery.returnDate,
                passengers: parsedQuery.passengers,
                category: parsedQuery.category,
                query: parsedQuery.query,
              }
            : undefined,
          timestamp: new Date(),
        });

        // Top 3 product cards
        if (products.length > 0) {
          responseMsgs.push({
            id: generateId(),
            type: 'ai_products',
            products: products.slice(0, 3),
            timestamp: new Date(),
          });
        }

        // See all button if >3 results
        if (products.length > 3) {
          responseMsgs.push({
            id: generateId(),
            type: 'ai_see_all',
            allProducts: products,
            searchQueryId: searchResponse.searchQueryId || undefined,
            timestamp: new Date(),
          });
        }

        // Mandate offer if intent was detected with high confidence
        if (result.intentCreated && result.parsedQuery?.confidence >= 70) {
          responseMsgs.push({
            id: generateId(),
            type: 'ai_mandate',
            intentCreated: {
              type: result.intentCreated.type,
              reasoning: result.intentCreated.reasoning,
            },
            mandateCreated: result.mandateCreated
              ? {
                  status: result.mandateCreated.status,
                  constraints: {
                    maxIntentValue: result.mandateCreated.constraints?.maxIntentValue,
                    autoApproveUnder: result.mandateCreated.constraints?.autoApproveUnder,
                    maxIntentsPerDay: result.mandateCreated.constraints?.maxIntentsPerDay,
                  },
                }
              : undefined,
            originalQuery: text,
            timestamp: new Date(),
          });
        }

        addMessages(responseMsgs);
      } catch (err: any) {
        removeTypingIndicator();
        const errorText =
          err.response?.data?.error?.message || err.message || 'Something went wrong. Please try again.';
        addMessages([
          {
            id: generateId(),
            type: 'ai_error',
            text: errorText,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsSearching(false);
      }
    },
    [isSearching, performNLPSearch, addMessages, removeTypingIndicator],
  );

  const handleExamplePress = (query: string) => {
    handleSend(query);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <ChatBubble message={item} />
  );

  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      <Text style={styles.welcomeIcon}>🤖</Text>
      <Text style={styles.welcomeTitle}>AI Shopping Assistant</Text>
      <Text style={styles.welcomeSubtitle}>
        Search for flights, hotels, car rentals, or any product using natural language
      </Text>
      <View style={styles.examplesContainer}>
        <Text style={styles.examplesLabel}>Try asking:</Text>
        {EXAMPLE_QUERIES.map((query) => (
          <TouchableOpacity
            key={query}
            style={styles.exampleChip}
            onPress={() => handleExamplePress(query)}
            activeOpacity={0.7}
          >
            <Text style={styles.exampleText}>{query}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      {messages.length === 0 ? (
        renderWelcome()
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />
      )}
      <ChatInput onSend={handleSend} disabled={isSearching} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesList: {
    paddingVertical: 12,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  examplesContainer: {
    width: '100%',
  },
  examplesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  exampleChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 15,
    color: '#2563EB',
  },
});
