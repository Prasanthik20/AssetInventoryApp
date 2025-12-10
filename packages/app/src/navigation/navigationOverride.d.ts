import "@react-navigation/native-stack";

declare module "@react-navigation/native-stack" {
  interface NativeStackNavigatorProps {
    id?: never; // navigator should not require id
  }
}