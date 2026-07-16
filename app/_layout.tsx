import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
// import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasUserName, setHasUserName] = useState(false);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const userName = await AsyncStorage.getItem('userName');
      setHasUserName(!!userName);
    } catch (error) {
      console.error('Erreur vérification utilisateur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Écran de bienvenue - s'affiche seulement si pas de nom d'utilisateur */}
        {!hasUserName && (
          <Stack.Screen 
            name="welcome-screen" 
            options={{ 
              headerShown: false,
              presentation: 'fullScreenModal'
            }} 
          />
        )}
        
        {/* Écran principal des tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* Modals */}
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}