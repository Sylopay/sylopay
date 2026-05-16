import React, { useState, useEffect } from 'react';
import { Monitor, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { requestAccess, getNetwork, isConnected } from '@stellar/freighter-api';

import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

interface WalletOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  type: string;
  available?: boolean;
  comingSoon?: boolean;
}

interface WalletConnectorProps {
  selectedPublicKey: string;
  onWalletSelect: (publicKey: string, walletType: string, walletName: string) => void;
  className?: string;
}

export default function WalletConnector({ 
  selectedPublicKey, 
  onWalletSelect, 
  className = '' 
}: WalletConnectorProps) {
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [freighterAvailable, setFreighterAvailable] = useState(false);

  // Check for Freighter availability
  useEffect(() => {
    const checkFreighter = async () => {
      try {
        const connected = await isConnected();
        setFreighterAvailable(true);
        
        if (connected) {
          try {
            const acess = await requestAccess()   ;
            const network = await getNetwork();
            
            if (acess.address && network.network === 'TESTNET') {
              onWalletSelect(acess.address, 'freighter', 'Freighter Wallet');
              setSelectedWallet('freighter');
            }
          } catch (error) {
            console.log('Error getting connected wallet info:', error);
          }
        }
      } catch (error) {
        console.log('Freighter not available');
        setFreighterAvailable(false);
      }
    };

    checkFreighter();
  }, []); // Only on mount

  const walletOptions: WalletOption[] = [
    {
      id: 'freighter',
      name: 'Freighter Wallet',
      description: 'Stellar browser extension',
      icon: <Monitor className="w-5 h-5" />,
      type: 'extension',
      available: freighterAvailable
    }
  ];

  const connectFreighter = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const result = await requestAccess();
      
      if (result.error) {
        throw new Error(result.error);
      }

      const publicKey = result.address;
      
      if (!publicKey) {
        throw new Error('No public key returned from Freighter');
      }

      const network = await getNetwork();
      if (network.network !== 'TESTNET') {
        throw new Error('Please switch Freighter to Stellar Testnet for this demo');
      }

      onWalletSelect(publicKey, 'freighter', 'Freighter Wallet');
      setSelectedWallet('freighter');
      
    } catch (error) {
      console.error('Freighter connection error:', error);
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect to Freighter');
    } finally {
      setIsConnecting(false);
    }
  };

  const isWalletSelected = (walletId: string) => {
    return selectedWallet === walletId;
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Connect Your Stellar Wallet</h3>
          <p className="text-muted-foreground text-sm">
            Choose how you'd like to connect your Stellar account for this BNPL contract
          </p>
        </div>

        {connectionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{connectionError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3">
          {walletOptions.map((wallet) => (
            <Card
              key={wallet.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isWalletSelected(wallet.id)
                  ? 'ring-2 ring-primary border-primary'
                  : wallet.available && !wallet.comingSoon
                    ? 'hover:border-primary/50' 
                    : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => {
                if (!wallet.available || wallet.comingSoon) return;
                if (wallet.id === 'freighter') {
                  connectFreighter();
                }
              }}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${isWalletSelected(wallet.id) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                      }
                    `}>
                      {isWalletSelected(wallet.id) ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        wallet.icon
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{wallet.name}</h4>
                        {wallet.id === 'freighter' && !wallet.available && (
                          <Badge variant="outline" className="text-xs">
                            Not Installed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {wallet.description}
                      </p>
                    </div>
                  </div>
                  
                  {wallet.id === 'freighter' && !wallet.available && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href="https://freighter.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Install
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Connected wallet info summary */}
        {selectedPublicKey && (
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-600">
                    Wallet Selected ({selectedWallet})
                  </p>
                  <p className="text-xs text-green-600/80 font-mono truncate">
                    {selectedPublicKey}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="border-green-500/30 text-green-600 hover:bg-green-500/10"
                >
                  <a
                    href={`https://stellar.expert/explorer/testnet/account/${selectedPublicKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isConnecting && (
          <div className="text-center py-4">
            <div className="inline-flex items-center space-x-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Connecting to wallet...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}