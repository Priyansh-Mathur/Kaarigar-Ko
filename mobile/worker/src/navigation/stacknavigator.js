import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth';
import { colors } from '../theme';
import TabNavigator from './tabnavigator';
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import JobDetailScreen from '../screens/JobDetailScreen';

const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : !user.workerProfile ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="JobDetail" component={JobDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
