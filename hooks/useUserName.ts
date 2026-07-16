import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export const useUserName = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserName();
  }, []);

  const loadUserName = async () => {
    try {
      const name = await AsyncStorage.getItem('userName');
      setUserName(name);
    } catch (error) {
      console.error('Erreur chargement nom:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserName = async (name: string) => {
    try {
      await AsyncStorage.setItem('userName', name.trim());
      setUserName(name.trim());
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde nom:', error);
      return false;
    }
  };

  const clearUserName = async () => {
    try {
      await AsyncStorage.removeItem('userName');
      setUserName(null);
    } catch (error) {
      console.error('Erreur suppression nom:', error);
    }
  };

  return {
    userName,
    isLoading,
    saveUserName,
    clearUserName,
  };
};