import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Button } from '../common/Button';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
}

const DEFAULT_PLACEHOLDER = `Tell me what you're looking for...

Examples:
• "An ergonomic office chair under $200"
• "Notify me when PS5 is back in stock"
• "Book a flight from Atlanta to Pune on 1/28/2026, return 2/2/2026, under $1000"`;

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  loading = false,
  placeholder = DEFAULT_PLACEHOLDER,
}) => {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        placeholderTextColor="#999"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        editable={!loading}
      />
      <Button
        title="Search with AI"
        onPress={handleSearch}
        loading={loading}
        disabled={!query.trim() || loading}
        style={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    color: '#000',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    width: '100%',
  },
});
