import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
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
  const [copyToast, setCopyToast] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { performNLPSearch } = useProduct();
  const navigation = useNavigation();

  // Set up header right button for clearing chat
  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        messages.length > 0 ? (
          <TouchableOpacity onPress={handleClearChat} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Clear</Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [messages.length, navigation]);

  const handleClearChat = useCallback(() => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setMessages([]),
        },
      ]
    );
  }, []);

  const handleCopyMessage = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 1500);
    } catch (err) {
      console.warn('[AIChatScreen] Failed to copy:', err);
    }
  }, []);

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

        // Build conversational summary text
        const productType = (parsedQuery as any)?.productType || parsedQuery?.type || 'product';
        let summaryText = '';
        if (productType === 'flight' && parsedQuery?.origin && parsedQuery?.destination) {
          const depDate = (parsedQuery as any).departureDate ?? (parsedQuery as any).startDate;
          const retDate = (parsedQuery as any).returnDate ?? (parsedQuery as any).endDate;
          const dateSuffix = depDate ? ` for ${depDate}${retDate ? ` – ${retDate}` : ''}` : '';
          summaryText =
            totalResults === 1
              ? `I found a great option for ${parsedQuery.origin} → ${parsedQuery.destination}${dateSuffix}! Does this timing work for you?`
              : `I found ${totalResults} flight options from ${parsedQuery.origin} to ${parsedQuery.destination}${dateSuffix}. Here are the best matches:`;
        } else if (productType === 'hotel') {
          const dest = parsedQuery?.destination || '';
          summaryText =
            totalResults === 1
              ? `I found a great hotel${dest ? ` in ${dest}` : ''} for your stay:`
              : `I found ${totalResults} hotels${dest ? ` in ${dest}` : ''}. Here are the best options:`;
        } else if (productType !== 'product') {
          summaryText = `I found ${totalResults} ${productType} option${totalResults !== 1 ? 's' : ''}. Here are the best matches:`;
        } else {
          summaryText =
            totalResults === 1
              ? `I found a great match for "${text}". Take a look!`
              : `I found ${totalResults} products for "${text}". Here are my top picks:`;
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

        // Top 3 product cards (with parsedQuery for dynamic card layout)
        if (products.length > 0) {
          responseMsgs.push({
            id: generateId(),
            type: 'ai_products',
            products: products.slice(0, 3),
            parsedQuery: parsedQuery
              ? {
                  type: (parsedQuery as any).type,
                  productType: (parsedQuery as any).productType,
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
    <ChatBubble message={item} onCopy={handleCopyMessage} />
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

      {/* Copy toast */}
      {copyToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <Text style={styles.toastText}>Copied to clipboard</Text>
          </View>
        </View>
      )}
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
  headerButton: {
    marginRight: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
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
  toastContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
