import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, percentAmount, createGenericFileFromBrowserFile } from '@metaplex-foundation/umi';

export default function App() {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.connected || !file) {
      alert('Please connect your wallet and upload an image.');
      return;
    }
    
    setIsMinting(true);

    try {
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(wallet))
        .use(mplTokenMetadata())
        .use(irysUploader()); 

      console.log('Uploading image to Arweave via Irys...');
      
      const genericFile = await createGenericFileFromBrowserFile(file);
      
      const [imageUri] = await umi.uploader.upload([genericFile]);

      console.log('Uploading metadata...');
      const uri = await umi.uploader.uploadJson({
        name,
        description,
        image: imageUri, 
      });

      console.log('Minting...');
      const mint = generateSigner(umi);
      
      const { signature } = await createNft(umi, {
        mint,
        name,
        uri,
        sellerFeeBasisPoints: percentAmount(0), 
      }).sendAndConfirm(umi);

      alert(`Mint successful! Check console for signature.`);
      console.log('Transaction Signature:', signature);

    } catch (error) {
      console.error('Minting failed:', error);
      alert('Error minting NFT. Check console.');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 relative">
      <div className="flex justify-end mb-12">
        <WalletMultiButton className="!bg-white/10 !backdrop-blur-md border border-white/20 !rounded-xl hover:!bg-white/20 transition-all" />
      </div>

      <form onSubmit={handleMint} className="max-w-md mx-auto backdrop-blur-2xl bg-white/5 p-8 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
        <h1 className="text-2xl font-semibold mb-6 text-center tracking-wide">Mint NFT</h1>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Asset</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 file:transition-all cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Genesis Token"
              className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your token..."
              rows={3}
              className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors resize-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={isMinting || !wallet.connected}
            className="w-full mt-2 bg-gradient-to-r from-cyan-500/80 to-blue-600/80 hover:from-cyan-400/90 hover:to-blue-500/90 disabled:opacity-50 disabled:cursor-not-allowed py-3.5 rounded-xl font-medium tracking-wide shadow-lg border border-white/10 transition-all"
          >
            {isMinting ? 'Processing Transaction...' : 'Sign & Mint'}
          </button>
        </div>
      </form>
    </div>
  );
}