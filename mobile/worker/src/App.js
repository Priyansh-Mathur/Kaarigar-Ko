import { Ionicons } from '@expo/vector-icons';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './auth';
import { colors } from './theme';
import { Loading } from './ui';
import StackNavigator from './navigation/stacknavigator';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.ink,
    border: colors.border,
    primary: colors.brand,
  },
};

function Root() {
  const { loading } = useAuth();
  if (loading) return <Loading />;
  return (
    <NavigationContainer theme={navTheme}>
      <StackNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  // Icon font is embedded natively (android/app/src/main/assets/fonts/ionicons.ttf).
  // Kick off a background load too, but never block the UI on it.
  useFonts(Ionicons.font);
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
