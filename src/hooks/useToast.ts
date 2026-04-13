// Hook d'accès au système de toast global
import { useContext } from 'react';
import { ToastContext } from '@/components/ui/Toast';

/**
 * Retourne la fonction showToast du contexte global.
 * Doit être utilisé à l'intérieur d'un ToastProvider.
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast doit être utilisé dans un ToastProvider');
  }
  return context;
}
