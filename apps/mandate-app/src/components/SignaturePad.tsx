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
  const [paths, setPaths] = useState<Array<{ x: number; y: number }[]>>([]);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setIsDrawing(true);
        setCurrentPath([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        if (!isDrawing) return;
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        if (currentPath.length > 0) {
          setPaths((prev) => [...prev, currentPath]);
          setCurrentPath([]);
        }
        setIsDrawing(false);
      },
    })
  ).current;

  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
    onClear?.();
  };

  const handleSave = () => {
    if (paths.length === 0 && currentPath.length === 0) {
      Alert.alert('No Signature', 'Please draw your signature first');
      return;
    }

    const allPaths = [...paths, currentPath].filter(p => p.length > 0);
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
        {paths.map((path, pathIndex) => (
          <View key={pathIndex} style={StyleSheet.absoluteFill}>
            {path.map((point, pointIndex) => {
              if (pointIndex === 0) return null;
              const prevPoint = path[pointIndex - 1];
              return (
                <View
                  key={pointIndex}
                  style={[
                    styles.line,
                    {
                      left: Math.min(prevPoint.x, point.x),
                      top: Math.min(prevPoint.y, point.y),
                      width: Math.abs(point.x - prevPoint.x) || 2,
                      height: Math.abs(point.y - prevPoint.y) || 2,
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
        {currentPath.length > 0 && (
          <View style={StyleSheet.absoluteFill}>
            {currentPath.map((point, pointIndex) => {
              if (pointIndex === 0) return null;
              const prevPoint = currentPath[pointIndex - 1];
              return (
                <View
                  key={pointIndex}
                  style={[
                    styles.line,
                    {
                      left: Math.min(prevPoint.x, point.x),
                      top: Math.min(prevPoint.y, point.y),
                      width: Math.abs(point.x - prevPoint.x) || 2,
                      height: Math.abs(point.y - prevPoint.y) || 2,
                    },
                  ]}
                />
              );
            })}
          </View>
        )}
        {paths.length === 0 && currentPath.length === 0 && (
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
  line: {
    position: 'absolute',
    backgroundColor: '#000000',
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
