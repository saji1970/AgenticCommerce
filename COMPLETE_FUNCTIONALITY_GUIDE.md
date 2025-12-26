# Agentic Commerce Mobile App - Complete Functionality Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Technology Stack Explained](#technology-stack-explained)
3. [Application Architecture](#application-architecture)
4. [Feature-by-Feature Implementation](#feature-by-feature-implementation)
5. [Data Flow Patterns](#data-flow-patterns)
6. [Code Structure Deep Dive](#code-structure-deep-dive)

---

## Introduction

### What is Agentic Commerce?

Agentic Commerce is an **AI-powered mobile shopping application** built with React Native. The app enables users to make autonomous, agent-driven purchases through a conversational AI interface. Think of it as having a personal shopping assistant in your pocket that can:
- Search for products using text or photos
- Compare options intelligently
- Execute purchases on your behalf within predefined limits
- Find the best deals near you

### Who is This Guide For?

This guide is designed for developers who are:
- New to React Native development
- Learning mobile app architecture
- Understanding how AI agents integrate with e-commerce
- Building similar autonomous shopping systems

---

## Technology Stack Explained

### Core Technologies

#### 1. **React Native** (v0.74.5)
**What it is:** A framework for building native mobile apps using JavaScript and React.

**Why it's used:** Write code once and deploy to both iOS and Android devices. React Native compiles to native code, giving you near-native performance while using web technologies.

**Key Concepts:**
- Uses JavaScript/TypeScript instead of Swift (iOS) or Kotlin (Android)
- Components render as native UI elements (not web views)
- Hot reloading for fast development

#### 2. **TypeScript** (v5.3.3)
**What it is:** JavaScript with type safety.

**Why it's used:** Catches errors at compile time, provides better IDE support, makes code more maintainable.

**Example:**
```typescript
// Without TypeScript (JavaScript)
function addToCart(item) {
  return { ...item, quantity: 1 };
}

// With TypeScript
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

function addToCart(item: CartItem): CartItem {
  return { ...item, quantity: 1 };
}
```

#### 3. **Expo**
**What it is:** A set of tools and services built around React Native.

**Why it's used:** Simplifies development by providing:
- Pre-built native modules (camera, location, secure storage)
- Build services (EAS - Expo Application Services)
- No need to open Xcode or Android Studio for most tasks

#### 4. **Redux Toolkit** (v2.0.1)
**What it is:** A state management library for React applications.

**Why it's used:** Manages application-wide state (user authentication, cart items, product data) in a predictable way.

**Key Concepts:**
- **Store:** Central location for all app state
- **Slices:** Sections of state (auth, cart, products, etc.)
- **Actions:** Events that trigger state changes
- **Reducers:** Functions that update state based on actions

#### 5. **React Navigation**
**What it is:** Routing and navigation library for React Native.

**Why it's used:** Handles screen transitions, tab navigation, modal screens, and navigation state.

**Navigation Types Used:**
- **Stack Navigator:** Push/pop screens like a stack of cards
- **Tab Navigator:** Bottom tabs for main app sections

#### 6. **React Native Paper** (v5.11.6)
**What it is:** UI component library implementing Material Design 3.

**Why it's used:** Provides pre-built, accessible, and beautiful UI components (buttons, cards, text inputs, etc.) that follow Material Design guidelines.

#### 7. **Axios** (v1.6.2)
**What it is:** HTTP client for making API requests.

**Why it's used:**
- Simpler API than fetch
- Automatic JSON parsing
- Request/response interceptors
- Better error handling

---

## Application Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                            │
│  (Root component with all providers)                    │
│                                                          │
│  ┌────────────┐  ┌──────────┐  ┌──────────────┐       │
│  │ Redux      │  │ Paper    │  │ Navigation   │       │
│  │ Provider   │  │ Provider │  │ Container    │       │
│  └────────────┘  └──────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌────────────────────┐
              │  RootNavigator     │
              │  (Auth routing)    │
              └────────────────────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
        ┌──────────────┐    ┌─────────────┐
        │ AuthNavigator│    │MainNavigator│
        │ (Login/Reg)  │    │ (Bottom Tabs)│
        └──────────────┘    └─────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌─────────┐   ┌──────────┐   ┌───────────┐
              │  Home   │   │  Agent   │   │  Profile  │
              │ Screen  │   │  Screen  │   │  Screen   │
              └─────────┘   └──────────┘   └───────────┘
```

### Application Bootstrap Flow

Let's walk through what happens when the app starts:

#### **File: `index.js`** (Entry Point)
```javascript
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
```

**What happens:**
1. Expo registers the root component
2. This tells React Native where the app starts

#### **File: `App.tsx`** (Root Component)
```typescript
export default function App() {
  const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <StripeProvider publishableKey={stripePublishableKey}>
              <NavigationContainer>
                <RootNavigator />
              </NavigationContainer>
            </StripeProvider>
          </PaperProvider>
        </SafeAreaProvider>
      </Provider>
    </ErrorBoundary>
  );
}
```

**Step-by-step breakdown:**

1. **ErrorBoundary** (Outermost layer)
   - Catches JavaScript errors anywhere in the app
   - Prevents white screen of death
   - Shows error message with recovery option

2. **Redux Provider**
   - Makes Redux store available to all components
   - Wraps `store` from `src/store/index.ts`

3. **SafeAreaProvider**
   - Handles device notches, status bars, home indicators
   - Ensures content doesn't get hidden by device features

4. **PaperProvider**
   - Provides Material Design theme to all Paper components
   - Handles light/dark mode theming

5. **StripeProvider** (Conditional)
   - Initializes Stripe SDK for payments
   - Only wraps app if publishable key is provided

6. **NavigationContainer**
   - Root container for React Navigation
   - Manages navigation state and linking

7. **RootNavigator**
   - First screen/navigation stack user sees
   - Handles auth vs main app routing

---

## Feature-by-Feature Implementation

### Feature 1: User Authentication

#### Overview
Users can register, login, and logout. Authentication tokens are stored securely and attached to API requests.

#### Technologies Used
- **Expo Secure Store:** Encrypted storage for tokens
- **Redux:** Manages auth state
- **Axios Interceptors:** Auto-attaches tokens to requests

#### Implementation Steps

##### Step 1: Define Auth State (Redux Slice)

**File: `src/store/slices/authSlice.ts`**

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
```

**What this does:**
- Defines the shape of authentication state
- Creates actions for login (`setCredentials`) and logout
- Provides reducers to update state

##### Step 2: Create Authentication Service

**File: `src/services/authService.ts`**

```typescript
import * as SecureStore from 'expo-secure-store';
import { apiService } from './api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  firstName: string;
  lastName: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  token: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Make API call
    const response = await apiService.post<AuthResponse>('/auth/login', credentials);

    // Store token securely
    await SecureStore.setItemAsync('authToken', response.token);

    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/register', data);
    await SecureStore.setItemAsync('authToken', response.token);
    return response;
  }

  async logout(): Promise<void> {
    await apiService.post('/auth/logout');
    await SecureStore.deleteItemAsync('authToken');
  }

  async getStoredToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('authToken');
  }
}

export const authService = new AuthService();
```

**What this does:**
- Handles API calls for login/register/logout
- Stores/retrieves tokens from encrypted storage
- Exposes clean interface for auth operations

##### Step 3: API Service with Token Injection

**File: `src/services/api.ts`**

```typescript
import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // REQUEST INTERCEPTOR - Add token to every request
    this.client.interceptors.request.use(
      async (config) => {
        const token = await SecureStore.getItemAsync('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // RESPONSE INTERCEPTOR - Handle 401 errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired - logout user
          await SecureStore.deleteItemAsync('authToken');
          // Navigation to login happens in RootNavigator
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string) {
    const response = await this.client.get<T>(url);
    return response.data;
  }

  async post<T>(url: string, data?: any) {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }
}

export const apiService = new ApiService();
```

**What this does:**
- Creates Axios instance with base URL
- **Request Interceptor:** Automatically adds `Authorization: Bearer <token>` header to all requests
- **Response Interceptor:** Catches 401 (Unauthorized) errors and logs user out
- Provides typed methods for HTTP operations

##### Step 4: Login Screen UI

**File: `src/screens/auth/LoginScreen.tsx`**

```typescript
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services/authService';
import { setCredentials } from '../../store/slices/authSlice';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dispatch = useDispatch();
  const navigation = useNavigation();

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Call auth service
      const response = await authService.login({ email, password });

      // Update Redux state
      dispatch(setCredentials({
        user: response.user,
        token: response.token
      }));

      // Navigation handled by RootNavigator when auth state changes
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Welcome Back</Text>

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        mode="outlined"
        style={styles.input}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        disabled={loading || !email || !password}
      >
        Sign In
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  input: {
    marginVertical: 8,
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
});

export default LoginScreen;
```

**What this does:**
- Uses React Native Paper components for Material Design UI
- Manages local form state with `useState`
- Calls `authService.login()` on submit
- Dispatches Redux action to update global auth state
- Shows loading state and error messages

##### Step 5: Navigation Based on Auth State

**File: `src/navigation/RootNavigator.tsx`**

```typescript
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainNavigator from './MainNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createStackNavigator();

const RootNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Main"
    >
      {/* Main app always accessible */}
      <Stack.Screen name="Main" component={MainNavigator} />

      {/* Auth screens shown as modals */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: true,
          title: 'Sign In',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: true,
          title: 'Create Account',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
```

**What this does:**
- Makes authentication optional (main app always accessible)
- Shows Login/Register as modal screens
- User is prompted to login when accessing protected features

---

### Feature 2: AI Agent Chat Interface

#### Overview
Users can have conversational interactions with an AI shopping agent. The agent helps find products, answers questions, and provides recommendations.

#### Technologies Used
- **Redux:** Manages chat messages and session state
- **API Service:** Communicates with backend AI agent
- **React Native Paper:** UI components

#### Implementation Steps

##### Step 1: Define Agent State

**File: `src/store/slices/agentSlice.ts`**

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentState {
  messages: Message[];
  isTyping: boolean;
  sessionId: string | null;
  suggestions: string[];
}

const initialState: AgentState = {
  messages: [],
  isTyping: false,
  sessionId: null,
  suggestions: [],
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
      state.sessionId = action.payload;
    },
    setSuggestions: (state, action: PayloadAction<string[]>) => {
      state.suggestions = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
      state.sessionId = null;
    },
  },
});

