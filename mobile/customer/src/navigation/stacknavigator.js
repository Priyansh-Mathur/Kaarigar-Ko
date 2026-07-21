import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth';
import { colors } from '../theme';
import TabNavigator from './tabnavigator';
import LoginScreen from '../screens/LoginScreen';
import BookScreen from '../screens/BookScreen';
import BookingDetailScreen from '../screens/BookingDetailScreen';

const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="Book" component={BookScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
