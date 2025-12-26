import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Image, ScrollView, Alert, PermissionsAndroid, Platform } from 'react-native';
import { Button, Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { visualSearchService } from '../../services/visualSearchService';

const VisualSearchScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const cameraRef = useRef<Camera>(null);
  const navigation = useNavigation();
  const isMountedRef = useRef(true);
  
  const device = useCameraDevice('back');
  const { hasPermission: cameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();

  useEffect(() => {
    isMountedRef.current = true;
    let permissionRequested = false;

    (async () => {
      if (permissionRequested) return;
      permissionRequested = true;

      try {
        if (Platform.OS === 'android') {
          const cameraStatus = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA
          );
          const storageStatus = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
          );
          
          if (isMountedRef.current) {
            setHasPermission(
              cameraStatus === PermissionsAndroid.RESULTS.GRANTED &&
              storageStatus === PermissionsAndroid.RESULTS.GRANTED
            );
          }
        } else {
          // iOS permissions are handled by react-native-vision-camera
          if (!cameraPermission) {
            const granted = await requestCameraPermission();
            if (isMountedRef.current) {
              setHasPermission(granted);
            }
          } else {
            if (isMountedRef.current) {
              setHasPermission(true);
            }
          }
        }
      } catch (error) {
        console.error('Permission request error:', error);
        if (isMountedRef.current) {
          setHasPermission(false);
        }
      }
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, [cameraPermission, requestCameraPermission]);

  const takePicture = async () => {
    if (!cameraRef.current || !isMountedRef.current || !device) return;
    
    try {
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'speed',
        flash: 'off',
      });
      
      if (!isMountedRef.current) return;
      
      if (photo?.path) {
        setImageUri(`file://${photo.path}`);
        // Convert to base64 for analysis
        const base64 = await convertImageToBase64(`file://${photo.path}`);
        if (base64) {
          analyzeImage(base64);
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const convertImageToBase64 = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String.split(',')[1]); // Remove data:image/...;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return null;
    }
  };

  const pickImage = async () => {
    if (!isMountedRef.current) return;
    
    try {
      const result: ImagePickerResponse = await new Promise((resolve) => {
        launchImageLibrary(
          {
            mediaType: 'photo' as MediaType,
            quality: 0.8,
            includeBase64: true,
          },
          resolve
        );
      });

      if (!isMountedRef.current) return;

      if (!result.didCancel && result.assets?.[0]) {
        setImageUri(result.assets[0].uri || null);
        if (result.assets[0].base64) {
          analyzeImage(result.assets[0].base64);
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const analyzeImage = async (base64: string) => {
    if (!isMountedRef.current) return;
    
    try {
      setAnalyzing(true);
      const analysisResults = await visualSearchService.analyzeImage(base64);
      
      if (isMountedRef.current) {
        setResults(analysisResults);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Image analysis error:', error);
      Alert.alert('Error', 'Failed to analyze image. Please try again.');
    } finally {
      if (isMountedRef.current) {
        setAnalyzing(false);
      }
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
        <Button mode="contained" onPress={requestCameraPermission}>
          Grant Permission
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {!imageUri ? (
        <View style={styles.cameraContainer}>
          {device && (
            <Camera
              ref={cameraRef}
              style={styles.camera}
              device={device}
              isActive={true}
              photo={true}
            />
          )}
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