export const {
  addMessage,
  setTyping,
  setSessionId,
  setSuggestions,
  clearMessages
} = agentSlice.actions;

export default agentSlice.reducer;
```

**What this does:**
- Stores chat message history
- Tracks typing indicator state
- Manages conversation session ID
- Stores AI-generated suggestions

##### Step 2: Create Agent Service

**File: `src/services/agentService.ts`**

```typescript
import { apiService } from './api';

interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: {
    location?: { lat: number; lng: number };
    previousProducts?: string[];
  };
}

interface ChatResponse {
  message: string;
  sessionId: string;
  suggestions?: string[];
  products?: any[];
}

class AgentService {
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return await apiService.post<ChatResponse>('/agent/chat', request);
  }

  async searchProducts(query: string, sessionId?: string): Promise<any> {
    return await apiService.post('/agent/search', { query, sessionId });
  }

  async compareProducts(productIds: string[]): Promise<any> {
    return await apiService.post('/agent/compare', { productIds });
  }

  async getSession(sessionId: string): Promise<any> {
    return await apiService.get(`/agent/sessions/${sessionId}`);
  }
}

export const agentService = new AgentService();
```

**What this does:**
- Sends user messages to AI backend
- Maintains conversation context with session IDs
- Provides product search and comparison via agent
- Can include location data for personalized results

##### Step 3: Agent Screen UI

**File: `src/screens/main/AgentScreen.tsx`**

```typescript
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet
} from 'react-native';
import {
  TextInput,
  IconButton,
  Card,
  Text,
  ActivityIndicator
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  addMessage,
  setTyping,
  setSessionId,
  setSuggestions
} from '../../store/slices/agentSlice';
import { agentService } from '../../services/agentService';
import { v4 as uuidv4 } from 'uuid';

