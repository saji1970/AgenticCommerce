import React, { useState, useRef } from 'react';
import { View, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { Button, Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { visualSearchService } from '../../services/visualSearchService';

const VisualSearchScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const cameraRef = useRef<Camera>(null);
  const navigation = useNavigation();

  React.useEffect(() => {
    (async () => {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasPermission(cameraStatus.status === 'granted' && galleryStatus.status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });
      setImageUri(photo.uri);
      if (photo.base64) {
        analyzeImage(photo.base64);
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      if (result.assets[0].base64) {
        analyzeImage(result.assets[0].base64);
      }
    }
  };

  const analyzeImage = async (base64: string) => {
    try {
      setAnalyzing(true);
      const analysisResults = await visualSearchService.analyzeImage(base64);
      setResults(analysisResults);
    } catch (error) {
      console.error('Image analysis error:', error);
      Alert.alert('Error', 'Failed to analyze image. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const searchProducts = () => {
    if (results?.suggestedQuery) {
      // Navigate to search results with the suggested query
      navigation.navigate('SearchResults' as never, {
        query: results.suggestedQuery,
        visualSearch: true,
      } as never);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><ActivityIndicator /></View>;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>Camera permission is required to use this feature.</Text>
        <Button mode="contained" onPress={() => Camera.requestCameraPermissionsAsync()}>
          Grant Permission
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {!imageUri ? (
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={CameraType.back}
          />
          <View style={styles.buttonContainer}>
            <Button mode="contained" onPress={takePicture} icon="camera" style={styles.button}>
              Take Photo
            </Button>
            <Button mode="outlined" onPress={pickImage} icon="image" style={styles.button}>
              Choose from Gallery
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} />

          {analyzing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Analyzing image...</Text>
            </View>
          ) : results ? (
            <Card style={styles.resultsCard}>
              <Card.Title title="Visual Search Results" />
              <Card.Content>
                <Text variant="titleMedium">Suggested Search</Text>
                <Text variant="bodyLarge" style={styles.suggestedQuery}>
                  {results.suggestedQuery}
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Detected Items
                </Text>
                <View style={styles.chipsContainer}>
                  {results.detectedObjects.map((obj: any, index: number) => (
                    <Chip key={index} style={styles.chip}>
                      {obj.name} ({Math.round(obj.confidence * 100)}%)
                    </Chip>
                  ))}
                </View>

                {results.dominantColors.length > 0 && (
                  <>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                      Dominant Colors
                    </Text>
                    <View style={styles.colorsContainer}>
                      {results.dominantColors.map((color: string, index: number) => (
                        <View
                          key={index}
                          style={[styles.colorBox, { backgroundColor: color }]}
                        />
                      ))}
                    </View>
                  </>
                )}
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => setImageUri(null)}>Try Again</Button>
                <Button mode="contained" onPress={searchProducts}>
                  Search Products
                </Button>
              </Card.Actions>
            </Card>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    height: 500,
  },
  buttonContainer: {
    padding: 16,
    gap: 12,
  },
  button: {
    marginVertical: 4,
  },
  resultContainer: {
    padding: 16,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  resultsCard: {
    marginBottom: 16,
  },
  suggestedQuery: {
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginVertical: 4,
  },
  colorsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  colorBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
});

export default VisualSearchScreen;
