import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CameraScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Camera Screen - Implementation Pending</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});

export default CameraScreen;