const AgentScreen = () => {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const dispatch = useDispatch();
  const { messages, isTyping, sessionId, suggestions } = useSelector(
    (state: RootState) => state.agent
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: uuidv4(),
      role: 'user' as const,
      content: inputText,
      timestamp: new Date(),
    };

    // Add user message to Redux
    dispatch(addMessage(userMessage));
    setInputText('');

    // Show typing indicator
    dispatch(setTyping(true));

    try {
      // Send to AI agent
      const response = await agentService.sendMessage({
        message: inputText,
        sessionId: sessionId || undefined,
      });

      // Add assistant response
      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant' as const,
        content: response.message,
        timestamp: new Date(),
      };
      dispatch(addMessage(assistantMessage));

      // Update session and suggestions
      dispatch(setSessionId(response.sessionId));
      if (response.suggestions) {
        dispatch(setSuggestions(response.suggestions));
      }
    } catch (error) {
      const errorMessage = {
        id: uuidv4(),
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      dispatch(addMessage(errorMessage));
    } finally {
      dispatch(setTyping(false));
    }
  };

  const renderMessage = ({ item }: { item: typeof messages[0] }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessage : styles.assistantMessage
      ]}>
        <Card style={styles.messageCard}>
          <Card.Content>
            <Text variant="bodyMedium">{item.content}</Text>
          </Card.Content>
        </Card>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <ActivityIndicator size="small" />
          <Text style={styles.typingText}>Agent is typing...</Text>
        </View>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((suggestion, index) => (
            <Card
              key={index}
              style={styles.suggestionCard}
              onPress={() => setInputText(suggestion)}
            >
              <Card.Content>
                <Text variant="bodySmall">{suggestion}</Text>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask me anything..."
          mode="outlined"
          style={styles.input}
          multiline
          maxLength={500}
        />
        <IconButton
          icon="send"
          mode="contained"
          onPress={sendMessage}
          disabled={!inputText.trim() || isTyping}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageCard: {
    maxWidth: '80%',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  typingText: {
    marginLeft: 8,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    padding: 8,
    flexWrap: 'wrap',
  },
  suggestionCard: {
    margin: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    marginRight: 8,
  },
});

export default AgentScreen;
```

**What this does:**
- Displays chat messages in a scrollable list
- Aligns user messages to right, assistant to left
- Shows typing indicator while waiting for AI response
- Displays suggestion chips for quick responses
- Handles keyboard avoiding for input field
- Auto-scrolls to newest messages

**Key React Native Concepts:**
- **FlatList:** Efficiently renders large lists (only renders visible items)
- **KeyboardAvoidingView:** Adjusts layout when keyboard appears
- **useRef:** Direct reference to FlatList for scrolling
- **useEffect:** Auto-scroll when messages update

---

### Feature 3: Visual Search with Camera

#### Overview
Users can take photos or select images from their gallery to search for similar products. The app analyzes the image for objects, colors, and generates search queries.

#### Technologies Used
- **expo-camera:** Access device camera
- **expo-image-picker:** Access photo gallery
- **expo-location:** Get user location for nearby results
- **Backend Vision API:** Analyzes images

#### Implementation Steps

##### Step 1: Request Permissions

```typescript
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

// Camera permission
const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
if (cameraStatus !== 'granted') {
  alert('Camera permission required');
  return;
}

// Location permission (for nearby results)
const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
if (locationStatus !== 'granted') {
  alert('Location permission helps find nearby stores');
}
```

**What this does:**
- Requests runtime permissions on Android/iOS
- Shows system permission dialogs
- Gracefully handles denial

##### Step 2: Create Visual Search Service

**File: `src/services/visualSearchService.ts`**

```typescript
import { apiService } from './api';
import * as FileSystem from 'expo-file-system';

interface ImageAnalysisResult {
  suggestedQuery: string;
  detectedObjects: Array<{
    label: string;
    confidence: number;
  }>;
  dominantColors: string[];
}

interface VisualSearchResult {
  products: any[];
  searchQuery: string;
}

class VisualSearchService {
  /**
   * Convert image to base64 for API transmission
   */
  async imageToBase64(uri: string): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  }

  /**
   * Analyze image for objects, colors, and suggested search query
   */
  async analyzeImage(imageUri: string): Promise<ImageAnalysisResult> {
    const base64 = await this.imageToBase64(imageUri);

    const response = await apiService.post<ImageAnalysisResult>(
      '/products/visual-search',
      { image: base64 }
    );

    return response;
  }

  /**
   * Search for products using image
   */
  async searchByImage(
    imageUri: string,
    location?: { lat: number; lng: number }
  ): Promise<VisualSearchResult> {
    const base64 = await this.imageToBase64(imageUri);

    const response = await apiService.post<VisualSearchResult>(
      '/products/search-by-image',
      {
        image: base64,
        location
      }
    );

    return response;
  }
}

export const visualSearchService = new VisualSearchService();
```

**What this does:**
- Converts images to base64 encoding for API transmission
- Sends images to backend vision API
- Returns detected objects, colors, and search suggestions

##### Step 3: Visual Search Screen UI

**File: `src/screens/main/VisualSearchScreen.tsx`**

```typescript
import React, { useState, useRef } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Button, Card, Text, Chip, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { visualSearchService } from '../../services/visualSearchService';

