import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { Upload, Loader2, ExternalLink, Wallet, CheckCircle2, Sparkles } from 'lucide-react';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, percentAmount, createGenericFileFromBrowserFile } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';

function App() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [nftName, setNftName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFile = useCallback((file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleMint = async () => {
    if (!wallet.connected) {
      alert('Please connect your wallet first.');
      return;
    }
    if (!nftName || !selectedFile) return;

    setIsLoading(true);
    setIsSuccess(false);
    setTxSignature(null);

    try {
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(wallet))
        .use(mplTokenMetadata())
        .use(irysUploader()); 

      console.log('Uploading image...');
      const genericFile = await createGenericFileFromBrowserFile(selectedFile);
      const [imageUri] = await umi.uploader.upload([genericFile]);

      console.log('Uploading metadata...');
      const uri = await umi.uploader.uploadJson({
        name: nftName,
        description,
        image: imageUri, 
      });

      console.log('Minting...');
      const mint = generateSigner(umi);
      
      const { signature } = await createNft(umi, {
        mint,
        name: nftName,
        uri,
        sellerFeeBasisPoints: percentAmount(0), 
      }).sendAndConfirm(umi);

      const signatureString = base58.deserialize(signature)[0];
      setTxSignature(signatureString);
      setIsSuccess(true);
      console.log('Transaction Signature:', signatureString);

    } catch (error) {
      console.error('Minting failed:', error);
      alert('Error minting NFT. Check the console.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNftName('');
    setDescription('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsSuccess(false);
    setTxSignature(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isFormValid = nftName.trim() !== '' && selectedFile !== null;

  return (
    <div className="min-h-screen bg-deep-space-900 relative overflow-hidden">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="orb-1 absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/20 rounded-full blur-3xl" />
        <div className="orb-2 absolute top-1/2 right-1/4 w-80 h-80 bg-neon-purple/20 rounded-full blur-3xl" />
        <div className="orb-3 absolute bottom-1/4 left-1/3 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          <div className="flex items-center gap-2">
            <div className="relative">
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple blur-md opacity-40 group-hover:opacity-75 transition-opacity" />
            <div className="relative relative z-10">
               
               <WalletMultiButton style={{
                 backgroundColor: '#0f172a',
                 border: '1px solid rgba(0, 245, 255, 0.2)',
                 borderRadius: '0.75rem',
                 height: '44px',
                 fontFamily: 'inherit',
               }} />
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 px-6 py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-lg">
          <div className="glass-panel p-8 animate-fade-in-up border border-white/10 shadow-[0_8px_32px_0_rgba(0,245,255,0.1)] bg-black/40 backdrop-blur-2xl rounded-3xl">
            
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Mint Your Own Token
              </h1>
              <p className="text-gray-400">
                Create your unique NFT on the Solana blockchain
              </p>
            </div>

            <div className="mb-6">
              <label className="text-sm text-gray-400 block mb-3">Upload Artwork</label>
              <div
                className={`
                  border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer
                  ${isDragActive ? 'border-neon-cyan bg-neon-cyan/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
                  ${previewUrl ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
                `}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-xl mx-auto mb-3 ring-2 ring-emerald-500/30"
                    />
                    <div className="absolute -bottom-1 right-1/2 translate-x-12 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm text-gray-300">
                      {selectedFile?.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-white/5 flex items-center justify-center transition-colors">
                      <Upload className={`w-8 h-8 ${isDragActive ? 'text-neon-cyan' : 'text-gray-400'}`} />
                    </div>
                    <p className="text-gray-300 mb-1">
                      {isDragActive ? 'Drop your file here' : 'Drag & drop your artwork'}
                    </p>
                    <p className="text-sm text-gray-500">
                      or click to browse (PNG, JPG, GIF)
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-sm text-gray-400 block mb-2">NFT Name *</label>
              <input
                type="text"
                value={nftName}
                onChange={(e) => setNftName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 transition-all"
              />
            </div>
            <div className="mb-8">
              <label className="text-sm text-gray-400 block mb-2">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 transition-all resize-none"
              />
            </div>

            <button
              onClick={handleMint}
              disabled={!isFormValid || isLoading || !wallet.connected}
              className="w-full relative group flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan to-neon-purple opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing Transaction...</span>
                  </>
                ) : (
                  <>
                    <span>Sign & Mint</span>
                  </>
                )}
              </div>
            </button>

            {isSuccess && txSignature && (
              <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-in-up">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">Mint Successful!</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Your Token has been created on Solana.
                    </p>
                    <a
                      href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors group"
                    >
                      <span>View on Explorer</span>
                      <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  </div>
                </div>

                <button
                  onClick={resetForm}
                  className="w-full mt-4 py-2.5 px-4 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
                >
                  Mint Another Token
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;