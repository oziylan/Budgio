import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

export default function Index() {
  const [target, setTarget] = useState<"/(tabs)/home" | "/welcome-screen" | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('userName').then((userName) => {
      setTarget(userName ? "/(tabs)/home" : "/welcome-screen");
    });
  }, []);

  if (!target) return null;
  return <Redirect href={target} />;
}
