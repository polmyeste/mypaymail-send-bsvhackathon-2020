import React, { useEffect, useState, Fragment }  from 'react';

import { Row, Col } from 'reactstrap';

import bsv from 'bsv';
import ECIES  from 'bsv/ecies';

import { DateTime } from 'luxon';

import MoneyButton from '@moneybutton/react-money-button'

import Loading from '../components/Loading';
import UserMessage from '../components/UserMessage';
import UnlockingCodeForm from '../components/UnlockingCodeForm';

import Wallet from '../libs/wallet';

import ApiClient, { ApiResponseError } from '../libs/api-client';
import ReclaimSession from '../libs/reclaim-session';

import { useClientData } from '../client-data';

import config from '../config';

class UserError extends Error {
  getMessage() {
    throw new Error('Implement in subclasses');
  }
}

class ReclaimTransactionError extends UserError {
  constructor(statusCode, utxoUuid, reclaimRawTx) {
    super();

    this.statusCode = statusCode;
    this.utxoUuid = utxoUuid;
    this.reclaimRawTx = reclaimRawTx;
  }

  getMessage() {
    let text = '';

    const info = (
      <Fragment>
        <p><strong>UTXO UUID</strong>: <br /> {this.utxoUuid}</p>
        <p><strong>Reclaim transaction</strong>: <br /> {this.reclaimRawTx}</p>
      </Fragment>
    );

    if (this.statusCode >= 400 && this.statusCode < 500) {
      text = (
        <div style={{ 'overflowWrap': 'break-word' }}>
          <p>There is a problem with your transaction. 
          Please contact us and provide us with the following information: </p>
          {info}
        </div>
      );
    } else {
      text = (
        <div style={{ 'overflowWrap': 'break-word' }}>
          <p>An unexpected error occurred, please try again. 
          If the problem persists contact us and provide us with the following information: </p>
          {info}
        </div>
      );
    }

    const message = {
      title: 'Ops! Something went wrong',
      text,
      error: true
    }

    return message;
  }
}

class PaymailRefundTransactionError extends UserError {
  constructor(statusCode, utxoUuid, reclaimRawTx, refundRawTx) {
    super();

    this.statusCode = statusCode;
    this.utxoUuid = utxoUuid;
    this.reclaimRawTx = reclaimRawTx;
    this.refundRawTx = refundRawTx;
  }

  getMessage() {
    let text = '';

    const info = (
      <Fragment>
        <p><strong>UTXO UUID</strong>: <br /> {this.utxoUuid}</p>
        <p><strong>Reclaim transaction</strong>: <br /> {this.reclaimRawTx}</p>
        {this.refundRawTx &&
          <p><strong>Refund transaction</strong>: <br /> {this.refundRawTx}</p>
        }
      </Fragment>
    );

    if (this.statusCode >= 400 && this.statusCode < 500) {
      text = (
        <div style={{ 'overflowWrap': 'break-word' }}>
          <p>There is a problem with your transaction. 
          Please contact us and provide us with the following information: </p>
          {info}
        </div>
      );
    } else {
      text = (
        <div style={{ 'overflowWrap': 'break-word' }}>
          <p>An unexpected error occurred, please try again. 
          If the problem persists contact us and provide us with the following information: </p>
          {info}
        </div>
      );
    }

    const message = {
      title: 'Ops! Something went wrong',
      text,
      error: true
    }

    return message;
  }
}

const buildReclaimTransaction = async (wallet, decryptedData) => {
  const tx = new bsv.Transaction(decryptedData.rawTx);

  const outpoint = {
    script: tx.outputs[decryptedData.outputIndex].script,
    satoshisBN: tx.outputs[decryptedData.outputIndex].satoshisBN
  };

  const reclaimTransaction = new bsv.Transaction(decryptedData.preSignedRawTx);

  const flags = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID;

  const userPrivateKey = await wallet.decryptPrivateKey();

  // The presigned transaction has only one input: the recipient's UTXO
  const inputIndex = 0;

  const signatureUser = bsv.Transaction.Sighash.sign(
    reclaimTransaction, userPrivateKey, flags,
    inputIndex, outpoint.script, outpoint.satoshisBN
  );

  const unlockingScript = new bsv.Script()
    .add(bsv.deps.Buffer.concat([
      signatureUser.toDER(),
      bsv.deps.Buffer.from([(flags) & 0xff])
    ]))
    .add(userPrivateKey.toPublicKey().toBuffer())
    .add(reclaimTransaction.inputs[inputIndex].script)
    .add(bsv.Opcode.OP_2) // Needs to be different than OP_1

  reclaimTransaction.inputs[inputIndex].setScript(unlockingScript);

  return reclaimTransaction;
}

