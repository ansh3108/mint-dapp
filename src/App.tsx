import { useState } from "react";
import { DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES } from "react";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner, percentAmount, createGenericFileFromBrowserFile } from "@metaplex-foundation/umi";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

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

        console.log('Uploading image to Arweave via Irys...')
        const genericFile = await umi.uploader.upload([genericFile]);

        console.log('Uploading metadata....')
        const uri = await umi.uploader.uploadJson({
          name,
          description,
          image: imageUri,
        });

        console.log('Minting....')
        const mint = generateSigner(umi);

        const { signature } = await createNft(umi, {
          mint, 
          name,
          uri,
          sellerFeeBasisPoints: percentAmount(0),
        }).sendAndConfirm(umi);

        alert(`Mint successful!`);
        console.log('Signature: ', signature);
    } catch (error) {
      console.log('Minting failed: ', error);
      alert('Error minting NFT. Check console')
    } finally {
      setIsMinting(false);
    }
  }

}