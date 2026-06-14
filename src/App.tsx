import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { 
  Upload, Loader2, ExternalLink, CheckCircle2, Sparkles, 
  ChevronRight, ChevronLeft 
} from 'lucide-react';

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

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [nftName, setNftName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const simulateFileUpload = (file: File) => {
    setFileUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setFileUploading(false);
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type.startsWith('image/')) {
      simulateFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      simulateFileUpload(files[0]);
    }
  }, []);

  const handleMint = async () => {
    if (!wallet.connected) return;
    setIsLoading(true);

    try {
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(wallet))
        .use(mplTokenMetadata())
        .use(irysUploader()); 

      const genericFile = await createGenericFileFromBrowserFile(selectedFile!);
      const [imageUri] = await umi.uploader.upload([genericFile]);

      const uri = await umi.uploader.uploadJson({
        name: nftName,
        symbol: symbol.toUpperCase(),
        description,
        image: imageUri, 
      });

      const mint = generateSigner(umi);
      
      const { signature } = await createNft(umi, {
        mint,
        name: nftName,
        symbol: symbol.toUpperCase(),
        uri,
        sellerFeeBasisPoints: percentAmount(0), 
      }).sendAndConfirm(umi);

      const signatureString = base58.deserialize(signature)[0];
      setTxSignature(signatureString);
      setIsSuccess(true);

    } catch (error) {
      console.error('Minting failed:', error);
      alert('Error signing or confirming transaction. Check console.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNftName('');
    setSymbol('');
    setDescription('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsSuccess(false);
    setTxSignature(null);
    setCurrentStep(1);
  };

  const getStepValidationReason = () => {
    if (currentStep === 1 && !selectedFile) return "Please upload an artwork asset to proceed.";
    if (currentStep === 2) {
      if (!nftName.trim()) return "NFT Name is required.";
      if (nftName.length > 32) return "NFT Name cannot exceed 32 characters.";
      if (!symbol.trim()) return "Token Symbol/Ticker is required.";
      if (symbol.length > 10) return "Symbol cannot exceed 10 characters.";
    }
    if (currentStep === 3 && !wallet.connected) return "Connect your Solana wallet to execute the mint transaction.";
    return null;
  };

  const validationReason = getStepValidationReason();

  return (
    <div className="min-h-screen bg-deep-space-900 relative overflow-hidden text-slate-100 font-sans">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-gradient-to-br from-neon-cyan/20 to-transparent rounded-full blur-[120px] animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-gradient-to-tl from-neon-purple/20 to-transparent rounded-full blur-[120px] animate-pulse duration-[6000ms]" />
      </div>

      <nav className="relative z-10 px-8 py-5 border-b border-white/5 backdrop-blur-md bg-deep-space-900/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold tracking-wide uppercase">
              Solana Devnet
            </div>
            
            <div className="relative custom-wallet-btn">
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 px-6 py-16 flex items-center justify-center min-h-[calc(100vh-90px)]">
        <div className="w-full max-w-xl">
          
          <div className="mb-8 px-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-neon-cyan">
                Step {currentStep} of 3
              </span>
              <span className="text-sm text-slate-400 font-medium">
                {currentStep === 1 && "Asset Ingestion"}
                {currentStep === 2 && "Metadata Configuration"}
                {currentStep === 3 && "On-Chain Authorization"}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-all duration-500 ease-out"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,245,255,0.05)]">
            
            {!isSuccess ? (
              <div className="space-y-8">
                
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">Upload Digital Asset</h2>
                      <p className="text-sm text-slate-400">Provide the master artwork file for tokenization.</p>
                    </div>

                    <div
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative min-h-[240px] flex flex-col justify-center items-center
                        ${isDragActive ? 'border-neon-cyan bg-neon-cyan/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
                        ${previewUrl ? 'border-neon-cyan/40 bg-black/20' : ''}
                      `}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => !fileUploading && fileInputRef.current?.click()}
                    >
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

                      {fileUploading ? (
                        <div className="w-full max-w-xs space-y-3">
                          <Loader2 className="w-8 h-8 animate-spin text-neon-cyan mx-auto" />
                          <p className="text-sm text-slate-300 font-medium">Processing high-resolution asset...</p>
                          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-neon-cyan transition-all duration-100" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      ) : previewUrl ? (
                        <div className="relative group">
                          <img src={previewUrl} alt="NFT Asset Preview" className="w-44 h-44 object-cover rounded-xl mx-auto shadow-2xl border border-white/10" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                            <p className="text-xs text-neon-cyan font-medium tracking-wider uppercase">Replace Master File</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="w-14 h-14 mx-auto rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                            <Upload className="w-6 h-6 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-200 font-medium">Drag & drop asset file or <span className="text-neon-cyan">browse</span></p>
                            <p className="text-xs text-slate-400 mt-2 font-medium tracking-wide">Supported: PNG, JPG, GIF (Max 100MB)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">Asset Metadata</h2>
                      <p className="text-sm text-slate-400">Configure immutable attributes written directly to the ledger structure.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                          NFT Name <span className="text-neon-purple">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={32}
                            value={nftName}
                            onChange={(e) => setNftName(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                            placeholder="e.g. Crypto Nomad"
                          />
                          <span className="absolute right-3 bottom-3 text-[10px] text-slate-500 font-mono">
                            {nftName.length}/32
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                          Symbol <span className="text-neon-purple">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          value={symbol}
                          onChange={(e) => setSymbol(e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-cyan/50 uppercase"
                          placeholder="NOMAD"
                        />
                      </div>
                    </div>


                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-cyan/50 resize-none"
                        placeholder="Provide contextual project background..."
                      />
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">Final Authorization</h2>
                      <p className="text-sm text-slate-400">Review final transaction state variables before execution.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex gap-4 items-center">
                      <img src={previewUrl || ''} className="w-16 h-16 object-cover rounded-lg border border-white/10" alt="Final confirmation asset" />
                      <div>
                        <h4 className="font-bold text-white text-base flex items-center gap-2">
                          {nftName} <span className="text-xs font-mono text-neon-cyan bg-neon-cyan/10 px-2 py-0.5 rounded border border-neon-cyan/20">{symbol.toUpperCase()}</span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{description || 'No description designated.'}</p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                        <span>Target Infrastructure</span>
                        <span className="text-slate-200">Solana Metaplex (Token Metadata Program)</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                        <span>Estimated Network Surcharges</span>
                        <span className="text-emerald-400 font-mono">≈ 0.0022 SOL</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                        <span>Maximum Supply Constraint</span>
                        <span className="text-slate-200 font-mono">1 (Strict Non-Fungible Edition)</span>
                      </div>
                    </div>

                    <div className="pt-4 relative group">
                      {validationReason && (
                        <div className="absolute top-[-35px] left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 px-3 py-1 rounded text-[11px] text-neon-purple font-medium pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                          {validationReason}
                        </div>
                      )}
                      <button
                        onClick={handleMint}
                        disabled={!!validationReason || isLoading}
                        className="w-full relative flex items-center justify-center gap-3 py-4 px-8 rounded-xl font-bold uppercase text-sm tracking-widest text-white shadow-[0_4px_20px_rgba(147,51,234,0.25)] transition-all transform enabled:hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-neon-purple to-neon-cyan" />
                        <div className="relative flex items-center gap-2">
                          {isLoading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Executing Ledger Deployment...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Sign & Execute Mint</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <button
                    onClick={() => setCurrentStep((prev) => (prev > 1 ? (prev - 1) as 1 | 2 | 3 : prev))}
                    disabled={currentStep === 1 || isLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors disabled:opacity-20 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>

                  {currentStep < 3 ? (
                    <button
                      onClick={() => setCurrentStep((prev) => (prev < 3 ? (prev + 1) as 1 | 2 | 3 : prev))}
                      disabled={!!validationReason}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continue <ChevronRight className="w-4 h-4 text-neon-cyan" />
                    </button>
                  ) : null}
                </div>

              </div>
            ) : (
              
              <div className="p-4 space-y-6 text-center animate-fade-in-up">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-wide">Token minted Successfully!</h3>
                  <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
                    Your non-fungible configuration block has successfully verified and anchored to the Solana ledger.
                  </p>
                </div>

                <div className="bg-black/30 border border-white/5 p-4 rounded-xl space-y-3 text-left">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Asset Identity</span>
                    <span className="text-white font-bold">{nftName} ({symbol.toUpperCase()})</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium items-center">
                    <span className="text-slate-400">Ledger Signatures</span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {txSignature ? `${txSignature.slice(0, 8)}...${txSignature.slice(-8)}` : ''}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <a
                    href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-black text-white py-3.5 rounded-xl font-bold text-sm tracking-wider hover:bg-slate-800 transition-all shadow-lg"
                  >
                    View Explorer Registry
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    onClick={resetForm}
                    className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                  >
                    Mint another Token
                  </button>
                </div>
              </div>
            )}
          </div>

        
        </div>
      </main>
    </div>
  );
}

export default App;