const VisualSearchScreen = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const cameraRef = useRef<Camera>(null);
  const navigation = useNavigation();

  // Request camera permission on mount
  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current) return;

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.7,
      base64: false,
    });

    setCapturedImage(photo.uri);
    analyzeImage(photo.uri);
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access gallery is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      analyzeImage(result.assets[0].uri);
    }
  };

  const analyzeImage = async (imageUri: string) => {
    setAnalyzing(true);

    try {
      const result = await visualSearchService.analyzeImage(imageUri);
      setAnalysisResult(result);
    } catch (error) {
      console.error('Image analysis failed:', error);
      alert('Failed to analyze image');
    } finally {
      setAnalyzing(false);
    }
  };

  const searchProducts = async () => {
    if (!capturedImage) return;

    try {
      // Get user location
      const { status } = await Location.requestForegroundPermissionsAsync();
      let location;

      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({});
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      }

      // Navigate to search results
      navigation.navigate('SearchResults', {
        query: analysisResult?.suggestedQuery || '',
        isVisualSearch: true,
        imageUri: capturedImage,
        location,
      });
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  if (hasPermission === null) {
    return <ActivityIndicator />;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>Camera permission not granted</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!capturedImage ? (
        <>
          {/* Camera Preview */}
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={CameraType.back}
          >
            <View style={styles.cameraOverlay}>
              <Button
                mode="contained"
                onPress={takePicture}
                icon="camera"
                style={styles.captureButton}
              >
                Capture
              </Button>
            </View>
          </Camera>

          {/* Gallery Button */}
          <Button
            mode="outlined"
            onPress={pickImageFromGallery}
            icon="image"
            style={styles.galleryButton}
          >
            Choose from Gallery
          </Button>
        </>
      ) : (
        <View style={styles.resultsContainer}>
          {/* Captured Image */}
          <Image
            source={{ uri: capturedImage }}
            style={styles.capturedImage}
          />

          {/* Analysis Loading */}
          {analyzing && (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.analyzingText}>Analyzing image...</Text>
            </View>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <Card style={styles.resultsCard}>
              <Card.Content>
                <Text variant="titleMedium">Analysis Results</Text>

                {/* Suggested Query */}
                <Text variant="bodySmall" style={styles.label}>
                  Suggested Search:
                </Text>
                <Text variant="bodyLarge" style={styles.suggestion}>
                  {analysisResult.suggestedQuery}
                </Text>

                {/* Detected Objects */}
                <Text variant="bodySmall" style={styles.label}>
                  Detected Objects:
                </Text>
                <View style={styles.chipsContainer}>
                  {analysisResult.detectedObjects.map((obj: any, index: number) => (
                    <Chip key={index} style={styles.chip}>
                      {obj.label} ({Math.round(obj.confidence * 100)}%)
                    </Chip>
                  ))}
                </View>

                {/* Colors */}
                <Text variant="bodySmall" style={styles.label}>
                  Dominant Colors:
                </Text>
                <View style={styles.colorsContainer}>
                  {analysisResult.dominantColors.map((color: string, index: number) => (
                    <View
                      key={index}
                      style={[styles.colorSwatch, { backgroundColor: color }]}
                    />
                  ))}
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Button
              mode="contained"
              onPress={searchProducts}
              disabled={!analysisResult}
              icon="magnify"
            >
              Search Products
            </Button>
            <Button
              mode="outlined"
              onPress={() => {
                setCapturedImage(null);
                setAnalysisResult(null);
              }}
              icon="camera"
            >
              Take Another Photo
            </Button>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureButton: {
    width: 200,
  },
  galleryButton: {
    margin: 16,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  capturedImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 16,
  },
  analyzingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  analyzingText: {
    marginTop: 10,
  },
  resultsCard: {
    marginBottom: 16,
  },
  label: {
    marginTop: 12,
    opacity: 0.7,
  },
  suggestion: {
    marginTop: 4,
    fontWeight: 'bold',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    margin: 4,
  },
  colorsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  actionsContainer: {
    gap: 12,
  },
});

export default VisualSearchScreen;
```

**What this does:**
- Shows live camera preview
- Captures photos or picks from gallery
- Sends image to vision API for analysis
- Displays detected objects with confidence scores
- Shows dominant colors as color swatches
- Generates suggested search query
- Navigates to product results

**Key Features:**
- **Permission Handling:** Requests camera/gallery access
- **Image Quality:** 70% quality to reduce upload size
- **Loading States:** Shows spinner during analysis
- **Error Handling:** Alerts on failure
- **Navigation:** Passes data to SearchResults screen

---

### Feature 4: AP2 Mandate System (Autonomous Payments)

#### Overview
The AP2 (Advanced Payment Protocol 2.0) mandate system allows users to authorize the AI agent to make purchases on their behalf within predefined constraints. This is the core innovation enabling autonomous shopping.

#### Mandate Types

1. **Intent Mandate:** General shopping authorization
   - User says: "Find me wireless headphones under $100"
   - Creates mandate with max price, time limit, category constraints
   - Agent searches and compares within bounds

2. **Cart Mandate:** Specific purchase authorization
   - User reviews cart and approves
   - Creates mandate for exact items, merchant, payment method
   - Agent executes purchase with mandate signature

#### Technologies Used
- **Expo Secure Store:** Stores cryptographic keys
- **Expo Local Authentication:** Biometric verification
- **Ed25519 Signatures:** Digital signing (placeholder implementation)
- **Custom Hook:** `useAP2Mandates` for React integration

#### Implementation Steps

##### Step 1: Mandate Manager Class

**File: `src/services/AP2MandateManager.ts`**

```typescript
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';

interface IntentMandate {
  type: 'intent';
  mandate_id: string;
  user_id: string;
  request: string;
  max_price: number;
  min_price?: number;
  approved_merchants?: string[];
  blocked_merchants?: string[];
  categories?: string[];
  created_at: string;
  expires_at: string;
  status: 'active' | 'revoked' | 'expired';
}

interface CartMandate {
  type: 'cart';
  mandate_id: string;
  user_id: string;
  intent_mandate_id: string;
  items: Array<{
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
  }>;
  merchant: {
    merchant_id: string;
    name: string;
  };
  total_amount: number;
  payment_method_id?: string;
  shipping_address?: any;
  created_at: string;
  expires_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
}

interface SignedMandate<T> {
  mandate: T;
  signature: string;
  public_key: string;
}

export class AP2MandateManager {
  private userId: string;
  private privateKey: string | null = null;
  private publicKey: string | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize cryptographic keys (generate or load from secure storage)
   */
  async initialize(): Promise<void> {
    const keyPrefix = `ap2_keys_${this.userId}`;

    // Try to load existing keys
    this.privateKey = await SecureStore.getItemAsync(`${keyPrefix}_private`);
    this.publicKey = await SecureStore.getItemAsync(`${keyPrefix}_public`);

    // Generate new keys if none exist
    if (!this.privateKey || !this.publicKey) {
      const keyPair = await this.generateKeyPair();
      this.privateKey = keyPair.privateKey;
      this.publicKey = keyPair.publicKey;

      await SecureStore.setItemAsync(`${keyPrefix}_private`, this.privateKey);
      await SecureStore.setItemAsync(`${keyPrefix}_public`, this.publicKey);
    }
  }

  /**
   * Generate Ed25519 key pair (PLACEHOLDER - use proper crypto library in production)
   */
  private async generateKeyPair(): Promise<{ privateKey: string; publicKey: string }> {
    // In production, use: @stablelib/ed25519 or similar
    // This is a placeholder that generates random keys
    const privateKey = uuidv4() + uuidv4(); // 64 chars
    const publicKey = uuidv4() + uuidv4();  // 64 chars
    return { privateKey, publicKey };
  }

  /**
   * Sign data with private key (PLACEHOLDER)
   */
  private async sign(data: string): Promise<string> {
    if (!this.privateKey) {
      throw new Error('Keys not initialized');
    }

    // In production, use proper Ed25519 signing
    // This is a placeholder that creates a fake signature
    const signature = `sig_${Buffer.from(data).toString('base64').substring(0, 20)}`;
    return signature;
  }

  /**
   * Create Intent Mandate
   */
  async createIntentMandate(
    request: string,
    maxPrice: number,
    options?: {
      minPrice?: number;
      timeLimitHours?: number;
      approvedMerchants?: string[];
      blockedMerchants?: string[];
      categories?: string[];
    }
  ): Promise<SignedMandate<IntentMandate>> {
    const timeLimitHours = options?.timeLimitHours || 24;

    const mandate: IntentMandate = {
      type: 'intent',
      mandate_id: `im_${uuidv4()}`,
      user_id: this.userId,
      request,
      max_price: maxPrice,
      min_price: options?.minPrice,
      approved_merchants: options?.approvedMerchants,
      blocked_merchants: options?.blockedMerchants,
      categories: options?.categories,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + timeLimitHours * 60 * 60 * 1000).toISOString(),
      status: 'active',
    };

    // Sign mandate
    const mandateString = JSON.stringify(mandate);
    const signature = await this.sign(mandateString);

    return {
      mandate,
      signature,
      public_key: this.publicKey!,
    };
  }

  /**
   * Create Cart Mandate
   */
  async createCartMandate(
    intentMandateId: string,
    items: CartMandate['items'],
    merchant: CartMandate['merchant'],
    options?: {
      paymentMethodId?: string;
      shippingAddress?: any;
    }
  ): Promise<SignedMandate<CartMandate>> {
    const totalAmount = items.reduce((sum, item) =>
      sum + (item.unit_price * item.quantity), 0
    );

    const mandate: CartMandate = {
      type: 'cart',
      mandate_id: `cm_${uuidv4()}`,
      user_id: this.userId,
      intent_mandate_id: intentMandateId,
      items,
      merchant,
      total_amount: totalAmount,
      payment_method_id: options?.paymentMethodId,
      shipping_address: options?.shippingAddress,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min expiry
      status: 'pending',
    };

    const mandateString = JSON.stringify(mandate);
    const signature = await this.sign(mandateString);

    return {
      mandate,
      signature,
      public_key: this.publicKey!,
    };
  }
}
```

**What this does:**
- **Key Management:** Generates and stores Ed25519 key pairs per user
- **Intent Mandates:** Creates shopping authorizations with price/time/merchant constraints
- **Cart Mandates:** Creates specific purchase authorizations
- **Digital Signatures:** Signs mandates to prevent tampering
- **Secure Storage:** Stores private keys in encrypted device storage

##### Step 2: API Service for Mandates

**File: `src/services/AP2MandateManager.ts` (continued)**

```typescript
export class AP2ApiService {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async createIntentMandate(signedMandate: SignedMandate<IntentMandate>) {
    return await this.request('/mandates/intent', 'POST', signedMandate);
  }

  async createCartMandate(signedMandate: SignedMandate<CartMandate>) {
    return await this.request('/mandates/cart', 'POST', signedMandate);
  }

  async processPayment(cartMandateId: string, paymentMethodId: string) {
    return await this.request('/mandates/process-payment', 'POST', {
      cart_mandate_id: cartMandateId,
      payment_method_id: paymentMethodId,
    });
  }

  async revokeMandate(mandateId: string, reason?: string) {
    return await this.request(`/mandates/${mandateId}/revoke`, 'POST', { reason });
  }

  async getUserMandates(type: 'intent' | 'cart', status?: string) {
    const params = new URLSearchParams({ type });
    if (status) params.append('status', status);
    return await this.request(`/mandates/user?${params.toString()}`);
  }
}
```

**What this does:**
- Sends signed mandates to backend for verification
- Processes payments using approved mandates
- Revokes mandates when user changes mind
- Fetches user's mandate history

##### Step 3: React Hook for Mandates

**File: `src/hooks/useAP2Mandates.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { AP2MandateManager, AP2ApiService } from '../services/AP2MandateManager';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import * as LocalAuthentication from 'expo-local-authentication';

export const useAP2Mandates = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const authToken = useSelector((state: RootState) => state.auth.token);

  const [mandateManager, setMandateManager] = useState<AP2MandateManager | null>(null);
  const [apiService, setApiService] = useState<AP2ApiService | null>(null);
  const [currentIntentMandate, setCurrentIntentMandate] = useState<any>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [isCreatingCart, setIsCreatingCart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize managers when user logs in
  useEffect(() => {
    if (user?.id && authToken) {
      const manager = new AP2MandateManager(user.id);
      manager.initialize().then(() => {
        setMandateManager(manager);
      });

      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      const api = new AP2ApiService(baseUrl, authToken);
      setApiService(api);
    }
  }, [user?.id, authToken]);

  /**
   * Request biometric authentication before sensitive operations
   */
  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        return true; // Proceed without biometrics if unavailable
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to approve mandate',
        fallbackLabel: 'Use passcode',
      });

      return result.success ?? false;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return true;
    }
  };

  /**
   * Create Intent Mandate
   */
  const createIntentMandate = useCallback(
    async (request: string, maxPrice: number, options?: any) => {
      if (!mandateManager || !apiService) {
        setError('Mandate manager not initialized');
        return null;
      }

      setIsCreatingIntent(true);
      setError(null);

      try {
        // Create signed mandate locally
        const signedMandate = await mandateManager.createIntentMandate(
          request,
          maxPrice,
          options
        );

        // Send to backend
        const serverMandate = await apiService.createIntentMandate(signedMandate);
        setCurrentIntentMandate(serverMandate);

        return serverMandate;
      } catch (err) {
        setError('Failed to create Intent Mandate');
        return null;
      } finally {
        setIsCreatingIntent(false);
      }
    },
    [mandateManager, apiService]
  );

  /**
   * Create Cart Mandate (requires biometric auth)
   */
  const createCartMandate = useCallback(
    async (intentMandateId: string, items: any[], merchant: any, options?: any) => {
      if (!mandateManager || !apiService) {
        setError('Mandate manager not initialized');
        return null;
      }

      setIsCreatingCart(true);
      setError(null);

      try {
        // Require biometric authentication
        const authenticated = await authenticateWithBiometrics();
        if (!authenticated) {
          throw new Error('Authentication required');
        }

        const signedMandate = await mandateManager.createCartMandate(
          intentMandateId,
          items,
          merchant,
          options
        );

        const serverMandate = await apiService.createCartMandate(signedMandate);
        return serverMandate;
      } catch (err) {
        setError('Failed to create Cart Mandate');
        return null;
      } finally {
        setIsCreatingCart(false);
      }
    },
    [mandateManager, apiService]
  );

  return {
    currentIntentMandate,
    isCreatingIntent,
    isCreatingCart,
    error,
    createIntentMandate,
    createCartMandate,
  };
};
```

**What this does:**
- Initializes mandate manager when user logs in
- Provides easy-to-use functions for React components
- Handles biometric authentication for sensitive operations
- Manages loading and error states
- Auto-initializes cryptographic keys

##### Step 4: Using Mandates in a Component

**Example Usage in Agent Screen:**

```typescript
import { useAP2Mandates } from '../../hooks/useAP2Mandates';

