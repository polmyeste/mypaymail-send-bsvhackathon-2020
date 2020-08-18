import store from 'store';

class ReclaimSession {
  constructor (utxoUuid, args) {
    this.utxoUuid = utxoUuid;

    if (args !== undefined) {
      this.state = args.state;
      this.reclaimRawTx = args.reclaimRawTx;
    }

    if (this.state === undefined) {
      this.state = 'STARTED';
    }
  }

  hasReclaimTxBeenBroadcasted() {
    const result = (this.state === 'RECLAIM_TX_BROADCASTED');

    if (result) {
      if (this.reclaimRawTx === undefined) {
        throw new Error('Inconsistent state');
      }
    }

    return result;
  }

  reclaimTxBroadcasted(reclaimRawTx) {
    this.reclaimRawTx = reclaimRawTx;
    this.state = 'RECLAIM_TX_BROADCASTED';
  }

  refundTxBroadcasted() {
    this.state = 'REFUND_TX_BROADCASTED';
  }

  saveToLocalStorage() {
    const storageKey = ReclaimSession.storageKey(this.utxoUuid);

    if (this.state === 'REFUND_TX_BROADCASTED') {
      store.remove(storageKey);
    } else {
      store.set(storageKey, {
        state: this.state,
        reclaimRawTx: this.reclaimRawTx
      });
    }
  }

  static storageKey(utxoUuid) {
    return `SESSION#RECLAIM#${utxoUuid}`;
  }

  static loadFromLocalStorage(utxoUuid) {
    const storedSession = store.get(ReclaimSession.storageKey(utxoUuid));

    if (storedSession === undefined) {
      return null;
    }

    return new ReclaimSession(utxoUuid, {
      state: storedSession.state,
      reclaimRawTx: storedSession.reclaimRawTx
    });
  }
}

export default ReclaimSession;
