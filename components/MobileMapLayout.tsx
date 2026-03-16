import React from 'react';
import { View, StyleSheet, Button, TouchableOpacity } from 'react-native';
import BottomSheet from 'reanimated-bottom-sheet';

const MobileMapLayout = () => {
  const renderContent = () => (
    <View style={styles.bottomSheetContent}>
      <Text>Your stats here...</Text>
      <Button title="Close" onPress={() => sheetRef.current.snapTo(1)} />
    </View>
  );

  const sheetRef = React.useRef(null);

  return (
    <View style={styles.container}>
      {/* Map Component would be here */}
      <TouchableOpacity style={styles.floatingButton} onPress={() => { /* SOS functionality */ }}>
        <Text>SOS</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.floatingButton} onPress={() => { /* GPS recenter functionality */ }}>
        <Text>GPS</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.floatingButton} onPress={() => sheetRef.current.snapTo(0)}>
        <Text>Stats</Text>
      </TouchableOpacity>
      <BottomSheet
        ref={sheetRef}
        snapPoints={[450, 0]}
        renderContent={renderContent}
        initialSnap={1}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: '#f0c14b',
    padding: 10,
    borderRadius: 50,
  },
  bottomSheetContent: {
    backgroundColor: 'white',
    padding: 20,
    height: 450,
  },
});

export default MobileMapLayout;