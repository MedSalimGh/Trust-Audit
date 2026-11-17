import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import {
  REGISTRY_ADDRESS,
  REGISTRY_ABI,
  CERTIFICATE_ADDRESS,
  CERTIFICATE_ABI,
  CHAIN_ID,
  CHAIN_ID_HEX,
  DEMO_ROLES,
  KNOWN_ROLE_MAP,
} from '../config/contracts';
import {
  requestNonce,
  verifySignature,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from '../lib/api-client';
import type { AuthTokenResponse } from '../types';

export interface WalletContextType {
  // Wallet state
  account: string | null;
  balance: string;
  chainId: number | null;
  isCorrectNetwork: boolean;
  activeRole: string;
  assignedRoles: string[];
  isConnecting: boolean;
  error: string | null;

  // Authentication state (SIWE -> JWT)
  token: string | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  tokenExpiresAt: number | null;

  // Modal controls
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;

  // Actions
  connectWallet: () => Promise<string | null>;
  loginWithSignature: () => Promise<boolean>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
  setActiveRole: (role: string) => void;
  switchDemoRole: (roleName: string) => Promise<void>;

  // Contract instances
  getRegistryContract: () => ethers.Contract | null;
  getCertificateContract: () => ethers.Contract | null;
}

const WalletContext = createContext<WalletContextType>({} as WalletContextType);

// Helper to decode JWT exp without full library
function decodeJwtExpiry(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function decodeJwtWallet(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.sub === 'string' ? payload.sub.toLowerCase() : null;
  } catch {
    return null;
  }
}

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0.00');
  const [chainId, setChainId] = useState<number | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(true);
  const [activeRole, setActiveRole] = useState<string>('OPERATOR');
  const [assignedRoles, setAssignedRoles] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Auth states
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const tokenExpiresAt = useMemo(() => decodeJwtExpiry(token), [token]);

  // Authenticated is true ONLY if token exists, is not expired, AND matches current account
  const isAuthenticated = useMemo(() => {
    if (!token || !account) return false;
    const exp = decodeJwtExpiry(token);
    if (!exp || exp <= Date.now()) return false;
    const tokenSub = decodeJwtWallet(token);
    if (tokenSub && tokenSub !== account.toLowerCase()) return false;
    return true;
  }, [token, account]);

  const checkNetwork = useCallback(async (networkChainId: number) => {
    const valid = networkChainId === CHAIN_ID;
    setIsCorrectNetwork(valid);
    setChainId(networkChainId);
    if (!valid) {
      setError(`Wrong Network (Connected: ${networkChainId}). Please switch to Ganache Local (Chain ID: ${CHAIN_ID}).`);
    } else {
      setError(null);
    }
    return valid;
  }, []);

  const loadContractRoles = useCallback(async (address: string, _provider?: ethers.BrowserProvider) => {
    const directRpc = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const lower = address.toLowerCase();
    const knownRole = KNOWN_ROLE_MAP[lower];

    try {
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, directRpc);
      const rolesToCheck = [
        { name: 'ADMIN', roleHash: await registry.DEFAULT_ADMIN_ROLE() },
        { name: 'OPERATOR', roleHash: await registry.OPERATOR_ROLE() },
        { name: 'COMPLIANCE', roleHash: await registry.COMPLIANCE_ROLE() },
        { name: 'RISK_MANAGER', roleHash: await registry.RISK_MANAGER_ROLE() },
        { name: 'DIRECTOR', roleHash: await registry.DIRECTOR_ROLE() },
        { name: 'AUDITOR', roleHash: await registry.AUDITOR_ROLE() },
      ];

      const heldRoles: string[] = [];
      for (const r of rolesToCheck) {
        try {
          const has = await registry.hasRole(r.roleHash, address);
          if (has) heldRoles.push(r.name);
        } catch {
          // ignore individual check errors
        }
      }

      if (knownRole && !heldRoles.includes(knownRole)) {
        heldRoles.push(knownRole);
      }

      const finalRoles = heldRoles.length > 0 ? heldRoles : [knownRole || 'GUEST'];
      setAssignedRoles(finalRoles);

      // Auto-set the active persona based on the connected account
      if (knownRole && knownRole !== 'ADMIN') {
        setActiveRole(knownRole);
      } else if (knownRole === 'ADMIN') {
        setActiveRole((prev) => (finalRoles.includes(prev) ? prev : 'ADMIN'));
      } else {
        setActiveRole((prev) => (finalRoles.includes(prev) ? prev : finalRoles[0]));
      }
    } catch (e) {
      console.warn('Could not read contract roles directly:', e);
      if (knownRole) {
        const roles = knownRole === 'ADMIN'
          ? ['ADMIN', 'OPERATOR', 'COMPLIANCE', 'RISK_MANAGER', 'DIRECTOR', 'AUDITOR']
          : [knownRole];
        setAssignedRoles(roles);
        setActiveRole(knownRole);
      } else {
        setAssignedRoles(['OPERATOR', 'COMPLIANCE', 'RISK_MANAGER', 'DIRECTOR', 'AUDITOR']);
      }
    }
  }, []);

  const refreshAccountDetails = useCallback(async (userAddress: string) => {
    if (typeof (window as unknown as { ethereum?: unknown }).ethereum === 'undefined') return;
    try {
      const provider = new ethers.BrowserProvider(
        (window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum
      );
      const network = await provider.getNetwork();
      await checkNetwork(Number(network.chainId));
      const bal = await provider.getBalance(userAddress);
      setBalance(Number(ethers.formatEther(bal)).toFixed(4));
      await loadContractRoles(userAddress, provider);
    } catch (err) {
      console.error('Error refreshing account details:', err);
    }
  }, [checkNetwork, loadContractRoles]);

  // ─── SIWE Authentication ──────────────────────────────────────────────────
  const loginWithSignature = useCallback(async (): Promise<boolean> => {
    if (!account) {
      setAuthError('Please connect your MetaMask wallet first.');
      return false;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const targetChainId = chainId || CHAIN_ID;
      // 1. Request nonce from backend
      const { message } = await requestNonce(account, targetChainId);

      // 2. Request user signature in MetaMask
      const provider = new ethers.BrowserProvider(
        (window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum
      );
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      // 3. Verify signature on backend to get JWT
      const authResponse: AuthTokenResponse = await verifySignature(message, signature);

      // 4. Save token
      setStoredToken(authResponse.access_token);
      setToken(authResponse.access_token);
      setIsAuthenticating(false);
      setAuthError(null);
      setIsAuthModalOpen(false);

      // Dispatch custom event for query refetches or listeners
      window.dispatchEvent(new CustomEvent('trustaudit:authenticated', { detail: authResponse }));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signature authorization failed';
      const isRejection =
        msg.includes('user rejected') ||
        msg.includes('User denied') ||
        msg.includes('ACTION_REJECTED');

      const cleanError = isRejection
        ? 'Signature request was rejected in MetaMask.'
        : msg;

      setAuthError(cleanError);
      setIsAuthenticating(false);
      return false;
    }
  }, [account, chainId]);

  // ─── Connect Wallet ───────────────────────────────────────────────────────
  const connectWallet = useCallback(async (): Promise<string | null> => {
    if (typeof (window as unknown as { ethereum?: unknown }).ethereum === 'undefined') {
      const err = 'MetaMask not detected! Please install MetaMask to interact with TrustAudit.';
      setError(err);
      return null;
    }

    try {
      setIsConnecting(true);
      setError(null);
      const provider = new ethers.BrowserProvider(
        (window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum
      );
      const accounts = await provider.send('eth_requestAccounts', []);

      if (accounts.length > 0) {
        const userAddress = accounts[0];
        setAccount(userAddress);
        await refreshAccountDetails(userAddress);
        setIsConnecting(false);
        return userAddress;
      }
      setIsConnecting(false);
      return null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect MetaMask';
      setError(msg);
      setIsConnecting(false);
      return null;
    }
  }, [refreshAccountDetails]);

  const disconnectWallet = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setAccount(null);
    setAssignedRoles([]);
    setActiveRole('OPERATOR');
    setError(null);
    setAuthError(null);
  }, []);

  const switchNetwork = useCallback(async () => {
    if (typeof (window as unknown as { ethereum?: unknown }).ethereum === 'undefined') return;
    try {
      await (window as unknown as { ethereum: { request: (args: unknown) => Promise<unknown> } }).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_ID_HEX }],
      });
      setError(null);
      setIsCorrectNetwork(true);
    } catch (switchError: unknown) {
      const err = switchError as { code?: number };
      if (err?.code === 4902) {
        try {
          await (window as unknown as { ethereum: { request: (args: unknown) => Promise<unknown> } }).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: CHAIN_ID_HEX,
                chainName: 'Ganache Local EVM',
                rpcUrls: ['http://127.0.0.1:8545'],
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              },
            ],
          });
          setError(null);
          setIsCorrectNetwork(true);
        } catch (addError) {
          console.error(addError);
        }
      }
    }
  }, []);

  // Quick switch role (in demo mode)
  const switchDemoRole = useCallback(async (roleName: string) => {
    const key = roleName.toLowerCase().replace('_manager', 'Manager');
    const targetAddr = (DEMO_ROLES as Record<string, string>)[key] || (DEMO_ROLES as Record<string, string>)[roleName.toLowerCase()];
    if (targetAddr) {
      setActiveRole(roleName.toUpperCase());
    }
  }, []);

  // Initial account check on mount
  useEffect(() => {
    const checkInitialAccount = async () => {
      if (typeof (window as unknown as { ethereum?: unknown }).ethereum !== 'undefined') {
        try {
          const provider = new ethers.BrowserProvider(
            (window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum
          );
          const accounts = await provider.send('eth_accounts', []);
          if (accounts.length > 0) {
            const userAddress = accounts[0];
            setAccount(userAddress);
            await refreshAccountDetails(userAddress);
          }
        } catch (e) {
          console.warn('Initial account check warning:', e);
        }
      }
    };

    checkInitialAccount();

    const eth = (window as unknown as { ethereum?: { on: (event: string, cb: (...args: unknown[]) => void) => void; removeListener: (event: string, cb: (...args: unknown[]) => void) => void } }).ethereum;
    if (eth) {
      const handleAccounts = (accounts: unknown) => {
        const accList = accounts as string[];
        if (accList && accList.length > 0) {
          const newAddr = accList[0];
          setAccount(newAddr);
          // Invalidate stored token if address changed
          const curToken = getStoredToken();
          const sub = decodeJwtWallet(curToken);
          if (sub && sub !== newAddr.toLowerCase()) {
            clearStoredToken();
            setToken(null);
          }
          refreshAccountDetails(newAddr);
        } else {
          disconnectWallet();
        }
      };

      const handleChain = (chainHex: unknown) => {
        const id = parseInt(String(chainHex), 16);
        checkNetwork(id);
      };

      eth.on('accountsChanged', handleAccounts);
      eth.on('chainChanged', handleChain);

      return () => {
        eth.removeListener('accountsChanged', handleAccounts);
        eth.removeListener('chainChanged', handleChain);
      };
    }
  }, [checkNetwork, disconnectWallet, refreshAccountDetails]);

  const getRegistryContract = useCallback(() => {
    if (typeof (window as unknown as { ethereum?: unknown }).ethereum === 'undefined') return null;
    const provider = new ethers.BrowserProvider(
      (window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum
    );
    return new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
  }, []);

  const getCertificateContract = useCallback(() => {
    if (typeof (window as unknown as { ethereum?: unknown }).ethereum === 'undefined') return null;
    const provider = new ethers.BrowserProvider(
      (window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum
    );
    return new ethers.Contract(CERTIFICATE_ADDRESS, CERTIFICATE_ABI, provider);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        account,
        balance,
        chainId,
        isCorrectNetwork,
        activeRole,
        assignedRoles,
        isConnecting,
        error,

        token,
        isAuthenticated,
        isAuthenticating,
        authError,
        tokenExpiresAt,

        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,

        connectWallet,
        loginWithSignature,
        disconnectWallet,
        switchNetwork,
        setActiveRole,
        switchDemoRole,

        getRegistryContract,
        getCertificateContract,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