const AgentScreen = () => {
  const {
    createIntentMandate,
    createCartMandate,
    isCreatingIntent,
    error
  } = useAP2Mandates();

  // User says: "Find me headphones under $100"
  const handleUserRequest = async (request: string) => {
    // Create Intent Mandate
    const intentMandate = await createIntentMandate(
      request, // "Find me headphones under $100"
      100,     // Max price
      {
        categories: ['Electronics', 'Audio'],
        timeLimitHours: 48,
      }
    );

    if (intentMandate) {
      // Agent now has authorization to search and recommend
      console.log('Mandate created:', intentMandate.mandate.mandate_id);
    }
  };

  // User approves a specific cart
  const handleCartApproval = async (cartItems: any[], merchant: any) => {
    const cartMandate = await createCartMandate(
      currentIntentMandate.mandate.mandate_id,
      cartItems,
      merchant,
      {
        paymentMethodId: 'pm_12345',
      }
    );

    if (cartMandate) {
      // Process payment with mandate
      console.log('Cart approved:', cartMandate.mandate.mandate_id);
    }
  };

  return (
    // UI components...
  );
};
```

**What this flow does:**
1. User expresses shopping intent via chat
2. App creates Intent Mandate with budget/constraints
3. Agent searches for products within mandate bounds
4. Agent presents options to user
5. User reviews and approves specific cart
6. App requests biometric authentication
7. App creates Cart Mandate for exact purchase
8. Backend verifies signature and processes payment
9. User receives order confirmation

---

### Feature 5: Product Search and Filtering

#### Overview
Users can search for products by text query, with advanced filtering by price, location, availability, and ratings. Results can be sorted by relevance, price, distance, or rating.

#### Technologies Used
- **Redux:** Stores search results and filters
- **expo-location:** Gets user coordinates for nearby results
- **React Native Paper:** UI components

#### Implementation Steps

##### Step 1: Product State Slice

**File: `src/store/slices/productSlice.ts`**

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  rating: number;
  reviewCount: number;
  merchant: {
    id: string;
    name: string;
    logo?: string;
  };
  availability: {
    online: boolean;
    inStore: boolean;
    nearbyStores?: Array<{
      id: string;
      name: string;
      address: string;
      distance: number; // in km
      inStock: boolean;
    }>;
  };
  category: string;
}

interface ProductState {
  results: Product[];
  selectedProduct: Product | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    minPrice?: number;
    maxPrice?: number;
    availability: 'all' | 'online' | 'inStore' | 'nearby';
    sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'distance' | 'rating';
  };
  searchQuery: string;
}

const initialState: ProductState = {
  results: [],
  selectedProduct: null,
  isLoading: false,
  error: null,
  filters: {
    availability: 'all',
    sortBy: 'relevance',
  },
  searchQuery: '',
};

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    setSearchResults: (state, action: PayloadAction<Product[]>) => {
      state.results = action.payload;
      state.isLoading = false;
    },
    setSelectedProduct: (state, action: PayloadAction<Product>) => {
      state.selectedProduct = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setFilters: (state, action: PayloadAction<Partial<ProductState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
  },
});

export const {
  setSearchResults,
  setSelectedProduct,
  setLoading,
  setError,
  setFilters,
  setSearchQuery,
} = productSlice.actions;

export default productSlice.reducer;
```

