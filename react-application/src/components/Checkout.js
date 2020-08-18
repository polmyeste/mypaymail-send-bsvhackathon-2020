import React, { useEffect, useState, useCallback } from 'react';

import {
  Row, Col
} from 'reactstrap';

import { DateTime } from 'luxon';

import { Script } from 'bsv';

import Loading from './Loading';

import MoneyButton from '@moneybutton/react-money-button'

import ApiClient from '../libs/api-client';

import config from '../config';
import Payment from '../libs/payment';

const Checkout = (props) => {
  const {
    senderEmail,
    recipientEmail,
    wallet,
    currency,
    amount,
    expirationDate: expirationDateIso,
    onPaymentSent,
    onError
  } = props;

  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);

  const createEmailPayment = useCallback(
    async () => {
      const apiClient = new ApiClient(config.myPaymailApiClient);

      setLoading(true);

      return apiClient.payments.email.create(
        senderEmail,
        recipientEmail,
        wallet.encryptedPrivateKey,
        wallet.publicKey,
        currency,
        amount,
        expirationDateIso
      )
        .then((response) => {
          const outputs = response.payment.outputs.map((output) => {
            return {
              script: Script.fromString(output.script).toASM(),
              amount: (output.satoshis / 1e8).toFixed(8),
              currency: 'BSV'
            };
          });

          let expirationDate = undefined;

          if (expirationDateIso !== undefined) {
            expirationDate = DateTime.fromISO(expirationDateIso);
          }

          const _payment = new Payment({
            uuid: response.payment.uuid,
            outputs,
            senderEmail,
            expirationDate
          });

          _payment.saveToLocalStorage();

          setPayment(_payment);
        })
        .catch((error) => {
          onError('An unexpected error ocurred. Please try again.');
        })
        .finally(() => {
          setLoading(false);
        });
    }, [senderEmail, recipientEmail, wallet, currency, amount, expirationDateIso, onError]
  );

  const confirmPayment = (rawTx) => {
    const apiClient = new ApiClient(config.myPaymailApiClient);

    setLoading(true);

    return apiClient.payments.confirm(payment.uuid, rawTx)
      .then(() => {
        payment.completed();

        payment.saveToLocalStorage(payment);

        onPaymentSent(payment, rawTx);
      })
      .catch((error) => {
        onError('An unexpected error ocurred while sending the transaction, please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const _onPayment = (payment) => {
    const rawTx = payment.rawtx;

    confirmPayment(rawTx);
  }

  const _onError = (error) => {
    onError('There is a problem with your wallet. Please check if you have enough funds.');
  }

  useEffect(() => {
    createEmailPayment();
  }, [createEmailPayment]);

  if (loading) {
    return (
      <div className="mt-3">
        <Loading bgcolor="#fff" opacity={1} />
      </div>
    );
  }

  return (
    <Row className="d-flex text-center justify-content-center mt-4">
      <Col className="text-center justify-content-center col-4 moneybutton">
        <MoneyButton
          successMessage='Payment sent'
          label={'Pay'}
          type={'buy'}
          clientIdentifier={config.moneyButton.clientId}
          outputs={payment.outputs}
          onPayment={_onPayment}
          onError={_onError}
        />
      </Col>
    </Row>
  )
}

export default Checkout;