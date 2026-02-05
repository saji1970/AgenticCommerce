import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIGNATURE_WIDTH = SCREEN_WIDTH - 48;
const SIGNATURE_HEIGHT = 200;

interface SignaturePadProps {
  onSignatureComplete?: (signatureData: string) => void;
  onClear?: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureComplete,
  onClear,
}) => {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<string>('');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        isDrawingRef.current = true;
        const newPath = `M${locationX.toFixed(2)},${locationY.toFixed(2)}`;
        currentPathRef.current = newPath;
        setCurrentPath(newPath);
      },
      onPanResponderMove: (evt) => {
        if (!isDrawingRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const newPath = `${currentPathRef.current} L${locationX.toFixed(2)},${locationY.toFixed(2)}`;
        currentPathRef.current = newPath;
        setCurrentPath(newPath);
      },
      onPanResponderRelease: () => {
        if (currentPathRef.current) {
          setPaths((prev) => [...prev, currentPathRef.current]);
        }
        currentPathRef.current = '';
        setCurrentPath('');
        isDrawingRef.current = false;
      },
    })
  ).current;

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
    currentPathRef.current = '';
    isDrawingRef.current = false;
    onClear?.();
  };

  const handleSave = () => {
    if (paths.length === 0 && !currentPath) {
      Alert.alert('No Signature', 'Please draw your signature first');
      return;
    }

    const allPaths = currentPath ? [...paths, currentPath] : paths;
    const signatureData = JSON.stringify({
      paths: allPaths,
      width: SIGNATURE_WIDTH,
      height: SIGNATURE_HEIGHT,
      timestamp: new Date().toISOString(),
    });

    onSignatureComplete?.(signatureData);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Sign Here</Text>
      <View style={styles.signatureContainer} {...panResponder.panHandlers}>
        <Svg width={SIGNATURE_WIDTH} height={SIGNATURE_HEIGHT} style={styles.svg}>
          {paths.map((path, index) => (
            <Path
              key={index}
              d={path}
              stroke="#000000"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath ? (
            <Path
              d={currentPath}
              stroke="#000000"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
        {paths.length === 0 && !currentPath && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Draw your signature above</Text>
          </View>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Signature</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  signatureContainer: {
    width: SIGNATURE_WIDTH,
    height: SIGNATURE_HEIGHT,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