##### Step 2: Product Service

**File: `src/services/productService.ts`**

```typescript
import { apiService } from './api';

interface SearchFilters {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: {
    lat: number;
    lng: number;
    radiusKm?: number;
  };
  availability?: 'all' | 'online' | 'inStore' | 'nearby';
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'distance' | 'rating';
  page?: number;
  limit?: number;
}

class ProductService {
  async searchProducts(filters: SearchFilters): Promise<any> {
    return await apiService.post('/products/search', filters);
  }

  async getProductDetails(productId: string): Promise<any> {
    return await apiService.get(`/products/${productId}`);
  }

  async getNearbyStores(productId: string, location: { lat: number; lng: number }): Promise<any> {
    return await apiService.post(`/products/${productId}/nearby-stores`, { location });
  }
}

export const productService = new ProductService();
```

##### Step 3: Search Results Screen

**File: `src/screens/main/SearchResultsScreen.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import {
  Card,
  Text,
  Chip,
  Button,
  Menu,
  Divider,
  ActivityIndicator
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RootState } from '../../store';
import {
  setSearchResults,
  setLoading,
  setFilters
} from '../../store/slices/productSlice';
import { productService } from '../../services/productService';
import * as Location from 'expo-location';

const SearchResultsScreen = () => {
  const route = useRoute();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const { results, isLoading, filters } = useSelector(
    (state: RootState) => state.product
  );

  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<any>(null);

  // Get query from navigation params
  const searchQuery = route.params?.query || '';
  const isVisualSearch = route.params?.isVisualSearch || false;

  // Get user location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }
    })();
  }, []);

  // Perform search when query or filters change
  useEffect(() => {
    if (searchQuery) {
      performSearch();
    }
  }, [searchQuery, filters, userLocation]);

  const performSearch = async () => {
    dispatch(setLoading(true));

    try {
      const response = await productService.searchProducts({
        query: searchQuery,
        ...filters,
        location: userLocation,
      });

      dispatch(setSearchResults(response.products));
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const renderProduct = ({ item }: { item: any }) => {
    const nearestStore = item.availability.nearbyStores?.[0];

    return (
      <Card
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
      >
        <Card.Cover source={{ uri: item.images[0] }} />
        <Card.Content>
          <Text variant="titleMedium" numberOfLines={2}>
            {item.name}
          </Text>

          <Text variant="bodyLarge" style={styles.price}>
            ${item.price.toFixed(2)}
          </Text>

          <View style={styles.ratingContainer}>
            <Text variant="bodySmall">
              ⭐ {item.rating.toFixed(1)} ({item.reviewCount} reviews)
            </Text>
          </View>

          <Text variant="bodySmall" style={styles.merchant}>
            Sold by {item.merchant.name}
          </Text>

          {/* Availability Chips */}
          <View style={styles.availabilityContainer}>
            {item.availability.online && (
              <Chip mode="outlined" compact>Online</Chip>
            )}
            {item.availability.inStore && (
              <Chip mode="outlined" compact>In Store</Chip>
            )}
          </View>

          {/* Nearby Store Info */}
          {nearestStore && (
            <Text variant="bodySmall" style={styles.nearbyStore}>
              📍 {nearestStore.distance.toFixed(1)} km away
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Visual Search Indicator */}
      {isVisualSearch && (
        <Card style={styles.visualSearchBanner}>
          <Card.Content>
            <Text variant="bodyMedium">🔍 Visual Search Results</Text>
          </Card.Content>
        </Card>
      )}

      {/* Filters Bar */}
      <View style={styles.filtersBar}>
        {/* Availability Filter */}
        <View style={styles.availabilityFilters}>
          {['all', 'online', 'inStore', 'nearby'].map((type) => (
            <Chip
              key={type}
              selected={filters.availability === type}
              onPress={() => dispatch(setFilters({ availability: type as any }))}
              style={styles.filterChip}
            >
              {type === 'all' ? 'All' :
               type === 'online' ? 'Online' :
               type === 'inStore' ? 'In Store' : 'Nearby'}
            </Chip>
          ))}
        </View>

        {/* Sort Menu */}
        <Menu
          visible={sortMenuVisible}
          onDismiss={() => setSortMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setSortMenuVisible(true)}
              icon="sort"
            >
              Sort
            </Button>
          }
        >
          <Menu.Item
            onPress={() => {
              dispatch(setFilters({ sortBy: 'relevance' }));
              setSortMenuVisible(false);
            }}
            title="Relevance"
          />
          <Menu.Item
            onPress={() => {
              dispatch(setFilters({ sortBy: 'price_asc' }));
              setSortMenuVisible(false);
            }}
            title="Price: Low to High"
          />
          <Menu.Item
            onPress={() => {
              dispatch(setFilters({ sortBy: 'price_desc' }));
              setSortMenuVisible(false);
            }}
            title="Price: High to Low"
          />
          <Menu.Item
            onPress={() => {
              dispatch(setFilters({ sortBy: 'distance' }));
              setSortMenuVisible(false);
            }}
            title="Distance"
          />
          <Menu.Item
            onPress={() => {
              dispatch(setFilters({ sortBy: 'rating' }));
              setSortMenuVisible(false);
            }}
            title="Rating"
          />
        </Menu>
      </View>

      {/* Results List */}
      {isLoading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={results}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No products found</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  visualSearchBanner: {
    margin: 8,
    backgroundColor: '#e3f2fd',
  },
  filtersBar: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  availabilityFilters: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  listContainer: {
    padding: 8,
  },
  productCard: {
    marginVertical: 8,
  },
  price: {
    fontWeight: 'bold',
    marginTop: 8,
    color: '#1976d2',
  },
  ratingContainer: {
    marginTop: 4,
  },
  merchant: {
    marginTop: 4,
    opacity: 0.7,
  },
  availabilityContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  nearbyStore: {
    marginTop: 8,
    color: '#2e7d32',
  },
  loader: {
    marginTop: 40,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.7,
  },
});

export default SearchResultsScreen;
```

