/**
 * @fileoverview Cryptocurrency Payment Processing DNA Module - Epic 5 Story 3 AC3
 * Provides comprehensive crypto payment integration for Bitcoin, Ethereum, and stablecoins
 */

import { EventEmitter } from 'events';
import { BaseDNAModule } from '../../core/src/lib/dna-module';
import {
  DNAModuleMetadata,
  DNAModuleFile,
  DNAModuleContext,
  SupportedFramework,
  DNAModuleCategory,
  FrameworkSupport
} from '../../core/src/lib/types';

/**
 * Supported cryptocurrency types
 */
export enum CryptoCurrency {
  BITCOIN = 'BTC',
  ETHEREUM = 'ETH',
  LITECOIN = 'LTC',
  BITCOIN_CASH = 'BCH',
  DOGECOIN = 'DOGE',
  USDC = 'USDC',
  USDT = 'USDT',
  DAI = 'DAI',
  BUSD = 'BUSD'
}

/**
 * Blockchain networks
 */
export enum BlockchainNetwork {
  BITCOIN_MAINNET = 'bitcoin',
  BITCOIN_TESTNET = 'bitcoin-testnet',
  ETHEREUM_MAINNET = 'ethereum',
  ETHEREUM_GOERLI = 'ethereum-goerli',
  ETHEREUM_SEPOLIA = 'ethereum-sepolia',
  POLYGON = 'polygon',
  BSC = 'bsc',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism'
}

/**
 * Transaction status
 */
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

/**
 * Wallet provider types
 */
export enum WalletProvider {
  METAMASK = 'metamask',
  WALLETCONNECT = 'walletconnect',
  COINBASE_WALLET = 'coinbase',
  TRUST_WALLET = 'trust',
  PHANTOM = 'phantom',
  EXODUS = 'exodus'
}

/**
 * Crypto payment configuration
 */
export interface CryptoConfig {
  // Network settings
  networks: BlockchainNetwork[];
  defaultNetwork: BlockchainNetwork;
  
  // Supported currencies
  supportedCurrencies: CryptoCurrency[];
  
  // API keys and endpoints
  rpcEndpoints: Record<BlockchainNetwork, string>;
  apiKeys: {
    etherscan?: string;
    polygonscan?: string;
    bscscan?: string;
    coinmarketcap?: string;
    coingecko?: string;
  };
  
  // Wallet settings
  enabledWallets: WalletProvider[];
  walletConnectProjectId?: string;
  
  // Security settings
  confirmationBlocks: Record<BlockchainNetwork, number>;
  maxSlippage: number; // percentage
  gasSettings: {
    maxGasPrice: string; // in gwei
    gasMultiplier: number;
  };
  
  // Price feed settings
  priceUpdateInterval: number; // in seconds
  priceSource: 'coinmarketcap' | 'coingecko' | 'chainlink';
  
  // Transaction settings
  paymentTimeout: number; // in minutes
  enableInstantPayment: boolean;
  enableRecurringPayments: boolean;
  
  // Webhook settings
  webhookUrl?: string;
  webhookSecret?: string;
}

/**
 * Crypto payment request
 */
export interface CryptoPaymentRequest {
  amount: string; // in USD or fiat currency
  currency: CryptoCurrency;
  network: BlockchainNetwork;
  recipientAddress: string;
  description?: string;
  metadata?: Record<string, any>;
  expiryTime?: Date;
  confirmationBlocks?: number;
  callbackUrl?: string;
}

/**
 * Crypto payment result
 */
