import { initializeKeypair } from "./initializeKeypair"
import * as web3 from "@solana/web3.js"

import * as token from "@solana/spl-token"

import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  toMetaplexFile,
} from "@metaplex-foundation/js"
import {
  DataV2,
  createCreateMetadataAccountV3Instruction,
  createUpdateMetadataAccountV2Instruction,
} from "@metaplex-foundation/mpl-token-metadata"
import * as fs from "fs"

async function createTokenMetadata(
  connection: web3.Connection,
  metaplex: Metaplex,
  mint: web3.PublicKey,
  user: web3.Keypair,
  name: string,
  symbol: string,
  description: string
) {
  // file to buffer
  const buffer = fs.readFileSync("src/assets/SickSock.png")

  // buffer to metaplex file
  const file = toMetaplexFile(buffer, "SickSock.png")

  // upload image and get image uri
  const imageUri = await metaplex.storage().upload(file)
  console.log("image uri:", imageUri)

  // upload metadata and get metadata uri (off chain metadata)
  const { uri } = await metaplex
    .nfts()
    .uploadMetadata({
      name: name,
      description: description,
      image: imageUri,
    })

  console.log("metadata uri:", uri)

  // get metadata account address
  const metadataPDA = metaplex.nfts().pdas().metadata({ mint })

  // onchain metadata format
  const tokenMetadata = {
    name: name,
    symbol: symbol,
    uri: uri,
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  } as DataV2

  // transaction to create metadata account
  const transaction = new web3.Transaction().add(
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: mint,
        mintAuthority: user.publicKey,   
        payer: user.publicKey,
        updateAuthority: user.publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: tokenMetadata,
          isMutable: true,
          collectionDetails: null,
        }
      }
    )
  )

  // send transaction
  const transactionSignature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [user]
  )

  console.log(
    `Create Metadata Account: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  )
}

// async function createNewMint(
//   connection: web3.Connection,
//   payer: web3.Keypair,
//   mintAuthority: web3.PublicKey,
//   freezeAuthority: web3.PublicKey,
//   decimals: number
// ): Promise<web3.PublicKey> {

//   const tokenMint = await token.createMint(
//     connection,
//     payer,
//     mintAuthority,
//     freezeAuthority,
//     decimals
//   );

//   console.log(`The token mint account address is ${tokenMint}`)
//   console.log(
//     `Token Mint: https://explorer.solana.com/address/${tokenMint}?cluster=devnet`
//   );

//   return tokenMint;
// }

// async function createTokenAccount(
//   connection: web3.Connection,
//   payer: web3.Keypair,
//   mint: web3.PublicKey,
//   owner: web3.PublicKey
// ) {
//   const tokenAccount = await token.getOrCreateAssociatedTokenAccount(
//     connection,
//     payer,
//     mint,
//     owner
//   )

//   console.log(
//     `Token Account: https://explorer.solana.com/address/${tokenAccount.address}?cluster=devnet`
//   )

//   return tokenAccount
// }

// async function mintTokens(
//   connection: web3.Connection,
//   payer: web3.Keypair,
//   mint: web3.PublicKey,
//   destination: web3.PublicKey,
//   authority: web3.Keypair,
//   amount: number
// ) {
//   const mintInfo = await token.getMint(connection, mint)

//   const transactionSignature = await token.mintTo(
//     connection,
//     payer,
//     mint,
//     destination,
//     authority,
//     amount * 10 ** mintInfo.decimals
//   )

//   console.log(
//     `Mint Token Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
//   )
// }

// async function transferTokens(
//   connection: web3.Connection,
//   payer: web3.Keypair,
//   source: web3.PublicKey,
//   destination: web3.PublicKey,
//   owner: web3.PublicKey,
//   amount: number,
//   mint: web3.PublicKey
// ) {
//   const mintInfo = await token.getMint(connection, mint)

//   const transactionSignature = await token.transfer(
//     connection,
//     payer,
//     source,
//     destination,
//     owner,
//     amount * 10 ** mintInfo.decimals
//   )

//   console.log(
//     `Transfer Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
//   )
// }

// async function burnTokens(
//   connection: web3.Connection,
//   payer: web3.Keypair,
//   account: web3.PublicKey,
//   mint: web3.PublicKey,
//   owner: web3.Keypair,
//   amount: number
// ) {

//   const mintInfo = await token.getMint(connection, mint)

//   const transactionSignature = await token.burn(
//     connection,
//     payer,
//     account,
//     mint,
//     owner,
//     amount * 10 ** mintInfo.decimals
//   )

//   console.log(
//     `Burn Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
//   )
// }

async function main() {
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"))
  const user = await initializeKeypair(connection)

  console.log("PublicKey:", user.publicKey.toBase58())

  // MAKE SURE YOU REPLACE THIS ADDRESS WITH YOURS!
  const MINT_ADDRESS = "6wzeJj1i3DoU6LeczxkbkGphimU68VktRQ3cLH6Pt1QD"

  // metaplex setup
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(user))
    .use(
      bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
      })
    )

  // Calling the token 
  await createTokenMetadata(
    connection,
    metaplex,
    new web3.PublicKey(MINT_ADDRESS),
    user,
    "SickSock", // Token name - REPLACE THIS WITH YOURS
    "SOCK",     // Token symbol - REPLACE THIS WITH YOURS
    "Whoever holds this token is invited to my Socks party" // Token description - REPLACE THIS WITH YOURS
  )
}

main()
  .then(() => {
    console.log("Finished successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.log(error)
    process.exit(1)
  })


// The token mint account address is 6wzeJj1i3DoU6LeczxkbkGphimU68VktRQ3cLH6Pt1QD