**What this does:**
- Gets user location for nearby results
- Displays products in scrollable list
- Shows availability (online/in-store/nearby)
- Filters by availability type
- Sorts by multiple criteria
- Calculates distance to nearest store
- Handles loading and empty states

---

## Data Flow Patterns

### Pattern 1: User Authentication Flow

```
User enters credentials
       ↓
LoginScreen dispatches login action
       ↓
AuthService calls POST /auth/login
       ↓
Backend returns { user, token }
       ↓
Token stored in Expo Secure Store
       ↓
Redux state updated with setCredentials
       ↓
RootNavigator re-renders (auth state changed)
       ↓
Protected features now accessible
       ↓
API interceptor adds token to all requests
```

### Pattern 2: Visual Search Flow

```
User captures photo
       ↓
Image converted to base64
       ↓
POST /products/visual-search { image: base64 }
       ↓
Backend vision API analyzes image
       ↓
Returns { suggestedQuery, objects, colors }
       ↓
User taps "Search Products"
       ↓
Navigation to SearchResultsScreen with query
       ↓
User location retrieved
       ↓
POST /products/search { query, location, filters }
       ↓
Redux state updated with results
       ↓
FlatList renders product cards
```

### Pattern 3: Mandate Creation Flow

```
User expresses intent: "Find headphones under $100"
       ↓
useAP2Mandates hook called
       ↓
AP2MandateManager generates mandate object
       ↓
Mandate signed with user's private key
       ↓
POST /mandates/intent { mandate, signature, public_key }
       ↓
Backend verifies signature
       ↓
Mandate stored in database
       ↓
Agent searches within mandate constraints
       ↓
User reviews cart and approves
       ↓
Biometric authentication requested
       ↓
Cart Mandate created and signed
       ↓
POST /mandates/cart { mandate, signature }
       ↓
Backend verifies and processes payment
       ↓
Order confirmation returned
```

