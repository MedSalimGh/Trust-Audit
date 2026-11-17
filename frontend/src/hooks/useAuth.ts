/**
 * useAuth — Consumer hook accessing the unified SIWE & JWT authentication state
 * from WalletContext.
 */
import { useWallet } from '../context/WalletContext';

export function useAuth() {
  const {
    account,
    token,
    isAuthenticated,
    isAuthenticating,
    authError,
    tokenExpiresAt,
    assignedRoles,
    loginWithSignature,
    disconnectWallet,
    openAuthModal,
    closeAuthModal,
    isAuthModalOpen,
  } = useWallet();

  return {
    walletAddress: account,
    token,
    isAuthenticated,
    isAuthenticating,
    error: authError,
    roles: assignedRoles,
    tokenExpiresAt,
    authenticate: loginWithSignature,
    logout: disconnectWallet,
    openAuthModal,
    closeAuthModal,
    isAuthModalOpen,
  };
}
