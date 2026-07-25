import { Pressable, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme';

export default function PrimaryButton({ label, icon, onPress, variant = 'primary', disabled }) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={isPrimary ? colors.onPrimary : colors.onSurface}
        />
      ) : null}
      <Text style={[typography.buttonText, isPrimary ? styles.primaryText : styles.secondaryText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    height: spacing.touchTargetMin + 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.outline,
    borderRadius: 8,
  },
  primaryText: {
    color: colors.onPrimary,
  },
  secondaryText: {
    color: colors.onSurface,
  },
});
