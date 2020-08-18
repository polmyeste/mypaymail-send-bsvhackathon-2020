
import store from 'store';
import bsv from 'bsv';
import bip38 from 'bip38';
import wif from 'wif';

import Random from './random';

function encryptPrivateKey(privateKeyWif, randomWords) {
  const decodedPrivateKey = wif.decode(privateKeyWif);

  const password = randomWords.join('');

  const encryptedPrivateKey = bip38.encrypt(
    decodedPrivateKey.privateKey,
    decodedPrivateKey.compressed,
    password
  );

  return encryptedPrivateKey;
}

class Wallet {
  constructor (encryptedPrivateKey, randomWords, publicKey) {
    this.randomWords = randomWords;
    this.encryptedPrivateKey = encryptedPrivateKey;
    this.publicKey = publicKey;
  }

  async decryptPrivateKey() {
    const password = this.randomWords.join('');

    const decryptedKey = bip38.decrypt(this.encryptedPrivateKey, password);

    const privateKeyWif = wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed);

    return bsv.PrivateKey.fromWIF(privateKeyWif);
  }

  saveToLocalStorage() {
    let json = {
      encryptedPrivateKey: this.encryptedPrivateKey,
      randomWords: this.randomWords
    };

    if (this.publicKey !== undefined) {
      json.publicKey = this.publicKey.toString();
    }

    store.set(Wallet.storageKey(), json);
  }

  deleteFromLocalStorage() {
    store.remove(Wallet.storageKey());
  }

  static storageKey() {
    return 'WALLET';
  }

  static fromLocalStorage() {
    const storedWallet = store.get(Wallet.storageKey());

    let wallet;

    if (storedWallet === undefined) {
      const randomWords = Random.getRandomWords(5);
      const privateKey = bsv.PrivateKey.fromRandom();
      const publicKey = privateKey.toPublicKey();

      const encryptedPrivateKey = encryptPrivateKey(privateKey.toWIF(), randomWords);

      wallet = new Wallet(encryptedPrivateKey, randomWords, publicKey);
    } else {
      const {
        encryptedPrivateKey,
        randomWords,
        publicKey: publicKeyString
      } = storedWallet;

      let publicKey = undefined;

      if (publicKeyString !== undefined) {
        publicKey = bsv.PublicKey.fromString(publicKeyString);
      }

      wallet = new Wallet(encryptedPrivateKey, randomWords, publicKey);
    }

    return wallet;
  }
}

export default Wallet;