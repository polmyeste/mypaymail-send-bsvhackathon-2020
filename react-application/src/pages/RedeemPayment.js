import React, { useEffect, useState, Fragment }  from 'react';

import { Row, Col } from 'reactstrap';

import { DateTime } from 'luxon';

import bsv from 'bsv';
import ECIES  from 'bsv/ecies';

import MoneyButton from '@moneybutton/react-money-button'

import Loading from '../components/Loading';
import UserMessage from '../components/UserMessage';
import UnlockingCodeForm from '../components/UnlockingCodeForm';

import Wallet from '../libs/wallet';

import ApiClient, { ApiResponseError } from '../libs/api-client';

import { useClientData } from '../client-data';

import config from '../config';

class UserError extends Error {
  getMessage() {
    throw new Error('Implement in subclasses');
  }
}

class RedeemTransactionError extends UserError {
  constructor(statusCode, utxoUuid, redeemRawTx) {
    super();

    this.statusCode = statusCode;
    this.utxoUuid = utxoUuid;
    this.redeemRawTx = redeemRawTx;
  }

  getMessage() {
    let text = '';

    const info = (
      <Fragment>
        <p><strong>UTXO UUID</strong>: <br /> {this.utxoUuid}</p>
        {this.redeemRawTx &&
          <p><strong>Reclaim transaction</strong>: <br /> {this.redeemRawTx}</p>
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

function findUtxo(txid, transaction, outputIndex) {
  const output = transaction.outputs[outputIndex];

  return {
    output: new bsv.Transaction.Output({
      script: output.script,
      satoshis: output.satoshis
    }),
    prevTxId: txid,
    outputIndex: outputIndex,
    script: bsv.Script.empty()
  };
}

const buildRedeemTransaction = async (redeemCode, wallet, utxoToUnlock, outputs) => {
  const redeemTransaction = new bsv.Transaction();

  redeemTransaction.addInput(new bsv.Transaction.Input(utxoToUnlock));

  for (const output of outputs) {
    const redemLockingScript = new bsv.Script.fromHex(output.script);

    redeemTransaction.addOutput(new bsv.Transaction.Output({
      script: redemLockingScript,
      satoshis: output.satoshis
    }));
  }

  const inputIndex = 0;

  const outpoint = {
    script: redeemTransaction.inputs[inputIndex].output.script,
    satoshisBN: redeemTransaction.inputs[inputIndex].output.satoshisBN
  };

  const userPrivateKey = await wallet.decryptPrivateKey();

  const flags = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID;

  const signatureUser = bsv.Transaction.Sighash.sign(
    redeemTransaction, userPrivateKey, flags,
    inputIndex, outpoint.script, outpoint.satoshisBN
  );

  const unlockingScript = new bsv.Script()
    .add(bsv.deps.Buffer.concat([
      signatureUser.toDER(),
      bsv.deps.Buffer.from([(flags) & 0xff])
    ]))
    .add(userPrivateKey.toPublicKey().toBuffer())
    .add(bsv.deps.Buffer.from(redeemCode, 'hex'))
    .add(bsv.Opcode.OP_1)

  redeemTransaction.inputs[0].setScript(unlockingScript);

  return redeemTransaction;
}

const RedeemPaymentPage = (props) => {
  const { clientData } = useClientData();

  const [userMessage, setUserMessage] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [words, setWords] = useState(null);
  const [decryptedData, setDecryptedData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const decryptWallet = async () => {
      const wallet = new Wallet(clientData.encryptedPrivateKey, words);
  
      return wallet.decryptPrivateKey()
        .then((privateKey) => {
          const clearText = new ECIES()
            .privateKey(privateKey)
            .decrypt(bsv.deps.Buffer.from(clientData.data, 'hex'));

          setDecryptedData(JSON.parse(clearText));
          setWallet(wallet);
        })
        .catch((error) => {
          setUserMessage({
            title: 'Invalid unlocking code',
            text: 'Please refresh the page and re-enter your unlocking code.',
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

  async function redeemTransaction(paymailHandle) {
    const { uuid: utxoUuid, txid, rawTx, outputIndex } = decryptedData;

    const transaction = new bsv.Transaction(rawTx);

    const utxoToUnlock = findUtxo(txid, transaction, outputIndex);

    if (!utxoToUnlock) {
      throw new Error ('Expected UTXO not found!');
    }

    const apiClient = new ApiClient(config.myPaymailApiClient);

    let payment = null;

    try {
      const response= await apiClient.utxos.spend(utxoUuid, 'PAYMAIL', paymailHandle);

      payment = response.payment;
    } catch (error) {
      if (error instanceof ApiResponseError) {
        throw new RedeemTransactionError(error.status, utxoUuid);
      }

      throw error;
    }

    const redeemTx = await buildRedeemTransaction(decryptedData.redeemCode, wallet, utxoToUnlock, payment.outputs);

    const redeemRawTx = redeemTx.toString();

    try {
      await apiClient.payments.confirm(payment.uuid, redeemRawTx);
    } catch (error) {
      if (error instanceof ApiResponseError) {
        throw new RedeemTransactionError(error.status, utxoUuid, redeemRawTx);
      }

      throw error;
    }
  }

  const onCryptoOperations = (cryptoOperations) => {
    async function _redeemTransaction() {
      let userMessage = null;

      try {
        await redeemTransaction(paymailHandle);
      } catch (error) {
        if (error instanceof UserError) {
          userMessage = error.getMessage();
        } else {
          throw error;
        }
      } finally {
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

    _redeemTransaction(paymailHandle);
  }

  if (userMessage !== null) {
    return (
      <UserMessage message={userMessage} />
    );
  }

  if (!loading && !wallet && !decryptedData) {
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
      <div className="alert alert-success">
        <h4 className="text-center alert-heading p-0 m-0">Your unlocking code is correct</h4>
      </div>
      <p className="mt-4">You've received a payment of <strong>{decryptedData.amount} {decryptedData.currency}</strong>, calculated using the following exchange rate: <strong>1 BSV = {decryptedData.bsvPrice} {decryptedData.currency}</strong>.&nbsp;
      {decryptedData.expirationDate &&
        <span>Your payment must be redeemed before <strong>{(new Date(decryptedData.expirationDate)).toLocaleString(DateTime.DATETIME_MED)}</strong>.</span>
      }
      </p>
      <Row className="d-flex mt-4">
        <Col className="col-4">
          <MoneyButton
            successMessage='Success!'
            label={'Redeem payment'}
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

export default RedeemPaymentPage;
