import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-budget"
        options={{
          title: 'Mon Budget',
          tabBarIcon: ({ color }) => <MaterialIcons name="wallet" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-transaction"
        options={{
          title: 'Ajouter',
          tabBarIcon: ({ color }) => <MaterialIcons name="add-circle" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={28} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="category-management"
        options={{
          title: 'Catégories',
          tabBarIcon: ({ color }) => <MaterialIcons name="category" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}