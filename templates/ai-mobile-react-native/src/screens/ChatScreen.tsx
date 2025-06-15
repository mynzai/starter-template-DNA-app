import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ChatScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Chat Screen - Implementation Pending</Text>
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

export default ChatScreen;