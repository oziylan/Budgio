import { Colors, FixedColors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function WelcomeScreen() {
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const colors = Colors[isDarkMode ? 'dark' : 'light'];

  // Vérifier si l'utilisateur existe déjà
  useEffect(() => {
    checkExistingUser();
  }, []);

  const checkExistingUser = async () => {
    try {
      const existingName = await AsyncStorage.getItem('userName');
      if (existingName) {
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error('Erreur vérification:', error);
    }
  };

  const handleSubmit = async () => {
    if (!userName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom');
      return;
    }

    setIsLoading(true);
    
    try {
      // Sauvegarder le nom d'utilisateur
      await AsyncStorage.setItem('userName', userName.trim());
      
      // Rediriger vers l'écran principal
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder vos informations');
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 40,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    input: {
      borderWidth: 2,
      borderColor: colors.border,
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.card,
      fontSize: 18,
      color: colors.text,
      width: '100%',
      marginBottom: 24,
    },
    submitButton: {
      backgroundColor: FixedColors.brandBlue,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      width: '100%',
    },
    submitButtonText: {
      color: FixedColors.white,
      fontSize: 18,
      fontWeight: 'bold',
    },
    submitButtonDisabled: {
      backgroundColor: '#666',
    },
    logo: {
      width: 120,
      height: 120,
      marginBottom: 20,
      resizeMode: 'contain',
    },
    formContainer: {
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
    },
    keyboardAvoidingView: {
      flex: 1,
    },
  });

  return (
    <KeyboardAvoidingView
      style={dynamicStyles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <KeyboardAwareScrollView
        style={dynamicStyles.container}
        contentContainerStyle={dynamicStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
        enableAutomaticScroll={true}
      >
        <View style={dynamicStyles.formContainer}>
          <Image 
            source={require('@/assets/images/budgio_logo_2.png')}
            style={dynamicStyles.logo}
          />
          <Text style={dynamicStyles.title}>Bienvenue sur Budgio</Text>
          <Text style={dynamicStyles.subtitle}>
            Commencez par personnaliser votre expérience
          </Text>

          <TextInput
            placeholder="Entrez votre prénom..."
            value={userName}
            onChangeText={setUserName}
            style={dynamicStyles.input}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            placeholderTextColor={colors.placeholder}
            maxLength={30}
          />

          <TouchableOpacity 
            style={[
              dynamicStyles.submitButton,
              (!userName.trim() || isLoading) && dynamicStyles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!userName.trim() || isLoading}
          >
            <Text style={dynamicStyles.submitButtonText}>
              {isLoading ? 'Chargement...' : 'Commencer'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}