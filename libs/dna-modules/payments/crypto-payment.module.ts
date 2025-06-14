import { z } from 'zod';
import { BaseDNAModule, DNAModuleMetadata, ConfigurationSchema, FrameworkImplementation } from '../../core/src/lib/dna-module';

const CryptoConfigSchema = z.object({
  supportedTokens: z.array(z.string()).default(['ETH', 'BTC', 'USDC']),
  networks: z.array(z.string()).default(['ethereum', 'bitcoin']),
  walletConnect: z.boolean().default(true),
  metamask: z.boolean().default(true),
  confirmations: z.number().default(3)
});

type CryptoConfig = z.infer<typeof CryptoConfigSchema>;

export class CryptoPaymentModule extends BaseDNAModule<CryptoConfig> {
  metadata: DNAModuleMetadata = {
    id: 'payments-crypto',
    name: 'Cryptocurrency Payments',
    description: 'Bitcoin, Ethereum and multi-chain cryptocurrency payment integration',
    version: '1.0.0',
    category: 'payments',
    tags: ['crypto', 'bitcoin', 'ethereum', 'web3'],
    author: 'DNA System',
    dependencies: [],
    conflicts: [],
    frameworks: ['nextjs', 'react-native'],
    maturityLevel: 'beta'
  };

  configurationSchema: ConfigurationSchema<CryptoConfig> = {
    schema: CryptoConfigSchema,
    defaultConfig: {
      supportedTokens: ['ETH', 'BTC', 'USDC'],
      networks: ['ethereum', 'bitcoin'],
      walletConnect: true,
      metamask: true,
      confirmations: 3
    }
  };

  frameworkImplementations: Record<string, FrameworkImplementation> = {
    nextjs: {
      dependencies: {
        'ethers': '^6.0.0',
        '@walletconnect/web3-provider': '^1.8.0',
        'bitcoinjs-lib': '^6.1.0'
      },
      devDependencies: {},
      files: [
        {
          path: 'lib/crypto-wallet.ts',
          content: () => this.generateCryptoWallet()
        },
        {
          path: 'components/CryptoPayment.tsx',
          content: () => this.generateCryptoPayment()
        }
      ]
    }
  };

  private generateCryptoWallet(): string {
    return `
import { ethers } from 'ethers';
import WalletConnectProvider from '@walletconnect/web3-provider';

export class CryptoWallet {
  private provider: any;
  private signer: any;

  async connectMetaMask() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      await this.provider.send('eth_requestAccounts', []);
      this.signer = await this.provider.getSigner();
      return await this.signer.getAddress();
    }
    throw new Error('MetaMask not available');
  }

  async connectWalletConnect() {
    const provider = new WalletConnectProvider({
      infuraId: process.env.NEXT_PUBLIC_INFURA_ID
    });
    
    await provider.enable();
    this.provider = new ethers.BrowserProvider(provider);
    this.signer = await this.provider.getSigner();
    return await this.signer.getAddress();
  }

  async sendETH(to: string, amount: string) {
    if (!this.signer) throw new Error('Wallet not connected');
    
    const tx = await this.signer.sendTransaction({
      to,
      value: ethers.parseEther(amount)
    });
    
    return tx.hash;
  }

  async sendERC20Token(tokenAddress: string, to: string, amount: string) {
    if (!this.signer) throw new Error('Wallet not connected');
    
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      this.signer
    );
    
    const tx = await tokenContract.transfer(to, ethers.parseUnits(amount, 18));
    return tx.hash;
  }

  async getBalance(address?: string): Promise<string> {
    if (!this.provider) throw new Error('Provider not available');
    
    const addr = address || await this.signer.getAddress();
    const balance = await this.provider.getBalance(addr);
    return ethers.formatEther(balance);
  }
}
`;
  }

  private generateCryptoPayment(): string {
    return `
import { useState, useEffect } from 'react';
import { CryptoWallet } from '../lib/crypto-wallet';

interface CryptoPaymentProps {
  amount: string;
  currency: 'ETH' | 'BTC' | 'USDC';
  recipientAddress: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

export default function CryptoPayment({ 
  amount, 
  currency, 
  recipientAddress, 
  onSuccess, 
  onError 
}: CryptoPaymentProps) {
  const [wallet] = useState(new CryptoWallet());
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  const connectWallet = async (method: 'metamask' | 'walletconnect') => {
    try {
      const addr = method === 'metamask' 
        ? await wallet.connectMetaMask()
        : await wallet.connectWalletConnect();
      
      setAddress(addr);
      setConnected(true);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  const sendPayment = async () => {
    if (!connected) return;
    
    setProcessing(true);
    try {
      let txHash: string;
      
      if (currency === 'ETH') {
        txHash = await wallet.sendETH(recipientAddress, amount);
      } else if (currency === 'USDC') {
        // USDC contract address on mainnet
        const usdcAddress = '0xA0b86a33E6e95c2C3F93D6d5E8F8E0F8E8F8F8F8';
        txHash = await wallet.sendERC20Token(usdcAddress, recipientAddress, amount);
      } else {
        throw new Error('Bitcoin payments not yet implemented');
      }
      
      onSuccess?.(txHash);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!connected) {
    return (
      <div className="crypto-payment">
        <h3>Connect Wallet</h3>
        <button onClick={() => connectWallet('metamask')}>
          Connect MetaMask
        </button>
        <button onClick={() => connectWallet('walletconnect')}>
          Connect with WalletConnect
        </button>
      </div>
    );
  }

  return (
    <div className="crypto-payment">
      <h3>Pay with {currency}</h3>
      <p>Amount: {amount} {currency}</p>
      <p>To: {recipientAddress}</p>
      <p>From: {address}</p>
      
      <button 
        onClick={sendPayment} 
        disabled={processing}
      >
        {processing ? 'Processing...' : \`Send \${amount} \${currency}\`}
      </button>
    </div>
  );
}
`;
  }
}