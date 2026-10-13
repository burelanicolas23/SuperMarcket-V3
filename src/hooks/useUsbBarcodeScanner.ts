import { useEffect, useRef } from 'react';
import { BarcodeScannerService } from '../services/barcodeScannerService';

interface UseUsbBarcodeScannerOptions {
  onScan: (code: string) => void;
  enabled?: boolean;
  minChars?: number;
  maxIntervalMs?: number;
}

/**
 * Hook to listen for USB barcode scanner keystrokes across the window.
 * USB scanners act as very fast keyboard inputs ending with 'Enter'.
 */
export function useUsbBarcodeScanner({
  onScan,
  enabled = true,
  minChars = 4,
  maxIntervalMs = 50,
}: UseUsbBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // When Enter is pressed, check if buffer contains a scanned barcode
      if (e.key === 'Enter') {
        const candidate = bufferRef.current.trim();
        bufferRef.current = '';

        if (candidate.length >= minChars) {
          // If rapid burst, treat as barcode scanner input
          if (interval <= maxIntervalMs * 4) {
            // Check target element: if target is not a textarea or if it is a scanner target
            if (!BarcodeScannerService.isDuplicateScan(candidate)) {
              onScan(candidate);
            }
          }
        }
        return;
      }

      // If interval between keys was too long (> 120ms), it's manual human typing, reset buffer
      if (interval > 120) {
        bufferRef.current = '';
      }

      // Only accumulate printable single characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onScan, minChars, maxIntervalMs]);
}
