import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/app-context';
import { colors, radius, spacing } from '../lib/theme';
import { runCascade } from '../lib/cascade';

export default function CameraScreen() {
  const { t } = useApp();
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const lockRef = useRef(false);

  // Reset capture state whenever we return to this screen (e.g. after "retake").
  useFocusEffect(
    useCallback(() => {
      lockRef.current = false;
      setBusy(false);
    }, [])
  );

  const analyze = useCallback(
    async (barcode?: string) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setBusy(true);
      try {
        const photo = await cameraRef.current?.takePictureAsync({
          base64: true,
          quality: 0.5,
          skipProcessing: true,
        });
        const result = await runCascade({ barcode, base64: photo?.base64 ?? undefined });
        router.push({ pathname: '/result', params: { data: JSON.stringify(result) } });
      } catch {
        lockRef.current = false;
        setBusy(false);
        Alert.alert(t('app.title'), t('result.error'));
      }
    },
    [router, t]
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.dim}>{t('camera.requesting')}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="camera-outline" size={48} color={colors.textDim} />
        <Text style={styles.dim}>{t('camera.denied')}</Text>
        <Pressable style={styles.grant} onPress={requestPermission}>
          <Text style={styles.grantText}>{t('camera.grant')}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.cancel}>{t('camera.cancel')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView
        ref={cameraRef}
        style={styles.fill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'],
        }}
        onBarcodeScanned={busy ? undefined : ({ data }) => analyze(data)}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.reticle} />

        <View style={styles.bottomBar}>
          {busy ? (
            <View style={styles.analyzing}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.analyzingText}>{t('camera.analyzing')}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.hint}>{t('camera.hint')}</Text>
              <Pressable style={styles.shutter} onPress={() => analyze()}>
                <View style={styles.shutterInner} />
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: spacing.md,
    padding: spacing.lg,
  },
  dim: { color: colors.textDim, textAlign: 'center' },
  grant: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  grantText: { color: colors.accentText, fontWeight: '700' },
  cancel: { color: colors.textDim, marginTop: spacing.sm },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.md },
  iconBtn: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: radius.lg,
  },
  bottomBar: { alignItems: 'center', paddingBottom: spacing.xl, gap: spacing.md },
  hint: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    fontSize: 13,
  },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  analyzing: { alignItems: 'center', gap: spacing.sm },
  analyzingText: { color: '#fff', fontSize: 15 },
});
