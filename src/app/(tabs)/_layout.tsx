import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { IndicadorSync } from '@/components/ui';
import { cores } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoSuave,
        headerStyle: { backgroundColor: cores.fundo },
        headerTitleStyle: { color: cores.texto },
        headerShadowVisible: false,
        headerRight: () => <IndicadorSync />,
        sceneStyle: { backgroundColor: cores.fundo },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Despensa', tabBarIcon: ({ color, size }) => <Ionicons name="basket-outline" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="resumo"
        options={{ title: 'Resumo', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="detalhes"
        options={{ title: 'Detalhes', tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="conta"
        options={{ title: 'Conta', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}