function calculateTxId(rawTx) {
  let buf = bsv.crypto.Hash.sha256(Buffer.from(rawTx.toString(), 'hex'));

  buf = bsv.crypto.Hash.sha256(buf);

  return buf.reverse().toString('hex');
}

const buildRedeemTransaction = async (wallet, utxoToUnlock, outputs) => {
  const redemTransaction = new bsv.Transaction();

  redemTransaction.addInput(new bsv.Transaction.Input(utxoToUnlock));

  for (const output of outputs) {
    const redemLockingScript = new bsv.Script.fromHex(output.script);

    redemTransaction.addOutput(new bsv.Transaction.Output({
      script: redemLockingScript,
      satoshis: output.satoshis
    }));
  }

  const outpoint = {
    script: redemTransaction.inputs[0].output.script,
    satoshisBN: redemTransaction.inputs[0].output.satoshisBN
  };

  const userPrivateKey = await wallet.decryptPrivateKey();

  const flags = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID;
  const redemOutputindex = 0;

  const signatureUser = bsv.Transaction.Sighash.sign(
    redemTransaction, userPrivateKey, flags,
    redemOutputindex, outpoint.script, outpoint.satoshisBN
  );

  const unlockingScript = new bsv.Script()
    .add(bsv.deps.Buffer.concat([
      signatureUser.toDER(),
      bsv.deps.Buffer.from([(flags) & 0xff])
    ]))
    .add(userPrivateKey.toPublicKey().toBuffer())

  redemTransaction.inputs[0].setScript(unlockingScript);

  return redemTransaction;
}