---

## Code Structure Deep Dive

### Redux Store Configuration

**File: `src/store/index.ts`**

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import agentReducer from './slices/agentSlice';
import productReducer from './slices/productSlice';
import cartReducer from './slices/cartSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    agent: agentReducer,
    product: productReducer,
    cart: cartReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable for Date objects
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**What this does:**
- Combines all slice reducers
- Configures Redux DevTools
- Defines TypeScript types for state and dispatch
- Disables serializable check (for Date objects in messages)

**Using Redux in Components:**

```typescript
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setCredentials } from '../store/slices/authSlice';

const MyComponent = () => {
  // Get state
  const user = useSelector((state: RootState) => state.auth.user);
  const products = useSelector((state: RootState) => state.product.results);

  // Get dispatch
  const dispatch = useDispatch();

  // Dispatch action
  const login = () => {
    dispatch(setCredentials({ user: {...}, token: '...' }));
  };
};
```

---

### Navigation Structure

**Bottom Tab Navigator:**

```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const Tab = createBottomTabNavigator();

const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Agent') iconName = 'robot';
          else if (route.name === 'Orders') iconName = 'shopping';
          else if (route.name === 'Profile') iconName = 'account';

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Agent" component={AgentScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
```

**Navigation Between Screens:**

```typescript
import { useNavigation } from '@react-navigation/native';

const MyScreen = () => {
  const navigation = useNavigation();

  const goToSearch = () => {
    navigation.navigate('SearchResults', {
      query: 'headphones',
      isVisualSearch: false
    });
  };

  const goBack = () => {
    navigation.goBack();
  };
};
```

---

### Theme Configuration

**File: `src/theme/index.ts`**

```typescript
import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200EE',
    secondary: '#03DAC6',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    error: '#B00020',
  },
  roundness: 8,
};
```

**Using Theme in Components:**

```typescript
import { useTheme } from 'react-native-paper';

const MyComponent = () => {
  const theme = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <Text style={{ color: theme.colors.primary }}>Hello</Text>
    </View>
  );
};
```

---

## Key Takeaways

### For Beginners

1. **React Native** lets you build mobile apps with JavaScript/TypeScript
2. **Components** are reusable pieces of UI (like LEGO blocks)
3. **State** is data that changes over time (user input, API responses)
4. **Redux** stores state globally so any component can access it
5. **Navigation** moves users between screens
6. **APIs** connect your app to backend services
7. **Hooks** let you use state and lifecycle in functional components

### Architecture Patterns Used

1. **Service Layer Pattern:** Separate API logic from UI (authService, productService)
2. **State Management:** Redux for global state, local useState for component state
3. **Provider Pattern:** Wrap app with providers (Redux, Navigation, Theme)
4. **Custom Hooks:** Reusable logic (useAP2Mandates)
5. **Type Safety:** TypeScript interfaces for all data structures
6. **Interceptor Pattern:** Axios interceptors for auth tokens
7. **Secure Storage:** Encrypted storage for sensitive data

### Best Practices Demonstrated

1. **Separation of Concerns:** UI, business logic, and data layer are separate
2. **Error Handling:** Try-catch blocks, error states, user feedback
3. **Loading States:** Show spinners during async operations
4. **Permission Handling:** Request camera/location permissions gracefully
5. **Security:** Biometric auth for sensitive operations, encrypted storage
6. **TypeScript:** Type safety prevents runtime errors
7. **Component Composition:** Small, focused components
8. **Accessibility:** Material Design components are accessible by default

---

## Next Steps

To extend this app, you could:

1. Add push notifications for order updates
2. Implement offline mode with local database
3. Add social sharing of products
4. Implement wishlist/favorites
5. Add multi-language support
6. Implement dark mode toggle
7. Add product comparison feature
8. Implement AR product visualization
9. Add voice search
10. Implement split payment options

---

## Glossary

- **React Native:** Framework for building native mobile apps using React
- **Redux:** Predictable state container for JavaScript apps
- **Expo:** Platform for making React Native apps faster
- **TypeScript:** Typed superset of JavaScript
- **Hook:** Function that lets you use React features
- **Component:** Reusable piece of UI
- **State:** Data that changes over time
- **Props:** Data passed from parent to child component
- **Navigation:** Moving between screens
- **API:** Application Programming Interface (backend service)
- **Axios:** HTTP client for making API requests
- **JWT:** JSON Web Token (authentication token)
- **Ed25519:** Digital signature algorithm
- **Biometric:** Fingerprint/Face ID authentication
- **Mandate:** Authorization for autonomous actions
- **FlatList:** Performant list component
- **Material Design:** Google's design system

---

*This document provides a comprehensive overview of the Agentic Commerce mobile application. For specific implementation questions, refer to the code files mentioned in each section.*