export interface CryptoPaymentResult {
  success: boolean;
  payment?: {
    id: string;
    paymentAddress: string;
    amount: string; // in crypto units
    amountUSD: string;
    currency: CryptoCurrency;
    network: BlockchainNetwork;
    qrCode: string;
    expiryTime: Date;
    status: TransactionStatus;
    txHash?: string;
    confirmations?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Wallet connection result
 */
export interface WalletConnectionResult {
  success: boolean;
  wallet?: {
    provider: WalletProvider;
    address: string;
    network: BlockchainNetwork;
    balance?: Record<CryptoCurrency, string>;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Transaction details
 */
export interface CryptoTransaction {
  id: string;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  currency: CryptoCurrency;
  network: BlockchainNetwork;
  status: TransactionStatus;
  confirmations: number;
  requiredConfirmations: number;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Price information
 */
export interface CryptoPrice {
  currency: CryptoCurrency;
  priceUSD: number;
  change24h: number;
  lastUpdated: Date;
  source: string;
}

/**
 * Cryptocurrency Module implementation
 */
export class CryptoModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'crypto-payments',
    name: 'Cryptocurrency Payment Processing Module',
    version: '1.0.0',
    description: 'Comprehensive cryptocurrency payment integration for Bitcoin, Ethereum, and stablecoins',
    category: DNAModuleCategory.PAYMENTS,
    tags: ['payments', 'cryptocurrency', 'bitcoin', 'ethereum', 'defi', 'web3'],
    compatibility: {
      frameworks: {
        [SupportedFramework.REACT_NATIVE]: FrameworkSupport.FULL,
        [SupportedFramework.FLUTTER]: FrameworkSupport.PARTIAL,
        [SupportedFramework.NEXTJS]: FrameworkSupport.FULL,
        [SupportedFramework.TAURI]: FrameworkSupport.FULL,
        [SupportedFramework.SVELTE_KIT]: FrameworkSupport.FULL
      },
      platforms: ['web', 'desktop'],
      minVersions: {
        node: '16.0.0',
        typescript: '4.8.0'
      }
    },
    dependencies: ['ethers', 'bitcoinjs-lib', 'qrcode', 'web3'],
    devDependencies: ['@types/qrcode'],
    peerDependencies: []
  };

  private config: CryptoConfig;
  private eventEmitter: EventEmitter;
  private priceCache: Map<CryptoCurrency, CryptoPrice> = new Map();
  private walletConnections: Map<WalletProvider, any> = new Map();

  constructor(config: CryptoConfig) {
    super();
    this.config = config;
    this.eventEmitter = new EventEmitter();
    
    this.validateConfig();
    this.initializePriceFeeds();
  }

  /**
   * Initialize price feeds
   */
  private async initializePriceFeeds(): Promise<void> {
    // Start price update interval
    setInterval(() => {
      this.updatePrices();
    }, this.config.priceUpdateInterval * 1000);
    
    // Initial price fetch
    await this.updatePrices();
  }

  /**
   * Update cryptocurrency prices
   */
  private async updatePrices(): Promise<void> {
    try {
      const currencies = this.config.supportedCurrencies.join(',');
      let priceData: any;

      if (this.config.priceSource === 'coinmarketcap' && this.config.apiKeys.coinmarketcap) {
        const response = await fetch(
          `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${currencies}`,
          {
            headers: {
              'X-CMC_PRO_API_KEY': this.config.apiKeys.coinmarketcap
            }
          }
        );
        priceData = await response.json();
      } else if (this.config.priceSource === 'coingecko') {
        const ids = this.getCoinGeckoIds(this.config.supportedCurrencies);
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        priceData = await response.json();
      }

      // Update price cache
      this.updatePriceCache(priceData);
      
      this.eventEmitter.emit('prices:updated', this.priceCache);
    } catch (error) {
      console.error('Failed to update crypto prices:', error);
    }
  }

  /**
   * Create cryptocurrency payment
   */
  public async createPayment(request: CryptoPaymentRequest): Promise<CryptoPaymentResult> {
    try {
      // Get current price
      const price = this.priceCache.get(request.currency);
      if (!price) {
        throw new Error(`Price not available for ${request.currency}`);
      }

      // Calculate crypto amount
      const amountUSD = parseFloat(request.amount);
      const cryptoAmount = (amountUSD / price.priceUSD).toString();
      
      // Generate payment address (in real implementation, use HD wallets)
      const paymentAddress = this.generatePaymentAddress(request.network, request.currency);
      
      // Generate QR code
      const qrCode = await this.generatePaymentQR(paymentAddress, cryptoAmount, request.currency);
      
      // Create payment record
      const paymentId = this.generatePaymentId();
      const expiryTime = request.expiryTime || new Date(Date.now() + this.config.paymentTimeout * 60 * 1000);
      
      const payment = {
        id: paymentId,
        paymentAddress,
        amount: cryptoAmount,
        amountUSD: request.amount,
        currency: request.currency,
        network: request.network,
        qrCode,
        expiryTime,
        status: TransactionStatus.PENDING
      };

      // Start monitoring for payment
      this.monitorPayment(payment);
      
      this.eventEmitter.emit('payment:created', { payment, request });
      
      return {
        success: true,
        payment
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'CRYPTO_PAYMENT_FAILED',
          message: error.message || 'Failed to create crypto payment',
          details: error.details
        }
      };
    }
  }

  /**
   * Connect to wallet
   */
  public async connectWallet(provider: WalletProvider): Promise<WalletConnectionResult> {
    try {
      let wallet: any;

      switch (provider) {
        case WalletProvider.METAMASK:
          wallet = await this.connectMetaMask();
          break;
        case WalletProvider.WALLETCONNECT:
          wallet = await this.connectWalletConnect();
          break;
        case WalletProvider.COINBASE_WALLET:
          wallet = await this.connectCoinbaseWallet();
          break;
        default:
          throw new Error(`Unsupported wallet provider: ${provider}`);
      }

      this.walletConnections.set(provider, wallet);
      
      this.eventEmitter.emit('wallet:connected', { provider, wallet });
      
      return {
        success: true,
        wallet: {
          provider,
          address: wallet.address,
          network: wallet.network,
          balance: wallet.balance
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'WALLET_CONNECTION_FAILED',
          message: error.message || 'Failed to connect wallet'
        }
      };
    }
  }

  /**
   * Get transaction status
   */
  public async getTransactionStatus(txHash: string, network: BlockchainNetwork): Promise<CryptoTransaction | null> {
    try {
      let transaction: any;

      if (network.includes('ethereum') || network === BlockchainNetwork.POLYGON) {
        transaction = await this.getEthereumTransaction(txHash, network);
      } else if (network.includes('bitcoin')) {
        transaction = await this.getBitcoinTransaction(txHash, network);
      }

      if (!transaction) {
        return null;
      }

      const confirmations = await this.getConfirmations(txHash, network);
      const requiredConfirmations = this.config.confirmationBlocks[network];

      return {
        id: `tx_${txHash}`,
        txHash,
        fromAddress: transaction.from,
        toAddress: transaction.to,
        amount: transaction.value,
        currency: this.getCurrencyFromNetwork(network),
        network,
        status: confirmations >= requiredConfirmations ? TransactionStatus.CONFIRMED : TransactionStatus.PENDING,
        confirmations,
        requiredConfirmations,
        gasUsed: transaction.gasUsed,
        gasPrice: transaction.gasPrice,
        blockNumber: transaction.blockNumber,
        timestamp: new Date(transaction.timestamp * 1000)
      };
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      return null;
    }
  }

  /**
   * Get wallet balance
   */
  public async getWalletBalance(
    address: string, 
    currencies: CryptoCurrency[], 
    network: BlockchainNetwork
  ): Promise<Record<CryptoCurrency, string>> {
    const balances: Record<CryptoCurrency, string> = {} as any;

    try {
      for (const currency of currencies) {
        if (network.includes('ethereum') || network === BlockchainNetwork.POLYGON) {
          balances[currency] = await this.getEthereumBalance(address, currency, network);
        } else if (network.includes('bitcoin')) {
          balances[currency] = await this.getBitcoinBalance(address, network);
        }
      }

      return balances;
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      return balances;
    }
  }

  /**
   * Validate cryptocurrency address
   */
  public validateAddress(address: string, currency: CryptoCurrency, network: BlockchainNetwork): boolean {
    try {
      if (currency === CryptoCurrency.BITCOIN) {
        return this.validateBitcoinAddress(address, network);
      } else if ([CryptoCurrency.ETHEREUM, CryptoCurrency.USDC, CryptoCurrency.USDT, CryptoCurrency.DAI].includes(currency)) {
        return this.validateEthereumAddress(address);
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate payment address (mock implementation)
   */
  private generatePaymentAddress(network: BlockchainNetwork, currency: CryptoCurrency): string {
    // In real implementation, use HD wallets to generate unique addresses
    if (network.includes('bitcoin')) {
      return `bc1mock${Math.random().toString(36).substr(2, 20)}`;
    } else {
      return `0x${Math.random().toString(16).substr(2, 40)}`;
    }
  }

  /**
   * Generate payment QR code
   */
  private async generatePaymentQR(address: string, amount: string, currency: CryptoCurrency): Promise<string> {
    // In real implementation, use qrcode library
    const qrData = `${currency.toLowerCase()}:${address}?amount=${amount}`;
    return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="10" y="20" font-size="8">${qrData}</text></svg>`).toString('base64')}`;
  }

  /**
   * Generate unique payment ID
   */
  private generatePaymentId(): string {
    return `crypto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Monitor payment for confirmations
   */
  private async monitorPayment(payment: any): Promise<void> {
    // In real implementation, set up blockchain monitoring
    setTimeout(() => {
      // Simulate payment confirmation
      payment.status = TransactionStatus.CONFIRMED;
      payment.txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      payment.confirmations = this.config.confirmationBlocks[payment.network];
      
      this.eventEmitter.emit('payment:confirmed', payment);
    }, 30000); // 30 seconds for demo
  }

  /**
   * Connect MetaMask wallet (mock implementation)
   */
  private async connectMetaMask(): Promise<any> {
    // In real implementation, use ethereum provider
    return {
      address: '0x' + Math.random().toString(16).substr(2, 40),
      network: BlockchainNetwork.ETHEREUM_MAINNET,
      balance: {
        [CryptoCurrency.ETHEREUM]: '1.5',
        [CryptoCurrency.USDC]: '1000.0'
      }
    };
  }

  /**
   * Connect WalletConnect (mock implementation)
   */
  private async connectWalletConnect(): Promise<any> {
    // In real implementation, use WalletConnect SDK
    return {
      address: '0x' + Math.random().toString(16).substr(2, 40),
      network: BlockchainNetwork.ETHEREUM_MAINNET,
      balance: {}
    };
  }

  /**
   * Connect Coinbase Wallet (mock implementation)
   */
  private async connectCoinbaseWallet(): Promise<any> {
    // In real implementation, use Coinbase Wallet SDK
    return {
      address: '0x' + Math.random().toString(16).substr(2, 40),
      network: BlockchainNetwork.ETHEREUM_MAINNET,
      balance: {}
    };
  }

  /**
   * Get Ethereum transaction (mock implementation)
   */
  private async getEthereumTransaction(txHash: string, network: BlockchainNetwork): Promise<any> {
    // In real implementation, use ethers.js or web3.js
    return {
      from: '0x' + Math.random().toString(16).substr(2, 40),
      to: '0x' + Math.random().toString(16).substr(2, 40),
      value: '1000000000000000000', // 1 ETH in wei
      gasUsed: '21000',
      gasPrice: '20000000000', // 20 gwei
      blockNumber: 18000000,
      timestamp: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Get Bitcoin transaction (mock implementation)
   */
  private async getBitcoinTransaction(txHash: string, network: BlockchainNetwork): Promise<any> {
    // In real implementation, use Bitcoin API
    return {
      from: 'bc1mock' + Math.random().toString(36).substr(2, 20),
      to: 'bc1mock' + Math.random().toString(36).substr(2, 20),
      value: '100000000', // 1 BTC in satoshis
      blockNumber: 800000,
      timestamp: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Get confirmations (mock implementation)
   */
  private async getConfirmations(txHash: string, network: BlockchainNetwork): Promise<number> {
    // In real implementation, calculate from current block height
    return Math.floor(Math.random() * 10) + 1;
  }

  /**
   * Get Ethereum balance (mock implementation)
   */
  private async getEthereumBalance(address: string, currency: CryptoCurrency, network: BlockchainNetwork): Promise<string> {
    // In real implementation, use ethers.js or web3.js
    return (Math.random() * 10).toFixed(6);
  }

  /**
   * Get Bitcoin balance (mock implementation)
   */
  private async getBitcoinBalance(address: string, network: BlockchainNetwork): Promise<string> {
    // In real implementation, use Bitcoin API
    return (Math.random() * 5).toFixed(8);
  }

  /**
   * Validate Bitcoin address (mock implementation)
   */
  private validateBitcoinAddress(address: string, network: BlockchainNetwork): boolean {
    // In real implementation, use bitcoinjs-lib
    return address.startsWith('bc1') || address.startsWith('1') || address.startsWith('3');
  }

  /**
   * Validate Ethereum address (mock implementation)
   */
  private validateEthereumAddress(address: string): boolean {
    // In real implementation, use ethers.js
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get CoinGecko IDs for currencies
   */
  private getCoinGeckoIds(currencies: CryptoCurrency[]): string {
    const idMap: Record<CryptoCurrency, string> = {
      [CryptoCurrency.BITCOIN]: 'bitcoin',
      [CryptoCurrency.ETHEREUM]: 'ethereum',
      [CryptoCurrency.LITECOIN]: 'litecoin',
      [CryptoCurrency.BITCOIN_CASH]: 'bitcoin-cash',
      [CryptoCurrency.DOGECOIN]: 'dogecoin',
      [CryptoCurrency.USDC]: 'usd-coin',
      [CryptoCurrency.USDT]: 'tether',
      [CryptoCurrency.DAI]: 'dai',
      [CryptoCurrency.BUSD]: 'binance-usd'
    };

    return currencies.map(currency => idMap[currency]).join(',');
  }

  /**
   * Get currency from network
   */
  private getCurrencyFromNetwork(network: BlockchainNetwork): CryptoCurrency {
    if (network.includes('bitcoin')) {
      return CryptoCurrency.BITCOIN;
    } else if (network.includes('ethereum')) {
      return CryptoCurrency.ETHEREUM;
    }
    return CryptoCurrency.ETHEREUM; // default
  }

  /**
   * Update price cache from API response
   */
  private updatePriceCache(priceData: any): void {
    // Implementation depends on price source format
    for (const currency of this.config.supportedCurrencies) {
      this.priceCache.set(currency, {
        currency,
        priceUSD: Math.random() * 1000, // Mock price
        change24h: (Math.random() - 0.5) * 20,
        lastUpdated: new Date(),
        source: this.config.priceSource
      });
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.networks.length) {
      throw new Error('At least one blockchain network must be configured');
    }
    if (!this.config.supportedCurrencies.length) {
      throw new Error('At least one cryptocurrency must be supported');
    }
    if (!this.config.rpcEndpoints[this.config.defaultNetwork]) {
      throw new Error('RPC endpoint must be configured for default network');
    }
  }

  /**
   * Get generated files for the Crypto module
   */
  public async getFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Core crypto types
    files.push({
      path: 'src/lib/payments/crypto/types.ts',
      content: this.generateCryptoTypes(),
      type: 'typescript'
    });

    // Crypto service
    files.push({
      path: 'src/lib/payments/crypto/service.ts',
      content: this.generateCryptoService(context),
      type: 'typescript'
    });

    // Wallet connector
    files.push({
      path: 'src/lib/payments/crypto/wallet.ts',
      content: this.generateWalletConnector(context),
      type: 'typescript'
    });

    // Price feeds
    files.push({
      path: 'src/lib/payments/crypto/price-feeds.ts',
      content: this.generatePriceFeeds(context),
      type: 'typescript'
    });

    // Framework-specific implementations
    if (context.framework === SupportedFramework.NEXTJS) {
      files.push(...this.getNextJSFiles());
    } else if (context.framework === SupportedFramework.REACT_NATIVE) {
      files.push(...this.getReactNativeFiles());
    }

    return files;
  }

  /**
   * Generate crypto types file
   */
  private generateCryptoTypes(): string {
    return `// Generated Crypto types - Epic 5 Story 3 AC3
export * from './types/crypto-types';
export * from './types/wallet-types';
export * from './types/transaction-types';
`;
  }

  /**
   * Generate crypto service file
   */
  private generateCryptoService(context: DNAModuleContext): string {
    return `// Generated Crypto Service - Epic 5 Story 3 AC3
import { CryptoModule } from './crypto-module';
import { ${context.framework === SupportedFramework.NEXTJS ? 'NextJS' : 'Default'}CryptoConfig } from './config';

export class CryptoService extends CryptoModule {
  constructor() {
    super(${context.framework === SupportedFramework.NEXTJS ? 'NextJS' : 'Default'}CryptoConfig);
  }
}
`;
  }

  /**
   * Generate wallet connector file
   */
  private generateWalletConnector(context: DNAModuleContext): string {
    return `// Generated Wallet Connector - Epic 5 Story 3 AC3
export class WalletConnector {
  // Wallet connection implementation for ${context.framework}
}
`;
  }

  /**
   * Generate price feeds file
   */
  private generatePriceFeeds(context: DNAModuleContext): string {
    return `// Generated Price Feeds - Epic 5 Story 3 AC3
export class CryptoPriceFeeds {
  // Price feed implementation for ${context.framework}
}
`;
  }

  /**
   * Get Next.js specific files
   */
  private getNextJSFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/components/CryptoPayment.tsx',
        content: `// Next.js Crypto Payment Component
import React from 'react';

export const CryptoPayment: React.FC = () => {
  return <div>{/* Crypto payment UI */}</div>;
};
`,
        type: 'typescript'
      },
      {
        path: 'src/pages/api/crypto/webhook.ts',
        content: `// Next.js Crypto Webhook API
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Crypto webhook processing
}
`,
        type: 'typescript'
      }
    ];
  }

  /**
   * Get React Native specific files
   */
  private getReactNativeFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/components/WalletConnect.tsx',
        content: `// React Native Wallet Connect Component
import React from 'react';
import { View } from 'react-native';

export const WalletConnect: React.FC = () => {
  return <View>{/* Wallet connection UI */}</View>;
};
`,
        type: 'typescript'
      }
    ];
  }

  /**
   * Event emitter for crypto events
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  public emit(event: string, ...args: any[]): boolean {
    return this.eventEmitter.emit(event, ...args);
  }
}

/**
 * Default crypto configuration
 */
export const defaultCryptoConfig: CryptoConfig = {
  networks: [BlockchainNetwork.ETHEREUM_MAINNET, BlockchainNetwork.BITCOIN_MAINNET],
  defaultNetwork: BlockchainNetwork.ETHEREUM_MAINNET,
  supportedCurrencies: [
    CryptoCurrency.BITCOIN,
    CryptoCurrency.ETHEREUM,
    CryptoCurrency.USDC,
    CryptoCurrency.USDT
  ],
  rpcEndpoints: {
    [BlockchainNetwork.ETHEREUM_MAINNET]: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
    [BlockchainNetwork.BITCOIN_MAINNET]: 'https://blockstream.info/api',
    [BlockchainNetwork.ETHEREUM_GOERLI]: 'https://goerli.infura.io/v3/YOUR_PROJECT_ID',
    [BlockchainNetwork.BITCOIN_TESTNET]: 'https://blockstream.info/testnet/api',
    [BlockchainNetwork.ETHEREUM_SEPOLIA]: 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
    [BlockchainNetwork.POLYGON]: 'https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID',
    [BlockchainNetwork.BSC]: 'https://bsc-dataseed.binance.org',
    [BlockchainNetwork.ARBITRUM]: 'https://arb1.arbitrum.io/rpc',
    [BlockchainNetwork.OPTIMISM]: 'https://mainnet.optimism.io'
  },
  apiKeys: {},
  enabledWallets: [WalletProvider.METAMASK, WalletProvider.WALLETCONNECT],
  confirmationBlocks: {
    [BlockchainNetwork.ETHEREUM_MAINNET]: 12,
    [BlockchainNetwork.BITCOIN_MAINNET]: 6,
    [BlockchainNetwork.ETHEREUM_GOERLI]: 6,
    [BlockchainNetwork.BITCOIN_TESTNET]: 3,
    [BlockchainNetwork.ETHEREUM_SEPOLIA]: 6,
    [BlockchainNetwork.POLYGON]: 20,
    [BlockchainNetwork.BSC]: 15,
    [BlockchainNetwork.ARBITRUM]: 1,
    [BlockchainNetwork.OPTIMISM]: 1
  },
  maxSlippage: 3,
  gasSettings: {
    maxGasPrice: '100',
    gasMultiplier: 1.1
  },
  priceUpdateInterval: 60,
  priceSource: 'coingecko',
  paymentTimeout: 30,
  enableInstantPayment: false,
  enableRecurringPayments: false
};

export default CryptoModule;