const ReclaimPaymentPage = (props) => {
  const { clientData } = useClientData();

  const [userMessage, setUserMessage] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [words, setWords] = useState(null);
  const [decryptedData, setDecryptedData] = useState(null);
  const [loading, setLoading] = useState(false);

  const transferFundsToMainAccount = async (session, apiClient, paymailHandle, reclaimRawTx) => {
    const { uuid: utxoUuid } = decryptedData;

    const reclaimTransaction = new bsv.Transaction(reclaimRawTx);

    let payment = null;

    try {
      const response = await apiClient.payments.paymail.create(
        paymailHandle, 'satoshis',
        reclaimTransaction.outputs[0].satoshis - 546
      );

      payment = response.payment;
    } catch (error) {
      if (error instanceof ApiResponseError) {
        throw new PaymailRefundTransactionError(
          error.status, utxoUuid, reclaimRawTx
        );
      }

      throw error;
    }

    const utxoToUnlock = {
      output: new bsv.Transaction.Output({
        script: reclaimTransaction.outputs[0].script,
        satoshis: reclaimTransaction.outputs[0].satoshis
      }),
      prevTxId: calculateTxId(reclaimTransaction),
      outputIndex: 0,
      script: bsv.Script.empty()
    };

    const refundTransaction = await buildRedeemTransaction(
      wallet, utxoToUnlock, payment.outputs
    );

    const refundRawTx = refundTransaction.toString();

    try {
      await apiClient.payments.confirm(payment.uuid, refundRawTx);
    } catch (error) {
      if (error instanceof ApiResponseError) {
        throw new PaymailRefundTransactionError(
          error.status, utxoUuid, reclaimRawTx, refundRawTx
        );
      }

      throw error;
    }

    session.refundTxBroadcasted();
  }

  const reclaimPayment = async (session, apiClient) => {
    const { uuid: utxoUuid } = decryptedData;

    const reclaimTransaction = await buildReclaimTransaction(wallet, decryptedData);

    const reclaimRawTx = reclaimTransaction.toString();

    try {
      const { payment } = await apiClient.utxos.spend(
        utxoUuid,
        'SCRIPT',
        reclaimTransaction.outputs[0].script.toHex()
      );

      await apiClient.payments.confirm(
        payment.uuid, reclaimRawTx
      )
    } catch (error) {
      if (error instanceof ApiResponseError) {
        throw new ReclaimTransactionError(
          error.status, utxoUuid, reclaimRawTx
        );
      }

      throw error;
    }

    session.reclaimTxBroadcasted(reclaimRawTx);

    return reclaimRawTx;
  }

  const onCryptoOperations = (cryptoOperations) => {
    async function reclaimAndTransferFunds(paymailHandle) {
      let userMessage = null;

      let session = ReclaimSession.loadFromLocalStorage(decryptedData.uuid);

      if (session === null) {
        session = new ReclaimSession(decryptedData.uuid);
      }

      try {
        const apiClient = new ApiClient(config.myPaymailApiClient);

        let reclaimRawTx = null;

        if (session.hasReclaimTxBeenBroadcasted()) {
          reclaimRawTx = session.reclaimRawTx;
        } else {
          reclaimRawTx = await reclaimPayment(session, apiClient);
        }

        await transferFundsToMainAccount(session, apiClient, paymailHandle, reclaimRawTx);
      } catch (error) {
        if (error instanceof UserError) {
          userMessage = error.getMessage();
        } else {
          throw error;
        }
      } finally {
        session.saveToLocalStorage();

        setLoading(false);
      }

      if (userMessage === null) {
        userMessage = {
          title: 'Payment sent!',
          text: (
            <Fragment>
              <p>A payment has been sent to your wallet.</p>
              <p>Click <a href="/">here</a> if you want to make a new payment.</p>
            </Fragment>
          )
        };
      }

      setUserMessage(userMessage);
    }

    const paymailHandle = cryptoOperations[0].value;

    setLoading(true);

    reclaimAndTransferFunds(paymailHandle);
  }

  useEffect(() => {
    const decryptWallet = async () => {
      const {
        encryptedPrivateKey
      } = clientData;

      const wallet = new Wallet(encryptedPrivateKey, words);

      return wallet.decryptPrivateKey()
        .then((privateKey) => {
          const clearText = new ECIES()
            .privateKey(privateKey)
            .decrypt(bsv.deps.Buffer.from(clientData.data, 'hex'));

          const _decryptedData = JSON.parse(clearText);

          setDecryptedData(_decryptedData);

          const t = new bsv.Transaction(_decryptedData.preSignedRawTx);

          const expirationTime = DateTime.fromISO(t.getLockTime().toISOString());

          const now = DateTime.local();

          if (now < expirationTime) {
            setUserMessage({
              title: 'Not yet...',
              text: `You cannot reclaim this transaction yet. Please try again on ${expirationTime.toLocaleString(DateTime.DATETIME_MED)}.`,
              error: true
            });

            return;
          }

          setWallet(wallet);
        })
        .catch((error) => {
          setUserMessage({
            title: 'Invalid unlocking code',
            text: 'Your payment unlocking code appears to be incorrect.',
            error: true
          });
        })
        .finally(() => {
          setWords(null);

          setLoading(false);
        });
    };

    if (words !== null) {
      setLoading(true);

      if (loading) {
        decryptWallet();
      }
    }
  }, [words, loading, clientData]);

  if (userMessage !== null) {
    return (
      <UserMessage message={userMessage} />
    );
  }

  if (!loading && !wallet) {
    return <UnlockingCodeForm onWordsIntroduced={(words) => setWords(words)} />
  }

  if (loading) {
    return (
      <div className="text-center">
        <Loading bgcolor="#fff" opacity={1} />
      </div>
    );
  }

  return (
    <Fragment>
      <p className="mt-4">Swipe the button below to redeem this payment to your MoneyButton account:</p>
      <Row className="d-flex mt-4">
        <Col className="col-4">
          <MoneyButton
            successMessage='Success!'
            label={'Reclaim payment'}
            clientIdentifier={config.moneyButton.clientId}
            cryptoOperations={[
              {
                name: 'myPaymail',
                method: 'paymail'
              }
            ]}
            onCryptoOperations={onCryptoOperations}
          />
        </Col>
      </Row>
    </Fragment>
  );
}

export default ReclaimPaymentPage;
